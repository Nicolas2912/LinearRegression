#!/bin/bash
# Exit on error
set -e

echo "===== Starting build process ====="
echo "Current directory: $(pwd)"
echo "Initial Node version: $(node -v)"
echo "Initial NPM version: $(npm -v)"

# Force Node.js 16 using nvm if available
NODE_VERSION="16.20.0"
echo "===== Setting up correct Node.js version ====="
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "Using existing nvm installation"
  . "$HOME/.nvm/nvm.sh"
else
  echo "Installing nvm"
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Install and use correct Node version
echo "Installing Node.js $NODE_VERSION"
nvm install $NODE_VERSION
nvm use $NODE_VERSION
echo "Using Node version: $(node -v)"
echo "Using NPM version: $(npm -v)"

# Clean install to avoid dependency conflicts
echo "===== Cleaning previous installations ====="
rm -rf node_modules package-lock.json

# Run preinstall script to fix ajv issues
echo "===== Running preinstall script ====="
chmod +x ./preinstall.sh
./preinstall.sh

# Install dependencies with specific npm flags
echo "===== Installing dependencies ====="
npm install --legacy-peer-deps

# Explicitly install daisyui
echo "===== Installing daisyui ====="
npm install daisyui@5.0.9 --legacy-peer-deps

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

# Install specific ajv modules that might be missing
echo "===== Installing ajv dependencies ====="
npm install ajv@8.9.0 ajv-keywords@5.1.0 --legacy-peer-deps --force

# Copy our ajv-codegen-shim to the required location
echo "===== Setting up ajv shim ====="
mkdir -p node_modules/ajv/dist/compile
cp ./ajv-codegen-shim.js node_modules/ajv/dist/compile/codegen.js
echo "Shim file copied to $(ls -la node_modules/ajv/dist/compile/codegen.js)"

# Build the project
echo "===== Building project ====="
NODE_OPTIONS=--openssl-legacy-provider npm run build

echo "===== Build completed ====="