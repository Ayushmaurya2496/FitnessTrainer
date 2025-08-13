@echo off
REM Startup script for Python Backend Service (Windows)

echo 🚀 AI Fitness Trainer - Python Backend Setup
echo ==============================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed. Please install pip first.
    pause
    exit /b 1
)

REM Install required packages
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo ✅ Dependencies installed successfully!
    echo.
    echo 🎯 Available commands:
    echo   python pose_analyzer.py     - Start FastAPI backend service (port 8000)
    echo   python webcam_detector.py   - Start webcam pose detection
    echo   python rtsp_detector.py     - Start RTSP camera pose detection
    echo.
    echo 🔗 The FastAPI service will connect to your Node.js app on port 3000
    echo 📍 API will be available at: http://localhost:8000
    echo.
    
    REM Start the FastAPI service
    echo 🚀 Starting FastAPI Pose Analysis Service...
    python pose_analyzer.py
) else (
    echo ❌ Failed to install dependencies. Please check your Python environment.
    pause
    exit /b 1
)
