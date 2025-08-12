#!/bin/bash

# Render startup script for fitness-trainer
echo "Starting fitness trainer application on Render..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Set production environment
export NODE_ENV=production

# Start the application
exec node App.js
