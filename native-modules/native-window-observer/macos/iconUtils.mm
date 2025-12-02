#import "iconUtils.h"
#import <stdio.h>

#define MyLog(format, ...) fprintf(stderr, "%s\n", [[NSString stringWithFormat:format, ##__VA_ARGS__] UTF8String])

NSString* getAppIconPath(NSString* appName) {
    NSWorkspace *workspace = [NSWorkspace sharedWorkspace];
    
    // Create icons directory if it doesn't exist
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString *cachesDirectory = [paths firstObject];
    NSString *iconsDirectory = [cachesDirectory stringByAppendingPathComponent:@"app-icons"];
    
    NSFileManager *fileManager = [NSFileManager defaultManager];
    if (![fileManager fileExistsAtPath:iconsDirectory]) {
        NSError *error = nil;  // 🔧 Initialize to nil
        BOOL success = [fileManager createDirectoryAtPath:iconsDirectory 
                                  withIntermediateDirectories:YES 
                                                   attributes:nil 
                                                        error:&error];
        if (!success || error) {  // 🔧 Check both success and error
            // MyLog(@"🚨 Failed to create icons directory: %@", error ? [error localizedDescription] : @"Unknown error");
            return nil;
        }
    }
    
    // Create safe filename from app name
    NSString *safeAppName = [appName stringByReplacingOccurrencesOfString:@" " withString:@"-"];
    safeAppName = [safeAppName stringByReplacingOccurrencesOfString:@"/" withString:@"-"];
    safeAppName = [safeAppName stringByReplacingOccurrencesOfString:@":" withString:@"-"];  // 🔧 Also handle colons
    NSString *iconPath = [iconsDirectory stringByAppendingPathComponent:[NSString stringWithFormat:@"%@.png", safeAppName]];
    
    // Check if icon already exists
    if ([fileManager fileExistsAtPath:iconPath]) {
        // MyLog(@"✅ Using cached icon for %@: %@", appName, iconPath);
        return iconPath;
    }
    
    // Try to find the app and get its icon
    NSArray *runningApps = [workspace runningApplications];
    for (NSRunningApplication *app in runningApps) {
        // Only match by exact localizedName to avoid false positives
        // (e.g., Messenger's bundle ID "com.facebook.archon" contains "arc")
        if ([app.localizedName isEqualToString:appName]) {
            
            // Get the app icon directly from NSWorkspace
            NSImage *appIcon = [workspace iconForFile:app.bundleURL.path];
            if (appIcon) {
                // Resize to 32x32
                NSSize newSize = NSMakeSize(32, 32);
                NSImage *resizedIcon = [[NSImage alloc] initWithSize:newSize];
                [resizedIcon lockFocus];
                [appIcon drawInRect:NSMakeRect(0, 0, newSize.width, newSize.height)
                           fromRect:NSZeroRect
                          operation:NSCompositingOperationCopy
                           fraction:1.0];
                [resizedIcon unlockFocus];
                
                // Convert to PNG data
                CGImageRef cgImage = [resizedIcon CGImageForProposedRect:nil context:nil hints:nil];
                if (cgImage) {  // 🔧 Check if cgImage is valid
                    NSBitmapImageRep *bitmapRep = [[NSBitmapImageRep alloc] initWithCGImage:cgImage];
                    NSData *pngData = [bitmapRep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
                    
                    if (pngData) {
                        // Save to file
                        NSError *writeError = nil;  // 🔧 Use different variable name
                        BOOL writeSuccess = [pngData writeToFile:iconPath options:NSDataWritingAtomic error:&writeError];
                        if (!writeSuccess || writeError) {  // 🔧 Check both success and error
                            // MyLog(@"🚨 Failed to save icon for %@: %@", appName, writeError ? [writeError localizedDescription] : @"Unknown write error");
                            return nil;
                        }
                        
                        // MyLog(@"🎨 Generated icon file for %@ (%lu bytes): %@", appName, (unsigned long)pngData.length, iconPath);
                        return iconPath;
                    } else {
                        // MyLog(@"🚨 Failed to convert icon to PNG data for %@", appName);
                    }
                } else {
                    // MyLog(@"🚨 Failed to create CGImage for %@", appName);
                }
                
                // Clean up
            } else {
                // MyLog(@"🚨 No icon found for app %@", appName);
            }
        }
    }
    
    // MyLog(@"🎨 No icon found for %@", appName);
    return nil;
} 