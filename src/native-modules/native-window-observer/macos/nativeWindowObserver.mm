#import <Cocoa/Cocoa.h>

#import <stdio.h>
#import <napi.h>
#import "./activeWindowObserver.h"
#import "./permissionManager.h"
#import "./iconUtils.h"

void StartActiveWindowObserverMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  initActiveWindowObserver(env, info[0].As<Napi::Function>());
}

void StopActiveWindowObserverMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  @try {
    stopActiveWindowObserver(env);
  } @catch (NSException *exception) {
    // Silent fail
  }
}

void SetPermissionDialogsEnabledMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsBoolean()) {
    Napi::TypeError::New(env, "Expected boolean argument").ThrowAsJavaScriptException();
    return;
  }
  
  bool shouldRequest = info[0].As<Napi::Boolean>().Value();
  [PermissionManager setShouldRequestPermissions:shouldRequest];
}

Napi::Value GetPermissionDialogsEnabledMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  BOOL shouldRequest = [PermissionManager shouldRequestPermissions];
  return Napi::Boolean::New(env, shouldRequest);
}

Napi::Value GetPermissionStatusMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number argument for permission type").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  int permissionType = info[0].As<Napi::Number>().Int32Value();
  PermissionStatus status = [PermissionManager statusForPermission:(PermissionType)permissionType];
  return Napi::Number::New(env, (int)status);
}

Napi::Value HasPermissionsForTitleExtractionMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  BOOL hasPermissions = [PermissionManager hasPermissionsForTitleExtraction];
  return Napi::Boolean::New(env, hasPermissions);
}

Napi::Value HasPermissionsForContentExtractionMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  BOOL hasPermissions = [PermissionManager hasPermissionsForContentExtraction];
  return Napi::Boolean::New(env, hasPermissions);
}

void RequestPermissionMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Expected number argument for permission type").ThrowAsJavaScriptException();
    return;
  }
  
  int permissionType = info[0].As<Napi::Number>().Int32Value();
  [PermissionManager requestPermission:(PermissionType)permissionType completion:^(PermissionStatus status) {
    // Could potentially send back result via callback if needed
    NSLog(@"Permission request completed with status: %ld", (long)status);
  }];
}

Napi::Value GetAppIconPathMethod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected string argument for app name").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  std::string appName = info[0].As<Napi::String>().Utf8Value();
  NSString *nsAppName = [NSString stringWithUTF8String:appName.c_str()];
  
  NSString *iconPath = getAppIconPath(nsAppName);
  
  if (iconPath) {
    return Napi::String::New(env, [iconPath UTF8String]);
  } else {
    return env.Null();
  }
}

Napi::Object NativeWindowObserver(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "startActiveWindowObserver"),
              Napi::Function::New(env, StartActiveWindowObserverMethod));
  exports.Set(Napi::String::New(env, "stopActiveWindowObserver"),
              Napi::Function::New(env, StopActiveWindowObserverMethod));
  exports.Set(Napi::String::New(env, "setPermissionDialogsEnabled"),
              Napi::Function::New(env, SetPermissionDialogsEnabledMethod));
  exports.Set(Napi::String::New(env, "getPermissionDialogsEnabled"),
              Napi::Function::New(env, GetPermissionDialogsEnabledMethod));
  exports.Set(Napi::String::New(env, "getPermissionStatus"),
              Napi::Function::New(env, GetPermissionStatusMethod));
  exports.Set(Napi::String::New(env, "hasPermissionsForTitleExtraction"),
              Napi::Function::New(env, HasPermissionsForTitleExtractionMethod));
  exports.Set(Napi::String::New(env, "hasPermissionsForContentExtraction"),
              Napi::Function::New(env, HasPermissionsForContentExtractionMethod));
  exports.Set(Napi::String::New(env, "requestPermission"),
              Napi::Function::New(env, RequestPermissionMethod));
  exports.Set(Napi::String::New(env, "getAppIconPath"),
              Napi::Function::New(env, GetAppIconPathMethod));
  return exports;
}

NODE_API_MODULE(nativeWindowObserver, NativeWindowObserver)