#import "browserTabUtils.h"
#import "permissionManager.h"
#import <os/log.h>

// Custom Log Macro
#define MyLog(format, ...) { \
    static os_log_t log_handle = NULL; \
    if (log_handle == NULL) { \
        log_handle = os_log_create("com.cronus.app", "BrowserTabUtils"); \
    } \
    NSString *log_message = [NSString stringWithFormat:format, ##__VA_ARGS__]; \
    os_log(log_handle, "%{public}s", [log_message UTF8String]); \
}

@implementation BrowserTabUtils

+ (NSDictionary*)getChromeTabInfo {
    MyLog(@"Starting Chrome tab info gathering...");
    
    // Check if permission requests are enabled before proceeding
    if (![PermissionManager shouldRequestPermissions]) {
        MyLog(@"⚠️  Permission requests disabled - skipping Chrome tab info gathering during onboarding");
        return nil;
    }
    
    // First check if Chrome is running
    NSRunningApplication *chromeApp = [[NSRunningApplication runningApplicationsWithBundleIdentifier:@"com.google.Chrome"] firstObject];
    if (!chromeApp) {
        MyLog(@"Chrome is not running");
        return nil;
    }
    
    // Check if Chrome is frontmost
    // if (![chromeApp isActive]) {
    //     MyLog(@"Chrome is not the active application");
    //     return nil;
    // }
    
    // First try to get just the URL and title without JavaScript
    NSString *basicScript = @"tell application \"Google Chrome\"\n"
                           "  try\n"
                           "    set activeTab to active tab of front window\n"
                           "    set tabUrl to URL of activeTab\n"
                           "    set tabTitle to title of activeTab\n"
                           "    return tabUrl & \"|\" & tabTitle\n"
                           "  on error errMsg\n"
                           "    return \"ERROR|\" & errMsg\n"
                           "  end try\n"
                           "end tell";
    
    NSAppleScript *basicAppleScript = [[NSAppleScript alloc] initWithSource:basicScript];
    NSDictionary *error = nil;
    NSAppleEventDescriptor *basicResult = [basicAppleScript executeAndReturnError:&error];
    
    if (error) {
        MyLog(@"Basic AppleScript error: %@", error);
        [basicAppleScript release];
        
        // If this is the first time accessing Chrome and permissions aren't granted,
        // request Apple Events permission through our centralized system
        if ([PermissionManager shouldRequestPermissions]) {
            MyLog(@"🔑 Requesting Apple Events permission for Chrome access");
            [PermissionManager requestPermission:PermissionTypeAppleEvents completion:^(PermissionStatus status) {
                MyLog(@"📋 Apple Events permission request completed with status: %ld", (long)status);
            }];
        }
        
        return nil;
    }
    
    NSString *basicInfo = [basicResult stringValue];
    if (!basicInfo || [basicInfo hasPrefix:@"ERROR|"]) {
        MyLog(@"Basic script error or no result: %@", basicInfo);
        [basicAppleScript release];
        return nil;
    }
    
    NSArray *basicComponents = [basicInfo componentsSeparatedByString:@"|"];
    if (basicComponents.count < 2) {
        MyLog(@"Invalid basic info components");
        [basicAppleScript release];
        return nil;
    }
    
    [basicAppleScript release];

    // Create base info with URL and title
    NSMutableDictionary *tabInfo = [@{
        @"url": basicComponents[0],
        @"title": basicComponents[1],
        @"type": @"browser",
        @"browser": @"chrome",
        @"ownerName": @"Google Chrome",
        @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
    } mutableCopy];
    
    // Try to get content with JavaScript if possible
    // TODO: could try to only get the currently visible content
    NSString *jsScript = @"tell application \"Google Chrome\"\n"
                        "  try\n"
                        "    set activeTab to active tab of front window\n"
                        "    set tabContent to execute activeTab javascript \"document.body.innerText\"\n"
                        "    return tabContent\n"
                        "  on error errMsg\n"
                        "    if errMsg contains \"JavaScript\" then\n"
                        "      return \"JS_DISABLED\"\n"
                        "    end if\n"
                        "    return \"ERROR|\" & errMsg\n"
                        "  end try\n"
                        "end tell";
    
    NSAppleScript *jsAppleScript = [[NSAppleScript alloc] initWithSource:jsScript];
    NSAppleEventDescriptor *jsResult = [jsAppleScript executeAndReturnError:&error];
    
    if (!error && jsResult) {
        NSString *jsInfo = [jsResult stringValue];
        if (jsInfo && ![jsInfo hasPrefix:@"ERROR|"]) {
            if ([jsInfo isEqualToString:@"JS_DISABLED"]) {
                MyLog(@"JavaScript is disabled in Chrome. Please enable it in View > Developer > Allow JavaScript from Apple Events");
            } else {
                tabInfo[@"content"] = jsInfo;
                MyLog(@"🎯 CHROME CONTENT CAPTURED:");
                MyLog(@"   App: %@", tabInfo[@"url"]);
                MyLog(@"   Title: %@", tabInfo[@"title"]);
                MyLog(@"   Content Length: %lu characters", (unsigned long)[jsInfo length]);
                MyLog(@"   Content Preview (first 200 chars): %@", [jsInfo length] > 200 ? [jsInfo substringToIndex:200] : jsInfo);
            }
        }
    } else if (error) {
        MyLog(@"JS AppleScript error: %@", error);
    }
    
    [jsAppleScript release];

    return tabInfo;
}

