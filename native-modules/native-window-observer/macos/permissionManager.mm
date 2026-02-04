#import "permissionManager.h"
#import <ApplicationServices/ApplicationServices.h>

// Logging macro
#define MyLog(format, ...) NSLog(@"[PermissionManager] " format, ##__VA_ARGS__)

// Static variables for singleton and state management
static PermissionManager *_sharedManager = nil;
static BOOL _explicitPermissionDialogsEnabled = NO; // Disabled by default - only enabled after onboarding
static BOOL _isRequestingPermission = NO;
static NSMutableArray *_pendingRequests = nil;

@interface PermissionRequest : NSObject
@property (nonatomic, assign) PermissionType permissionType;
@property (nonatomic, copy) void(^completion)(PermissionStatus status);
@end

@implementation PermissionRequest
@end

@implementation PermissionManager

+ (instancetype)sharedManager {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _sharedManager = [[self alloc] init];
        _pendingRequests = [[NSMutableArray alloc] init];
    });
    return _sharedManager;
}

+ (void)setShouldRequestPermissions:(BOOL)shouldRequest {
    _explicitPermissionDialogsEnabled = shouldRequest;
    MyLog(@"🎛️  Explicit permission dialog mode set to: %@", shouldRequest ? @"ENABLED" : @"DISABLED");
    
    // If we just enabled permissions and have pending requests, process them
    if (shouldRequest && _pendingRequests.count > 0) {
        MyLog(@"🔄 Processing %lu pending explicit permission requests", (unsigned long)_pendingRequests.count);
        [self processPendingRequests];
    }
}

+ (BOOL)shouldRequestPermissions {
    return _explicitPermissionDialogsEnabled;
}

+ (PermissionStatus)statusForPermission:(PermissionType)permissionType {
    switch (permissionType) {
        case PermissionTypeAccessibility: {
            BOOL hasAccess = AXIsProcessTrusted();
            return hasAccess ? PermissionStatusGranted : PermissionStatusDenied;
        }
        case PermissionTypeAppleEvents: {
            // Check if we have Automation permissions for any running browser
            // We test by actually executing a simple AppleScript - if it succeeds, permission is granted

            // Check Arc first (most common for this user)
            NSRunningApplication *arcApp = [[NSRunningApplication runningApplicationsWithBundleIdentifier:@"company.thebrowser.Browser"] firstObject];
            if (arcApp) {
                NSAppleScript *testScript = [[NSAppleScript alloc] initWithSource:@"tell application \"Arc\" to get name"];
                NSDictionary *error = nil;
                [testScript executeAndReturnError:&error];
                [testScript release];

                if (!error) {
                    return PermissionStatusGranted;
                }
                // Error means permission not granted for Arc
                return PermissionStatusDenied;
            }

            // Check Chrome
            NSRunningApplication *chromeApp = [[NSRunningApplication runningApplicationsWithBundleIdentifier:@"com.google.Chrome"] firstObject];
            if (chromeApp) {
                NSAppleScript *testScript = [[NSAppleScript alloc] initWithSource:@"tell application \"Google Chrome\" to get name"];
                NSDictionary *error = nil;
                [testScript executeAndReturnError:&error];
                [testScript release];

                if (!error) {
                    return PermissionStatusGranted;
                }
                return PermissionStatusDenied;
            }

            // No supported browser is running - can't determine status
            return PermissionStatusPending;
        }
        case PermissionTypeScreenRecording: {
            // Check screen recording permission using CGPreflightScreenCaptureAccess (macOS 10.15+)
            // Note: CGWindowListCreateImage is unreliable — it can return a non-null (blank) image
            // even when permission is not granted on macOS 12+.
            if (@available(macOS 10.15, *)) {
                BOOL hasAccess = CGPreflightScreenCaptureAccess();
                return hasAccess ? PermissionStatusGranted : PermissionStatusDenied;
            } else {
                // On older macOS versions, screen recording doesn't require explicit permission
                return PermissionStatusGranted;
            }
        }
    }
    return PermissionStatusDenied;
}

