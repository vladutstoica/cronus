#import <Foundation/Foundation.h>
#import <CoreGraphics/CoreGraphics.h>
#import <Cocoa/Cocoa.h>

@class ScreenshotManager;

@protocol ScreenshotManagerDelegate <NSObject>
- (void)screenshotManager:(ScreenshotManager *)manager didCaptureScreenshot:(NSString *)filePath forWindowInfo:(NSDictionary *)windowInfo;
- (NSDictionary *)getActiveWindowForScreenshotManager:(ScreenshotManager *)manager;
@end

@interface ScreenshotManager : NSObject

@property (nonatomic, assign) id<ScreenshotManagerDelegate> delegate;

- (void)startPeriodicScreenshotCapture;
- (void)stopPeriodicScreenshotCapture;

@end 