#!/bin/bash
set -e

BUCKET_NAME="cronusnewupdates"
CURRENT_VERSION=$(node -p "require('./package.json').version")
ARCHS=("arm64" "x64")

echo "Checking publication status for version $CURRENT_VERSION"
echo "================================================"

ALL_PUBLISHED=true

for ARCH in "${ARCHS[@]}"; do
    echo "Checking architecture: $ARCH"
    
    # Check if versioned files exist
    DMG_EXISTS=$(aws s3 ls "s3://$BUCKET_NAME/Cronus-$CURRENT_VERSION-$ARCH.dmg" 2>/dev/null || echo "")
    ZIP_EXISTS=$(aws s3 ls "s3://$BUCKET_NAME/Cronus-$CURRENT_VERSION-$ARCH.zip" 2>/dev/null || echo "")

    if [ -n "$DMG_EXISTS" ]; then
        echo "  ✅ DMG found: Cronus-$CURRENT_VERSION-$ARCH.dmg"
        DMG_DATE=$(echo $DMG_EXISTS | awk '{print $1, $2}')
        echo "     Published: $DMG_DATE"
    else
        echo "  ❌ DMG not found: Cronus-$CURRENT_VERSION-$ARCH.dmg"
        ALL_PUBLISHED=false
    fi

    if [ -n "$ZIP_EXISTS" ]; then
        echo "  ✅ ZIP found: Cronus-$CURRENT_VERSION-$ARCH.zip"
        ZIP_DATE=$(echo $ZIP_EXISTS | awk '{print $1, $2}')
        echo "     Published: $ZIP_DATE"
    else
        echo "  ❌ ZIP not found: Cronus-$CURRENT_VERSION-$ARCH.zip"
        ALL_PUBLISHED=false
    fi

    # Check if latest files exist
    LATEST_DMG_EXISTS=$(aws s3 ls "s3://$BUCKET_NAME/Cronus-latest-$ARCH.dmg" 2>/dev/null || echo "")
    LATEST_ZIP_EXISTS=$(aws s3 ls "s3://$BUCKET_NAME/Cronus-latest-$ARCH.zip" 2>/dev/null || echo "")

    if [ -n "$LATEST_DMG_EXISTS" ]; then
        echo "  ✅ Latest DMG link exists for $ARCH"
        LATEST_DMG_DATE=$(echo $LATEST_DMG_EXISTS | awk '{print $1, $2}')
        echo "     Updated: $LATEST_DMG_DATE"
    else
        echo "  ❌ Latest DMG link not found for $ARCH"
        ALL_PUBLISHED=false
    fi

    if [ -n "$LATEST_ZIP_EXISTS" ]; then
        echo "  ✅ Latest ZIP link exists for $ARCH"
        LATEST_ZIP_DATE=$(echo $LATEST_ZIP_EXISTS | awk '{print $1, $2}')
        echo "     Updated: $LATEST_ZIP_DATE"
    else
        echo "  ❌ Latest ZIP link not found for $ARCH"
        ALL_PUBLISHED=false
    fi
    echo ""
done

echo "Download URLs:"
echo "ARM64 DMG: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-arm64.dmg"
echo "ARM64 ZIP: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-arm64.zip"
echo "Intel DMG: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-x64.dmg"
echo "Intel ZIP: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-x64.zip"

# Check if everything is published and up to date
if $ALL_PUBLISHED; then
    echo ""
    echo "🎉 Version $CURRENT_VERSION is fully published for all architectures and latest links are updated!"
else
    echo ""
    echo "⚠️  Version $CURRENT_VERSION is not fully published yet."
fi 