+ (void)requestPermission:(PermissionType)permissionType
               completion:(void(^)(PermissionStatus status))completion {

    MyLog(@"📥 requestPermission called for type %ld", (long)permissionType);

    // Check if explicit permission dialogs are enabled
    BOOL dialogsEnabled = [self shouldRequestPermissions];
    MyLog(@"📋 Permission dialogs enabled: %@", dialogsEnabled ? @"YES" : @"NO");

    if (!dialogsEnabled) {
        MyLog(@"⚠️  Explicit permission dialogs disabled, queuing request for type %ld", (long)permissionType);

        // Queue the request for later
        PermissionRequest *request = [[PermissionRequest alloc] init];
        request.permissionType = permissionType;
        request.completion = completion;
        [_pendingRequests addObject:request];
        return;
    }

    // Check if we're already requesting a permission
    if (_isRequestingPermission) {
        MyLog(@"⏳ Already requesting permission, queuing request for type %ld", (long)permissionType);

        PermissionRequest *request = [[PermissionRequest alloc] init];
        request.permissionType = permissionType;
        request.completion = completion;
        [_pendingRequests addObject:request];
        return;
    }

    // Check if permission is already granted
    PermissionStatus currentStatus = [self statusForPermission:permissionType];
    MyLog(@"📊 Current status for type %ld: %ld", (long)permissionType, (long)currentStatus);

    if (currentStatus == PermissionStatusGranted) {
        MyLog(@"✅ Permission type %ld already granted", (long)permissionType);
        if (completion) completion(PermissionStatusGranted);
        return;
    }

    // Request the permission
    MyLog(@"🚀 Proceeding to performPermissionRequest for type %ld", (long)permissionType);
    [self performPermissionRequest:permissionType completion:completion];
}

+ (void)performPermissionRequest:(PermissionType)permissionType 
                      completion:(void(^)(PermissionStatus status))completion {
    
    _isRequestingPermission = YES;
    MyLog(@"🔑 Requesting permission type %ld", (long)permissionType);
    
    switch (permissionType) {
        case PermissionTypeAccessibility: {
            MyLog(@"🔐 Requesting Accessibility permissions...");
            
            // Request accessibility permissions with prompt
            BOOL hasAccess = AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)@{
                (__bridge NSString *)kAXTrustedCheckOptionPrompt: @YES
            });
            
            PermissionStatus status = hasAccess ? PermissionStatusGranted : PermissionStatusPending;
            MyLog(@"📋 Accessibility permission result: %@", hasAccess ? @"✅ Granted" : @"⏳ Pending");
            
            _isRequestingPermission = NO;
            if (completion) completion(status);
            
            // Process next request after a delay to allow dialog to be handled
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [self processPendingRequests];
            });
            break;
        }
        case PermissionTypeAppleEvents: {
            MyLog(@"🍎 Requesting Apple Events/Automation permissions...");

            // To trigger Automation permission dialogs, we must actually execute
            // AppleScripts targeting each browser. This triggers the system prompt
            // "Cronus wants to control [Browser]"

            __block PermissionStatus finalStatus = PermissionStatusPending;
            __block BOOL anyBrowserFound = NO;

            // Try to trigger permission dialog for Arc
            NSArray *arcApps = [NSRunningApplication runningApplicationsWithBundleIdentifier:@"company.thebrowser.Browser"];
            MyLog(@"🔍 Arc apps found: %lu", (unsigned long)arcApps.count);

            if (arcApps.count > 0) {
                anyBrowserFound = YES;
                MyLog(@"🔑 Arc is running, triggering Automation permission request...");

                // Use a simpler script that's more likely to trigger the dialog
                NSString *arcScript = @"tell application \"Arc\"\nget name\nend tell";
                MyLog(@"📜 Executing AppleScript: %@", arcScript);

                NSAppleScript *script = [[NSAppleScript alloc] initWithSource:arcScript];
                NSDictionary *error = nil;
                NSAppleEventDescriptor *result = [script executeAndReturnError:&error];

                if (error) {
                    NSNumber *errorNumber = error[NSAppleScriptErrorNumber];
                    NSString *errorMessage = error[NSAppleScriptErrorMessage];
                    MyLog(@"❌ Arc AppleScript error %@: %@", errorNumber, errorMessage);

                    // Error -1743 means user denied permission
                    // Error -600 means app not running
                    // Error -10004 means permission not granted yet (dialog should appear)
                    if ([errorNumber intValue] == -1743) {
                        MyLog(@"🚫 User previously denied Arc permission - need to enable in System Settings");
                        finalStatus = PermissionStatusDenied;
                    }
                } else {
                    MyLog(@"✅ Arc Automation permission granted! Result: %@", [result stringValue]);
                    finalStatus = PermissionStatusGranted;
                }
                [script release];
            }

            // Try to trigger permission dialog for Chrome
            NSArray *chromeApps = [NSRunningApplication runningApplicationsWithBundleIdentifier:@"com.google.Chrome"];
            MyLog(@"🔍 Chrome apps found: %lu", (unsigned long)chromeApps.count);

            if (chromeApps.count > 0) {
                anyBrowserFound = YES;
                MyLog(@"🔑 Chrome is running, triggering Automation permission request...");

                NSString *chromeScript = @"tell application \"Google Chrome\"\nget name\nend tell";
                NSAppleScript *script = [[NSAppleScript alloc] initWithSource:chromeScript];
                NSDictionary *error = nil;
                NSAppleEventDescriptor *result = [script executeAndReturnError:&error];

                if (error) {
                    NSNumber *errorNumber = error[NSAppleScriptErrorNumber];
                    NSString *errorMessage = error[NSAppleScriptErrorMessage];
                    MyLog(@"❌ Chrome AppleScript error %@: %@", errorNumber, errorMessage);
                } else {
                    MyLog(@"✅ Chrome Automation permission granted! Result: %@", [result stringValue]);
                    finalStatus = PermissionStatusGranted;
                }
                [script release];
            }

            if (!anyBrowserFound) {
                MyLog(@"⚠️ No supported browsers (Arc, Chrome) are running! Please open Arc or Chrome first, then click Request again.");
            }

            _isRequestingPermission = NO;
            if (completion) completion(finalStatus);

            // Process next request after delay to allow user to respond to dialogs
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [self processPendingRequests];
            });
            break;
        }
        case PermissionTypeScreenRecording: {
            MyLog(@"📺 Requesting Screen Recording permissions...");

            if (@available(macOS 10.15, *)) {
                // Use CGRequestScreenCaptureAccess to prompt the user (macOS 10.15+)
                // This is more reliable than CGWindowListCreateImage which can return
                // a non-null (blank) image even without permission on macOS 12+.
                CGRequestScreenCaptureAccess();

                BOOL hasAccess = CGPreflightScreenCaptureAccess();
                PermissionStatus status;
                if (hasAccess) {
                    status = PermissionStatusGranted;
                    MyLog(@"📋 Screen Recording permission result: ✅ Granted");
                } else {
                    status = PermissionStatusPending;
                    MyLog(@"📋 Screen Recording permission result: ⏳ Pending (dialog shown)");
                }
                
                _isRequestingPermission = NO;
                if (completion) completion(status);
                
                // Process next request after a delay to allow dialog to be handled
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                    [self processPendingRequests];
                });
            } else {
                // On older macOS versions, no permission needed
                MyLog(@"📋 Screen Recording permission: ✅ Not required on this macOS version");
                _isRequestingPermission = NO;
                if (completion) completion(PermissionStatusGranted);
                
                dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                    [self processPendingRequests];
                });
            }
            break;
        }
    }
}

