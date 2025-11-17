#pragma once
#include <stdio.h>
#include <string>
#include <Cocoa/Cocoa.h>
#include <napi.h>
#import "ScreenshotManager.h"
#import "browserTabTracking.h"
#import "sleepAndLockObserver.h"

void initActiveWindowObserver(Napi::Env env, Napi::Function windowCallback);
void stopActiveWindowObserver(Napi::Env env);

@interface ActiveWindowObserver : NSObject <ScreenshotManagerDelegate, BrowserTabTrackingDelegate>
- (id)init;
- (NSDictionary*)getActiveWindow;
- (void)cleanUp;
- (void)sendWindowInfoToJS:(NSDictionary*)windowInfo withReason:(NSString*)reason;
- (void)dealloc;
- (void)removeWindowObserver;
- (void)receiveAppChangeNotification:(NSNotification *)notification;
- (NSString*)performSynchronousOCR;
- (NSString*)captureScreenshotAndPerformOCR:(CGWindowID)windowId;
- (NSDictionary*)captureScreenshotAndOCRForCurrentWindow;
@end