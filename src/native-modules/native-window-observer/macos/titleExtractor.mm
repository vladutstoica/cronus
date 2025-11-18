#import "titleExtractor.h"
#import "permissionManager.h"
#import <ApplicationServices/ApplicationServices.h>

// Logging macro - you may want to adjust this based on your logging setup
#define MyLog(format, ...) NSLog(@"[TitleExtractor] " format, ##__VA_ARGS__)

@implementation TitleExtractor

+ (void)setShouldRequestPermissions:(BOOL)shouldRequest {
    [PermissionManager setShouldRequestPermissions:shouldRequest];
}

+ (BOOL)shouldRequestPermissions {
    return [PermissionManager shouldRequestPermissions];
}

+ (NSString*)extractWindowTitleForApp:(NSString*)appName {
    if (!appName || appName.length == 0) {
        MyLog(@"❌ Invalid app name provided");
        return nil;
    }
    
    MyLog(@"🔍 Extracting window title for app: %@", appName);
    
    // Try primary method first (CGWindowList) - doesn't require permissions
    NSString *title = [self extractTitleUsingCGWindowList:appName];
    if (title && title.length > 0) {
        return title;
    }
    
    // Check if we should request permissions before trying AppleScript
    if (![PermissionManager hasPermissionsForTitleExtraction] && [PermissionManager shouldRequestPermissions]) {
        MyLog(@"🔑 Requesting accessibility permissions for AppleScript fallback");
        [PermissionManager requestPermission:PermissionTypeAccessibility completion:^(PermissionStatus status) {
            MyLog(@"📋 Accessibility permission request completed with status: %ld", (long)status);
        }];
    }
    
    // Try AppleScript fallback (requires permissions, but may work if already granted)
    MyLog(@"🔄 CGWindowList failed, trying AppleScript fallback for app: %@", appName);
    return [self extractTitleUsingAppleScript:appName];
}

+ (NSString*)extractTitleUsingCGWindowList:(NSString*)appName {
    @try {
        MyLog(@"📊 Using CGWindowList approach for app: %@", appName);
        
        // Get window information directly from Core Graphics
        // Use __bridge_transfer to move ownership to ARC
        NSArray *windowList = (__bridge_transfer NSArray *)CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID);
        if (!windowList) {
            MyLog(@"❌ Failed to get window list from CGWindowListCopyWindowInfo");
            return nil;
        }
        
        MyLog(@"📋 Found %ld windows to examine", [windowList count]);
        
        for (NSDictionary *windowInfo in windowList) {
            NSString *ownerName = windowInfo[(id)kCGWindowOwnerName];
            NSString *windowName = windowInfo[(id)kCGWindowName];
            NSNumber *ownerPID = windowInfo[(id)kCGWindowOwnerPID];
            NSNumber *layer = windowInfo[(id)kCGWindowLayer];
            
            // Check if this window belongs to the target app
            if (ownerName && [ownerName isEqualToString:appName]) {
                // Skip system-level windows (layer > 0 typically indicates system windows)
                if (layer && layer.intValue > 0) {
                    MyLog(@"⏭️  Skipping system window (layer %@) for app: %@", layer, ownerName);
                    continue;
                }
                
                if (windowName && windowName.length > 0) {
                    MyLog(@"🎯 Found window title via CGWindowList: '%@' for app: %@ (PID: %@)", windowName, ownerName, ownerPID);
                    return [windowName copy];
                }
            }
        }
        
        MyLog(@"⚠️  No window title found via CGWindowList for app: %@", appName);
        
    } @catch (NSException *exception) {
        MyLog(@"❌ Exception in CGWindowList approach: %@", exception.reason);
    }
    
    return nil;
}

+ (NSString*)extractTitleUsingAppleScript:(NSString*)appName {
    // Check if permission requests are enabled before executing AppleScript
    if (![PermissionManager shouldRequestPermissions]) {
        MyLog(@"🍎 AppleScript approach skipped - permission requests disabled during onboarding");
        return nil;
    }
    
    @try {
        MyLog(@"🍎 Using AppleScript approach for app: %@", appName);
        
        // Create AppleScript to get the frontmost window title
        NSString *scriptSource = [NSString stringWithFormat:@
            "tell application \"System Events\"\n"
            "    try\n"
            "        set frontApp to first process whose frontmost is true\n"
            "        if name of frontApp is \"%@\" then\n"
            "            tell process \"%@\"\n"
            "                try\n"
            "                    set frontWindow to first window whose value of attribute \"AXMain\" is true\n"
            "                    return value of attribute \"AXTitle\" of frontWindow\n"
            "                on error\n"
            "                    return \"\"\n"
            "                end try\n"
            "            end tell\n"
            "        end if\n"
            "    on error\n"
            "        return \"\"\n"
            "    end try\n"
            "end tell", appName, appName];
        
        NSAppleScript *script = [[NSAppleScript alloc] initWithSource:scriptSource];
        NSDictionary *errorDict = nil;
        NSAppleEventDescriptor *result = [script executeAndReturnError:&errorDict];
        
        if (errorDict) {
            MyLog(@"❌ AppleScript execution error: %@", errorDict);
            return nil;
        }
        
        if (result && [result descriptorType] == typeUnicodeText) {
            NSString *title = [result stringValue];
            if (title && title.length > 0) {
                MyLog(@"🎯 Found window title via AppleScript: '%@' for app: %@", title, appName);
                return [title copy];
            }
        }
        
        MyLog(@"⚠️  No window title found via AppleScript for app: %@", appName);
        
    } @catch (NSException *exception) {
        MyLog(@"❌ Exception in AppleScript approach: %@", exception.reason);
    }
    
    return nil;
}

+ (BOOL)hasRequiredPermissions {
    return [PermissionManager hasPermissionsForTitleExtraction];
}

+ (void)requestRequiredPermissions {
    MyLog(@"🔑 Requesting required permissions for title extraction via PermissionManager");
    [PermissionManager requestPermission:PermissionTypeAccessibility completion:^(PermissionStatus status) {
        MyLog(@"📋 Title extraction permission request completed with status: %ld", (long)status);
    }];
}

@end 