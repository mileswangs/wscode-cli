#!/bin/bash

# Package test script for npm publishing

echo "🔨 Building the application..."
node build.mjs

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed!"

echo "📦 Creating npm package..."
npm pack

if [ $? -eq 0 ]; then
    echo "✅ Package created successfully!"
    
    # Get the package name
    PACKAGE_NAME=$(ls *.tgz | head -n 1)
    echo "📦 Package file: $PACKAGE_NAME"
    
    echo "📋 Package contents:"
    tar -tzf "$PACKAGE_NAME" | head -20
    
    echo ""
    echo "🎯 Ready for publishing!"
    echo "To publish: npm publish"
    echo "To test locally: npm install -g ./$PACKAGE_NAME"
    
else
    echo "❌ Package creation failed!"
    exit 1
fi
