#!/bin/bash
set -e

BUCKET_NAME="cronusnewupdates"
CURRENT_VERSION=$(node -p "require('./package.json').version")
ARCH=$1

if [ -z "$ARCH" ]; then
    echo "Usage: $0 [arm64|x64]"
    exit 1
fi

echo "Creating latest download links for version $CURRENT_VERSION ($ARCH)"

aws s3 cp "s3://$BUCKET_NAME/Cronus-$CURRENT_VERSION-$ARCH.dmg" "s3://$BUCKET_NAME/Cronus-latest-$ARCH.dmg" --metadata-directive REPLACE --acl public-read
aws s3 cp "s3://$BUCKET_NAME/Cronus-$CURRENT_VERSION-$ARCH.zip" "s3://$BUCKET_NAME/Cronus-latest-$ARCH.zip" --metadata-directive REPLACE --acl public-read

echo "Latest download links updated for $ARCH!"
echo "DMG: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-$ARCH.dmg"
echo "ZIP: https://$BUCKET_NAME.s3.amazonaws.com/Cronus-latest-$ARCH.zip"