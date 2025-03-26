#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Debug - print current directory
echo "Current directory: $(pwd)"
ls -la

# Explicitly install daisyui with exact version
npm install daisyui@5.0.9 --no-save

# Check if daisyui is installed
ls -la node_modules | grep daisyui

# Regular build process
npm install
npm run build