@echo off
echo ==========================================
echo PhishShield AI - Backend Setup ^& Start
echo ==========================================

echo [1/3] Checking for Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH!
    echo Please install Python from https://www.python.org/downloads/ and check "Add Python to PATH"
    pause
    exit /b
)

echo [2/3] Installing/verifying dependencies...
pip install -r requirements.txt

echo [3/3] Starting FastAPI Server...
echo The server will run at http://127.0.0.1:8000
echo Press Ctrl+C to stop the server.
uvicorn main:app --reload
