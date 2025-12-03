#import "browserTabTracking.h"
#import "browserTabUtils.h"
#import "permissionManager.h"
#import <CoreGraphics/CoreGraphics.h>

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

// Get browser window title using CGWindowList - NO PERMISSIONS NEEDED
- (NSString*)getBrowserWindowTitle {
    if (!self.browserName) {
        return nil;
    }

    CFArrayRef windowList = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID);
    if (!windowList) {
        return nil;
    }

    NSArray *windows = (__bridge NSArray *)windowList;
    NSString *foundTitle = nil;

    for (NSDictionary *window in windows) {
        NSNumber *windowLayer = window[(id)kCGWindowLayer];
        if ([windowLayer intValue] == 0) {
            NSString *ownerName = window[(id)kCGWindowOwnerName];
            if ([ownerName isEqualToString:self.browserName]) {
                // IMPORTANT: Copy the title before releasing windowList
                NSString *title = window[(id)kCGWindowName];
                if (title) {
                    foundTitle = [[title copy] autorelease];
                }
                break;
            }
        }
    }

    CFRelease(windowList);
    return foundTitle;
}

- (NSDictionary*)getCurrentBrowserTabBriefInfo {
    if (!self.browserName) {
        return nil;
    }

    // Try AppleScript first for full info (URL + title) - only if permissions enabled
    if ([PermissionManager shouldRequestPermissions]) {
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

        if (!errorInfo) {
            NSString *resultString = [descriptor stringValue];
            if (resultString && ![resultString hasPrefix:@"ERROR|"]) {
                NSArray *components = [resultString componentsSeparatedByString:@"|"];
                if (components.count >= 1) {
                    NSString *url = components[0];
                    NSString *title = (components.count > 1) ? components[1] : @"";
                    return @{@"url": url, @"title": title};
                }
            }
        }
        // AppleScript failed - fall through to CGWindowList
    }

    // ALWAYS try CGWindowList fallback (NO PERMISSION NEEDED)
    // This works even without Apple Events permission
    NSString *windowTitle = [self getBrowserWindowTitle];
    if (windowTitle && windowTitle.length > 0) {
        return @{@"title": windowTitle, @"url": @""};
    }

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
        return;
    }

    NSString *currentURL = briefTabInfo[@"url"];
    NSString *currentTitle = briefTabInfo[@"title"];

    // Check for changes - for URL, only compare if we have one
    BOOL urlChanged = NO;
    if (currentURL && currentURL.length > 0) {
        urlChanged = ![_lastKnownBrowserURL isEqualToString:currentURL];
    }

    BOOL titleChanged = (currentTitle && currentTitle.length > 0) &&
                        ![_lastKnownBrowserTitle isEqualToString:currentTitle];

    if (!urlChanged && !titleChanged) {
        return; // No change, nothing to do
    }

    MyLog(@"[Browser Tab] 🔄 %@ tab switch detected - Title: '%@' -> '%@'",
          self.browserName, _lastKnownBrowserTitle, currentTitle);

    // Update stored values
    if (currentURL && currentURL.length > 0) {
        NSString *newURL = [currentURL copy];
        [_lastKnownBrowserURL release];
        _lastKnownBrowserURL = newURL;
    }

    NSString *newTitle = [currentTitle copy];
    [_lastKnownBrowserTitle release];
    _lastKnownBrowserTitle = newTitle;

    // Try to get full tab details via AppleScript
    NSDictionary *activeWindowDetails = nil;
    if ([self.browserName isEqualToString:@"Google Chrome"]) {
        activeWindowDetails = [BrowserTabUtils getChromeTabInfo];
    } else if ([self.browserName isEqualToString:@"Arc"]) {
        activeWindowDetails = [BrowserTabUtils getArcTabInfo];
    }

    // If AppleScript failed, create minimal info from what we have
    if (!activeWindowDetails) {
        activeWindowDetails = @{
            @"ownerName": self.browserName,
            @"title": currentTitle ?: @"",
            @"url": currentURL ?: @"",
            @"type": @"browser",
            @"browser": [self.browserName isEqualToString:@"Arc"] ? @"arc" : @"chrome",
            @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
        };
        MyLog(@"[Browser Tab] Using fallback tab info (no AppleScript permission)");
    }

    if (self.delegate && [self.delegate respondsToSelector:@selector(browserTabDidSwitch:)]) {
        [self.delegate browserTabDidSwitch:activeWindowDetails];
    }
}

@end 