+ (NSDictionary*)getSafariTabInfo {
    // Check if permission requests are enabled before proceeding
    if (![PermissionManager shouldRequestPermissions]) {
        MyLog(@"⚠️  Permission requests disabled - skipping Safari tab info gathering during onboarding");
        return nil;
    }
    
    NSMutableDictionary *tabInfo = [NSMutableDictionary dictionary];
    
    // First try to get just the URL and title
    NSString *basicScript = @"tell application \"Safari\"\n"
                            "  try\n"
                            "    set currentTab to current tab of front window\n"
                            "    set tabUrl to URL of currentTab\n"
                            "    set tabTitle to name of currentTab\n"
                            "    return tabUrl & \"|\" & tabTitle\n"
                            "  on error errMsg\n"
                            "    return \"ERROR|\" & errMsg\n"
                            "  end try\n"
                            "end tell";
    
    NSAppleScript *basicAppleScript = [[NSAppleScript alloc] initWithSource:basicScript];
    NSDictionary *error = nil;
    NSAppleEventDescriptor *basicResult = [basicAppleScript executeAndReturnError:&error];
    
    if (error) {
        MyLog(@"Safari basic AppleScript error: %@", error);
        [basicAppleScript release];
        
        // If this is the first time accessing Safari and permissions aren't granted,
        // request Apple Events permission through our centralized system
        if ([PermissionManager shouldRequestPermissions]) {
            MyLog(@"🔑 Requesting Apple Events permission for Safari access");
            [PermissionManager requestPermission:PermissionTypeAppleEvents completion:^(PermissionStatus status) {
                MyLog(@"📋 Apple Events permission request completed with status: %ld", (long)status);
            }];
        }
        
        return nil;
    }
    
    if (basicResult) {
        NSString *basicInfo = [basicResult stringValue];
        if (basicInfo && ![basicInfo hasPrefix:@"ERROR|"]) {
            NSArray *components = [basicInfo componentsSeparatedByString:@"|"];
            if (components.count >= 2) {
                tabInfo[@"url"] = components[0];
                tabInfo[@"title"] = components[1];
                tabInfo[@"type"] = @"browser";
                tabInfo[@"ownerName"] = @"Safari";
                
                [basicAppleScript release];

                // Now try to get the content
                NSString *contentScript = @"tell application \"Safari\"\n"
                                        "  try\n"
                                        "    set currentTab to current tab of front window\n"
                                        "    set tabContent to do JavaScript \"document.body.innerText\" in currentTab\n"
                                        "    return tabContent\n"
                                        "  on error errMsg\n"
                                        "    if errMsg contains \"JavaScript\" then\n"
                                        "      return \"JS_DISABLED\"\n"
                                        "    end if\n"
                                        "    return \"ERROR|\" & errMsg\n"
                                        "  end try\n"
                                        "end tell";
                
                NSAppleScript *contentAppleScript = [[NSAppleScript alloc] initWithSource:contentScript];
                NSAppleEventDescriptor *contentResult = [contentAppleScript executeAndReturnError:&error];
                
                if (error) {
                    MyLog(@"Safari content AppleScript error: %@", error);
                } else if (contentResult) {
                    NSString *content = [contentResult stringValue];
                    if (content && ![content hasPrefix:@"ERROR|"]) {
                        if ([content isEqualToString:@"JS_DISABLED"]) {
                            MyLog(@"JavaScript is disabled in Safari. Please enable it in Safari > Settings > Advanced > Allow JavaScript from Apple Events");
                        } else {
                            tabInfo[@"content"] = content;
                            MyLog(@"Successfully got Safari content, length: %lu", (unsigned long)[content length]);
                            MyLog(@"🎯 SAFARI CONTENT CAPTURED:");
                            MyLog(@"   URL: %@", tabInfo[@"url"]);
                            MyLog(@"   Title: %@", tabInfo[@"title"]);
                            MyLog(@"   Content Length: %lu characters", (unsigned long)[content length]);
                            MyLog(@"   Content Preview (first 200 chars): %@", [content length] > 200 ? [content substringToIndex:200] : content);
                        }
                    }
                }
                [contentAppleScript release];
                
                tabInfo[@"browser"] = @"safari";
                return tabInfo;
            }
        }
    }
    
    [basicAppleScript release];

    if (error) {
        MyLog(@"Safari AppleScript error: %@", error);
    }
    
    return nil;
}

