@echo off
REM Quick setup script for AI Fitness Trainer (Windows)

echo 🚀 AI Fitness Trainer - Complete Setup
echo =====================================

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

for /f %%i in ('node --version') do set nodeversion=%%i
for /f %%i in ('python --version') do set pythonversion=%%i

echo ✅ Node.js version: %nodeversion%
echo ✅ Python version: %pythonversion%
echo.

REM Install Node.js dependencies
echo 📦 Installing Node.js dependencies...
call npm install

if %errorlevel% equ 0 (
    echo ✅ Node.js dependencies installed!
) else (
    echo ❌ Failed to install Node.js dependencies
    pause
    exit /b 1
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
call npm run python-setup

if %errorlevel% equ 0 (
    echo ✅ Python dependencies installed!
) else (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo 🎉 Setup complete! Ready to start the application.
echo.
echo 🚀 To start the application:
echo    npm run start-all    - Start both Node.js and Python services
echo    npm start            - Start only Node.js app
echo    npm run python-start - Start only Python backend
echo.
echo 🌐 Application will be available at:
echo    http://localhost:3000 (Main app)
echo    http://localhost:8000 (Python API)
echo.

REM Ask if user wants to start the application
set /p choice="🤔 Do you want to start the application now? (y/n): "
if /i "%choice%"=="y" (
    echo 🚀 Starting AI Fitness Trainer...
    call npm run start-all
) else (
    echo 👋 Setup complete. Run 'npm run start-all' when ready to start.
    pause
)
