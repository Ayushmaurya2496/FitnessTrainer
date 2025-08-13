#!/bin/bash
# Quick setup script for AI Fitness Trainer

echo "🚀 AI Fitness Trainer - Complete Setup"
echo "====================================="

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Python
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ Python version: $(python --version)"
echo ""

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Node.js dependencies installed!"
else
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
npm run python-setup

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed!"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

echo ""
echo "🎉 Setup complete! Ready to start the application."
echo ""
echo "🚀 To start the application:"
echo "   npm run start-all    # Start both Node.js and Python services"
echo "   npm start            # Start only Node.js app"
echo "   npm run python-start # Start only Python backend"
echo ""
echo "🌐 Application will be available at:"
echo "   http://localhost:3000 (Main app)"
echo "   http://localhost:8000 (Python API)"
echo ""

# Ask if user wants to start the application
read -p "🤔 Do you want to start the application now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting AI Fitness Trainer..."
    npm run start-all
fi
