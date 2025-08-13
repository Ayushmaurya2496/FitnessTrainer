#!/bin/bash
# Startup script for Python Backend Service

echo "🚀 AI Fitness Trainer - Python Backend Setup"
echo "=============================================="

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null; then
    echo "❌ pip is not installed. Please install pip first."
    exit 1
fi

# Install required packages
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🎯 Available commands:"
    echo "  python pose_analyzer.py     - Start FastAPI backend service (port 8000)"
    echo "  python webcam_detector.py   - Start webcam pose detection"
    echo "  python rtsp_detector.py     - Start RTSP camera pose detection"
    echo ""
    echo "🔗 The FastAPI service will connect to your Node.js app on port 3000"
    echo "📍 API will be available at: http://localhost:8000"
    echo ""
    
    # Start the FastAPI service
    echo "🚀 Starting FastAPI Pose Analysis Service..."
    python pose_analyzer.py
else
    echo "❌ Failed to install dependencies. Please check your Python environment."
    exit 1
fi
