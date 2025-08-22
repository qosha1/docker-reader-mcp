#!/bin/bash

# Test script to simulate workflow behavior
echo "🧪 Testing workflow logic..."

# Check current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Simulate version bump
echo "🔄 Simulating version bump..."
npm version patch --no-git-tag-version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📦 New version: $NEW_VERSION"

# Test build
echo "🔨 Testing build..."
npm run build

if [ -f "dist/index.js" ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test package creation
echo "📦 Testing package creation..."
npm pack --dry-run > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Package creation successful"
else
    echo "❌ Package creation failed"
    exit 1
fi

# Restore original version
git checkout package.json 2>/dev/null || echo "ℹ️  No git to restore from"

echo "🎉 All workflow tests passed!"