#import "browserTabTracking.h"
#import "browserTabUtils.h"
#import "permissionManager.h"

// Custom Log Macro
#define MyLog(format, ...) fprintf(stderr, "%s\n", [[NSString stringWithFormat:format, ##__VA_ARGS__] UTF8String])

@implementation BrowserTabTracking

- (id)init {
    self = [super init];
    if (self) {
        _lastKnownBrowserURL = nil;
        _lastKnownBrowserTitle = nil;
        _isBrowserActive = NO;
        _browserTabCheckTimer = nil;
        _browserName = nil;
    }
    return self;
}

- (void)dealloc {
    [self stopBrowserTabTimer];
    [_lastKnownBrowserURL release];
    [_lastKnownBrowserTitle release];
    [_browserName release];
    [super dealloc];
}

- (NSDictionary*)getCurrentBrowserTabBriefInfo {
    if (!self.browserName) {
        MyLog(@"[Browser Tab Brief] ⚠️ Browser name not set, cannot get tab info.");
        return nil;
    }

    if (![PermissionManager shouldRequestPermissions]) {
        MyLog(@"[Browser Tab Brief] ⚠️  Permission requests disabled - skipping tab tracking during onboarding");
        return nil;
    }
    
    NSString *scriptSource = [NSString stringWithFormat:@"tell application \"%@\"\n"
                           "  try\n"
                           "    set tabTitle to title of active tab of front window\n"
                           "    set tabUrl to URL of active tab of front window\n"
                           "    return tabUrl & \"|\" & tabTitle\n"
                           "  on error errMsg\n"
                           "    return \"ERROR|\" & errMsg\n"
                           "  end try\n"
                           "end tell", self.browserName];
    NSAppleScript *appleScript = [[NSAppleScript alloc] initWithSource:scriptSource];
    NSDictionary *errorInfo = nil;
    NSAppleEventDescriptor *descriptor = [appleScript executeAndReturnError:&errorInfo];
    [appleScript release];

    if (errorInfo) {
        MyLog(@"[Browser Tab Brief] AppleScript execution error for %@: %@", self.browserName, errorInfo);
        
        // If this is the first time accessing Chrome and permissions aren't granted,
        // request Apple Events permission through our centralized system
        if ([PermissionManager shouldRequestPermissions]) {
            MyLog(@"[Browser Tab Brief] 🔑 Requesting Apple Events permission for %@ tab tracking", self.browserName);
            [PermissionManager requestPermission:PermissionTypeAppleEvents completion:^(PermissionStatus status) {
                MyLog(@"[Browser Tab Brief] 📋 Apple Events permission request completed with status: %ld", (long)status);
            }];
        }
        
        return nil;
    }

    NSString *resultString = [descriptor stringValue];
    if (!resultString || [resultString hasPrefix:@"ERROR|"]) {
        if (resultString && ![resultString isEqualToString:@"ERROR|No window"]) {
             MyLog(@"[Browser Tab Brief] AppleScript reported error for %@: %@", self.browserName, resultString);
        }
        return nil;
    }
    
    NSArray *components = [resultString componentsSeparatedByString:@"|"];
    if (components.count >= 1) {
        NSString *url = components[0];
        NSString *title = (components.count > 1) ? components[1] : @"";
        return @{@"url": url, @"title": title};
    }
    
    MyLog(@"[Browser Tab Brief] Invalid components from AppleScript for %@: %@", self.browserName, resultString);
    return nil;
}

- (void)startBrowserTabTimer {
    if (_browserTabCheckTimer) {
        [_browserTabCheckTimer invalidate];
        [_browserTabCheckTimer release];
        _browserTabCheckTimer = nil;
    }
    _browserTabCheckTimer = [[NSTimer scheduledTimerWithTimeInterval:10.0
                                                                target:self
                                                              selector:@selector(performBrowserTabCheck)
                                                              userInfo:nil
                                                               repeats:YES] retain];
    [[NSRunLoop currentRunLoop] addTimer:_browserTabCheckTimer forMode:NSRunLoopCommonModes];
    MyLog(@"[Browser Tab] ▶️ %@ tab check timer started.", self.browserName);
}

- (void)stopBrowserTabTimer {
    if (_browserTabCheckTimer) {
        [_browserTabCheckTimer invalidate];
        [_browserTabCheckTimer release];
        _browserTabCheckTimer = nil;
        MyLog(@"[Browser Tab] ⏹️ %@ tab check timer stopped.", self.browserName);
    }
}

- (void)performBrowserTabCheck {
    if (!_isBrowserActive) {
        return;
    }

    NSDictionary *briefTabInfo = [self getCurrentBrowserTabBriefInfo];
    if (!briefTabInfo) {
        // Only log on first failure to avoid spam
        static BOOL hasLoggedFailure = NO;
        if (!hasLoggedFailure) {
            MyLog(@"[Browser Tab] ⚠️ Failed to get tab info for %@", self.browserName);
            hasLoggedFailure = YES;
        }
        return;
    }

    NSString *currentURL = briefTabInfo[@"url"];
    NSString *currentTitle = briefTabInfo[@"title"];

    BOOL urlChanged = (_lastKnownBrowserURL || currentURL) && ![_lastKnownBrowserURL isEqualToString:currentURL];
    BOOL titleChanged = (_lastKnownBrowserTitle || currentTitle) && ![_lastKnownBrowserTitle isEqualToString:currentTitle];

    if (!urlChanged && !titleChanged) {
        return; // No change, nothing to do
    }

    MyLog(@"[Browser Tab] 🔄 %@ tab switch: %@ -> %@", self.browserName, _lastKnownBrowserURL, currentURL);

    // Update stored values
    NSString *newURL = [currentURL copy];
    [_lastKnownBrowserURL release];
    _lastKnownBrowserURL = newURL;

    NSString *newTitle = [currentTitle copy];
    [_lastKnownBrowserTitle release];
    _lastKnownBrowserTitle = newTitle;

    // Get full tab details and notify delegate
    NSDictionary *activeWindowDetails = nil;
    if ([self.browserName isEqualToString:@"Google Chrome"]) {
        activeWindowDetails = [BrowserTabUtils getChromeTabInfo];
    } else if ([self.browserName isEqualToString:@"Arc"]) {
        activeWindowDetails = [BrowserTabUtils getArcTabInfo];
    }

    if (activeWindowDetails && self.delegate && [self.delegate respondsToSelector:@selector(browserTabDidSwitch:)]) {
        [self.delegate browserTabDidSwitch:activeWindowDetails];
    } else if (!activeWindowDetails) {
        MyLog(@"[Browser Tab] ⚠️ Could not get tab details for %@", self.browserName);
    }
}

@end 