+ (void)requestPermissions:(NSArray<NSNumber*>*)permissionTypes 
                completion:(void(^)(NSDictionary<NSNumber*, NSNumber*>* results))completion {
    
    NSMutableDictionary *results = [[NSMutableDictionary alloc] init];
    __block NSInteger remainingRequests = permissionTypes.count;
    
    if (remainingRequests == 0) {
        if (completion) completion(results);
        return;
    }
    
    MyLog(@"🔄 Requesting %ld permissions in sequence", (long)permissionTypes.count);
    
    // Request permissions one by one to avoid overwhelming the user
    for (NSNumber *permissionTypeNumber in permissionTypes) {
        PermissionType permissionType = (PermissionType)[permissionTypeNumber integerValue];
        
        [self requestPermission:permissionType completion:^(PermissionStatus status) {
            results[permissionTypeNumber] = @(status);
            remainingRequests--;
            
            if (remainingRequests == 0) {
                MyLog(@"✅ All permission requests completed");
                if (completion) completion(results);
            }
        }];
    }
}

+ (void)processPendingRequests {
    if (_pendingRequests.count == 0 || _isRequestingPermission) {
        return;
    }
    
    MyLog(@"🔄 Processing next pending permission request (%lu remaining)", (unsigned long)_pendingRequests.count);
    
    PermissionRequest *nextRequest = [_pendingRequests firstObject];
    [_pendingRequests removeObjectAtIndex:0];
    
    [self performPermissionRequest:nextRequest.permissionType completion:nextRequest.completion];
}

+ (BOOL)hasPermissionsForTitleExtraction {
    // Title extraction primarily uses CGWindowList (no permissions needed)
    // Accessibility is only needed for AppleScript fallback
    return YES; // CGWindowList works without permissions
}

+ (BOOL)hasPermissionsForContentExtraction {
    // Content extraction requires accessibility permissions
    return [self statusForPermission:PermissionTypeAccessibility] == PermissionStatusGranted;
}

@end 