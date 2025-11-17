#!/bin/bash

# Check if native modules exist and have the correct architecture for ARM64 builds
NATIVE_MODULE_PATH="src/native-modules/native-windows/build/Release/nativeWindows.node"

# Check if the native module exists
if [ ! -f "$NATIVE_MODULE_PATH" ]; then
    echo "MISSING"
    exit 1
fi

# Check the architecture of the native module
ARCH_INFO=$(file "$NATIVE_MODULE_PATH")

# Check if it's ARM64 compatible
if echo "$ARCH_INFO" | grep -q "arm64"; then
    echo "ARM64_OK"
    exit 0
elif echo "$ARCH_INFO" | grep -q "x86_64"; then
    echo "X64_ONLY"
    exit 1
else
    echo "UNKNOWN"
    exit 1
fi