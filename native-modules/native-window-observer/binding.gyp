{
  "targets": [
    {
      "target_name": "nativeWindowObserver",
      "cflags!": ["-fno-exceptions"],
      "cflags_cc!": ["-fno-exceptions"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS==\"mac\"",
          {
            "sources": [
              "<!@(node -p \"require('fs').readdirSync('./macos').map(f=>'macos/'+f).join(' ')\")",
              "macos/nativeWindowObserver.mm",
              "macos/activeWindowObserver.mm",
              "macos/sleepAndLockObserver.mm",
              "macos/titleExtractor.mm",
              "macos/permissionManager.mm"
            ],
            "libraries": [
              "-framework Cocoa",
              "-framework ApplicationServices",
              "-framework CoreGraphics", 
              "-framework Vision"
            ],
            "xcode_settings": {
              "OTHER_CFLAGS": ["-fno-exceptions"]
            }
          }
        ]
      ]
    }
  ]
}