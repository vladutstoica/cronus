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
            // Try to detect Apple Events permission by checking if we can access Chrome
            // This is a heuristic - if Chrome tab tracking is working, Apple Events is likely granted
            @try {
                NSArray *chromeApps = [NSRunningApplication runningApplicationsWithBundleIdentifier:@"com.google.Chrome"];
                if (chromeApps.count > 0) {
                    // If Chrome is running and we can detect it, Apple Events might be working
                    // We could add a more sophisticated test here, but for now, assume granted if Chrome tracking works
                    
                    // Simple test: try to create an AppleScript (this doesn't trigger permission dialog)
                    NSAppleScript *testScript = [[NSAppleScript alloc] initWithSource:@"tell application \"System Events\" to get name of first process"];
                    if (testScript) {
                        // If we can create the script, permissions are likely OK
                        return PermissionStatusGranted;
                    }
                }
            } @catch (NSException *exception) {
                // If we can't access, it's likely denied
                return PermissionStatusDenied;
            }
            
            // Default to unknown/pending since we can't definitively check without triggering dialogs
            return PermissionStatusPending;
        }
        case PermissionTypeScreenRecording: {
            // Check if screen recording permission is granted
            // On macOS 10.15+, we can check by attempting to create a screen capture
            if (@available(macOS 10.15, *)) {
                // Try to capture a small portion of the screen to test permission
                CGImageRef testImage = CGWindowListCreateImage(CGRectMake(0, 0, 1, 1), 
                                                             kCGWindowListOptionOnScreenOnly, 
                                                             kCGNullWindowID, 
                                                             kCGWindowImageDefault);
                if (testImage) {
                    CFRelease(testImage);
                    return PermissionStatusGranted;
                } else {
                    return PermissionStatusDenied;
                }
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
    
    // Check if explicit permission dialogs are enabled
    if (![self shouldRequestPermissions]) {
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
    if (currentStatus == PermissionStatusGranted) {
        MyLog(@"✅ Permission type %ld already granted", (long)permissionType);
        if (completion) completion(PermissionStatusGranted);
        return;
    }
    
    // Request the permission
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
            MyLog(@"🍎 Apple Events permission handled by system automatically");
            // Apple Events permissions are typically handled automatically when first accessed
            // We'll mark as pending since we can't directly control the dialog
            _isRequestingPermission = NO;
            if (completion) completion(PermissionStatusPending);
            
            // Process next request
            dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
                [self processPendingRequests];
            });
            break;
        }
        case PermissionTypeScreenRecording: {
            MyLog(@"📺 Requesting Screen Recording permissions...");
            
            if (@available(macOS 10.15, *)) {
                // Trigger screen recording permission request by attempting to capture
                CGImageRef testImage = CGWindowListCreateImage(CGRectMake(0, 0, 1, 1), 
                                                             kCGWindowListOptionOnScreenOnly, 
                                                             kCGNullWindowID, 
                                                             kCGWindowImageDefault);
                
                PermissionStatus status;
                if (testImage) {
                    CFRelease(testImage);
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