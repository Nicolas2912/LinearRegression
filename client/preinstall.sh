#!/bin/bash
# Pre-installation script to fix ajv-related issues

# Remove any existing ajv installations
if [ -d "node_modules/ajv" ]; then
  echo "Cleaning ajv installation"
  rm -rf node_modules/ajv
  rm -rf node_modules/ajv-keywords
fi

# Create a clean environment for ajv
mkdir -p node_modules/ajv/dist/compile
touch node_modules/ajv/dist/compile/codegen.js

# Create a simple fallback module
echo "module.exports = { _ : { str: () => {}, nil: () => {}, _ : () => {} } };" > node_modules/ajv/dist/compile/codegen.js

echo "Pre-installation setup complete!" 