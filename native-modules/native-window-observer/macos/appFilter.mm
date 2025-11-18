#import "appFilter.h"
#include <stdio.h> // For fprintf, stderr

#define MyLog(format, ...) fprintf(stderr, "%s\n", [[NSString stringWithFormat:format, ##__VA_ARGS__] UTF8String])

BOOL shouldExcludeApp(NSString* ownerName, NSString* title) {
    if (!ownerName) return NO;
    
    // First check: Exclude system UI elements
    if ([ownerName isEqualToString:@"Dock"] ||
        [ownerName isEqualToString:@"Finder"] ||
        [ownerName isEqualToString:@"SystemUIServer"] ||
        [ownerName isEqualToString:@"WindowManager"]) {
        MyLog(@"🚫 Excluding system UI element: %@", ownerName);
        return YES;
    }
    
    return NO;
} 