#pragma once

#import <Cocoa/Cocoa.h>

@interface ContentExtractor : NSObject

+ (NSString*)getAppTextContent:(NSString*)ownerName windowId:(CGWindowID)windowId;
+ (void)requestAccessibilityPermissions;

@end 