+ (NSDictionary*)getArcTabInfo {
    // Check if permission requests are enabled before proceeding
    if (![PermissionManager shouldRequestPermissions]) {
        MyLog(@"⚠️  Permission requests disabled - skipping Arc tab info gathering during onboarding");
        return nil;
    }
    
    // First try to get just the URL and title without JavaScript
    NSString *basicScript = @"tell application \"Arc\"\n"
                           "  try\n"
                           "    set tabTitle to title of active tab of front window\n"
                           "    set tabUrl to URL of active tab of front window\n"
                           "    return tabUrl & \"|\" & tabTitle\n"
                           "  on error errMsg\n"
                           "    return \"ERROR|\" & errMsg\n"
                           "  end try\n"
                           "end tell";
    
    NSAppleScript *basicAppleScript = [[NSAppleScript alloc] initWithSource:basicScript];
    NSDictionary *error = nil;
    NSAppleEventDescriptor *basicResult = [basicAppleScript executeAndReturnError:&error];
    
    if (error) {
        MyLog(@"Arc basic AppleScript error: %@", error);
        [basicAppleScript release];
        
        // If this is the first time accessing Arc and permissions aren't granted,
        // request Apple Events permission through our centralized system
        if ([PermissionManager shouldRequestPermissions]) {
            MyLog(@"🔑 Requesting Apple Events permission for Arc access");
            [PermissionManager requestPermission:PermissionTypeAppleEvents completion:^(PermissionStatus status) {
                MyLog(@"📋 Apple Events permission request completed with status: %ld", (long)status);
            }];
        }
        
        return nil;
    }
    
    NSString *basicInfo = [basicResult stringValue];
    if (!basicInfo || [basicInfo hasPrefix:@"ERROR|"]) {
        MyLog(@"Arc basic script error or no result: %@", basicInfo);
        [basicAppleScript release];
        return nil;
    }
    
    NSArray *basicComponents = [basicInfo componentsSeparatedByString:@"|"];
    if (basicComponents.count < 2) {
        MyLog(@"Invalid Arc basic info components");
        [basicAppleScript release];
        return nil;
    }
    
    [basicAppleScript release];

    // Create base info with URL and title
    NSMutableDictionary *tabInfo = [@{
        @"url": basicComponents[0],
        @"title": basicComponents[1],
        @"type": @"browser",
        @"browser": @"arc",
        @"ownerName": @"Arc",
        @"timestamp": @([[NSDate date] timeIntervalSince1970] * 1000)
    } mutableCopy];
    
    MyLog(@"🎯 ARC CONTENT CAPTURED:");
    MyLog(@"   URL: %@", tabInfo[@"url"]);
    MyLog(@"   Title: %@", tabInfo[@"title"]);
    
    return tabInfo;
}

@end 