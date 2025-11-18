//
//  browserTabTracking.h
//

#import <Foundation/Foundation.h>

@protocol BrowserTabTrackingDelegate <NSObject>
- (void)browserTabDidSwitch:(NSDictionary *)newTabInfo;
@end

@interface BrowserTabTracking : NSObject

@property (nonatomic, assign) id<BrowserTabTrackingDelegate> delegate;
@property (nonatomic, retain) NSString *lastKnownBrowserURL;
@property (nonatomic, retain) NSString *lastKnownBrowserTitle;
@property (nonatomic, assign) BOOL isBrowserActive;
@property (nonatomic, retain) NSTimer *browserTabCheckTimer;
@property (nonatomic, retain) NSString *browserName;

- (void)startBrowserTabTimer;
- (void)stopBrowserTabTimer;
- (NSDictionary*)getCurrentBrowserTabBriefInfo;

@end