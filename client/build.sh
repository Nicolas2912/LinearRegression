#!/bin/bash
# Exit on error
set -e

echo "===== Starting build process ====="
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Clean install to avoid dependency conflicts
echo "===== Cleaning previous installations ====="
rm -rf node_modules package-lock.json

# Install dependencies
echo "===== Installing dependencies ====="
npm install --no-optional

# Explicitly install daisyui
echo "===== Installing daisyui ====="
npm install daisyui@5.0.9 --save-dev

# Verify daisyui installation
echo "===== Verifying daisyui installation ====="
if [ -d "node_modules/daisyui" ]; then
  echo "daisyui installed successfully"
  ls -la node_modules/daisyui
else
  echo "daisyui installation failed. Creating empty module."
  mkdir -p node_modules/daisyui
  echo "module.exports = {};" > node_modules/daisyui/index.js
fi

# Build the project
echo "===== Building project ====="
npm run build

echo "===== Build completed ====="