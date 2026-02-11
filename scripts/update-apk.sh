#!/bin/bash

# Barbershop APK Update Script
# This script copies the latest APK build to the public directory for web download

echo "🔄 Updating Barbershop APK..."

# Configuration
ANDROID_BUILD_DIR="android/app/build/outputs/apk/debug"
PUBLIC_APK_DIR="public/apk"
APK_NAME="tipuo-app.apk"
SOURCE_APK="app-debug.apk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Create public APK directory if it doesn't exist
if [ ! -d "$PUBLIC_APK_DIR" ]; then
    print_status "Creating APK directory..."
    mkdir -p "$PUBLIC_APK_DIR"
fi

# Check if Android build exists
if [ ! -f "$ANDROID_BUILD_DIR/$SOURCE_APK" ]; then
    print_error "Android APK not found at $ANDROID_BUILD_DIR/$SOURCE_APK"
    print_status "Building Android APK first..."

    # Build the APK
    cd android
    ./gradlew assembleDebug

    if [ $? -ne 0 ]; then
        print_error "APK build failed!"
        exit 1
    fi
    cd ..

    print_success "APK built successfully"
fi

# Get APK file info
SOURCE_PATH="$ANDROID_BUILD_DIR/$SOURCE_APK"
DEST_PATH="$PUBLIC_APK_DIR/$APK_NAME"

if [ ! -f "$SOURCE_PATH" ]; then
    print_error "Source APK still not found after build attempt"
    exit 1
fi

# Get file size and modification time
FILE_SIZE=$(du -h "$SOURCE_PATH" | cut -f1)
MOD_TIME=$(stat -f "%Sm" "$SOURCE_PATH" 2>/dev/null || stat -c "%y" "$SOURCE_PATH" 2>/dev/null)

print_status "Copying APK file..."
print_status "Source: $SOURCE_PATH"
print_status "Size: $FILE_SIZE"
print_status "Modified: $MOD_TIME"

# Copy the APK file
cp "$SOURCE_PATH" "$DEST_PATH"

if [ $? -eq 0 ]; then
    print_success "APK copied successfully to $DEST_PATH"

    # Verify the copy
    if [ -f "$DEST_PATH" ]; then
        DEST_SIZE=$(du -h "$DEST_PATH" | cut -f1)
        print_success "Verification successful - Destination size: $DEST_SIZE"

        # Create a version info file
        VERSION_FILE="$PUBLIC_APK_DIR/version.json"
        cat > "$VERSION_FILE" << EOF
{
  "appName": "Barbershop",
  "version": "1.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "apkSize": "$DEST_SIZE",
  "apkPath": "/apk/$APK_NAME",
  "minAndroidVersion": "6.0",
  "features": [
    "Appointment Booking",
    "AI Style Assistant",
    "Loyalty Rewards",
    "Service History"
  ]
}
EOF
        print_success "Version info created"

        # Create a simple HTML download page for testing
        HTML_FILE="$PUBLIC_APK_DIR/download.html"
        cat > "$HTML_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barbershop - APK Download</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            color: white;
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .download-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .app-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            border-radius: 20px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
        }
        h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .version {
            color: #22c55e;
            font-size: 14px;
            margin-bottom: 30px;
        }
        .download-btn {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
            display: inline-block;
            text-decoration: none;
        }
        .download-btn:hover {
            transform: translateY(-2px);
        }
        .features {
            margin-top: 30px;
            text-align: left;
        }
        .feature {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .feature::before {
            content: "✓";
            color: #22c55e;
            margin-right: 10px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="download-card">
        <div class="app-icon">TipunoX</div>
        <h1>Barbershop</h1>
        <div class="version">Version 1.0 • Android App</div>

        <a href="tipuo-app.apk" class="download-btn" download>
            📱 Download APK
        </a>

        <div class="features">
            <div class="feature">Easy Appointment Booking</div>
            <div class="feature">AI Style Assistant</div>
            <div class="feature">Loyalty Rewards</div>
            <div class="feature">Service History Tracking</div>
        </div>
    </div>
</body>
</html>
EOF
        print_success "Download page created"

        echo ""
        print_success "🎉 APK update completed successfully!"
        echo ""
        echo "📱 APK Information:"
        echo "   Location: $DEST_PATH"
        echo "   Size: $DEST_SIZE"
        echo "   Version: 1.0"
        echo ""
        echo "🌐 Download URLs:"
        echo "   Direct: http://localhost:3000/apk/$APK_NAME"
        echo "   Page: http://localhost:3000/apk/download.html"
        echo ""
        echo "📋 Next Steps:"
        echo "   1. Start your development server: npm run dev"
        echo "   2. Visit the download page to test"
        echo "   3. Access /download-app for the full download page"
        echo ""

    else
        print_error "APK copy verification failed"
        exit 1
    fi
else
    print_error "Failed to copy APK file"
    exit 1
fi
