@echo off
echo 🌱 Setting up EcoLoop Marketplace...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo ✅ Prerequisites check passed!

REM Setup AI Service
echo 🤖 Setting up AI Service...
cd ai-service

echo Creating Python virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing Python dependencies...
pip install -r requirements.txt

echo ✅ AI Service setup complete!

cd ..

REM Setup Backend
echo 🔧 Setting up Backend...
cd server

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo Installing marketplace dependencies...
npm install axios

echo ✅ Backend setup complete!

cd ..

REM Setup Frontend
echo ⚛️ Setting up Frontend...

if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo ✅ Frontend setup complete!

REM Create environment files
echo 📝 Setting up environment variables...

if not exist "server\.env" (
    echo Creating server\.env file...
    echo # Add your existing environment variables here > server\.env
    echo AI_SERVICE_URL=http://localhost:5000 >> server\.env
    echo ⚠️  Please update server\.env with your MongoDB, JWT, and Cloudinary settings
) else (
    findstr /C:"AI_SERVICE_URL" server\.env >nul
    if %errorlevel% neq 0 (
        echo AI_SERVICE_URL=http://localhost:5000 >> server\.env
        echo ✅ Added AI_SERVICE_URL to server\.env
    )
)

if not exist "ai-service\.env" (
    echo Creating ai-service\.env file...
    echo PORT=5000 > ai-service\.env
    echo FLASK_ENV=development >> ai-service\.env
)

echo ✅ Environment setup complete!

REM Create startup script
echo 📜 Creating startup script...

echo @echo off > start-marketplace.bat
echo echo 🚀 Starting EcoLoop Marketplace... >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo Starting AI Service... >> start-marketplace.bat
echo cd ai-service >> start-marketplace.bat
echo call venv\Scripts\activate >> start-marketplace.bat
echo start "AI Service" python app.py >> start-marketplace.bat
echo cd .. >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo Waiting for AI service to start... >> start-marketplace.bat
echo timeout /t 5 /nobreak ^> nul >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo Starting Backend... >> start-marketplace.bat
echo cd server >> start-marketplace.bat
echo start "Backend" npm start >> start-marketplace.bat
echo cd .. >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo Waiting for backend to start... >> start-marketplace.bat
echo timeout /t 3 /nobreak ^> nul >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo Starting Frontend... >> start-marketplace.bat
echo start "Frontend" npm run dev >> start-marketplace.bat
echo. >> start-marketplace.bat
echo echo ✅ All services started! >> start-marketplace.bat
echo echo 📱 Frontend: http://localhost:5173 >> start-marketplace.bat
echo echo 🔧 Backend: http://localhost:5000/api >> start-marketplace.bat
echo echo 🤖 AI Service: http://localhost:5000 >> start-marketplace.bat
echo echo 🛒 Marketplace: http://localhost:5173/marketplace >> start-marketplace.bat
echo echo. >> start-marketplace.bat
echo echo Press any key to exit... >> start-marketplace.bat
echo pause ^> nul >> start-marketplace.bat

echo ✅ Startup script created!

echo.
echo 🎉 EcoLoop Marketplace setup complete!
echo.
echo 📋 Next steps:
echo 1. Update server\.env with your MongoDB, JWT, and Cloudinary credentials
echo 2. Run start-marketplace.bat to start all services
echo 3. Visit http://localhost:5173/marketplace to test the marketplace
echo.
echo 📚 Documentation:
echo - Setup Guide: MARKETPLACE_SETUP.md
echo - AI Service: ai-service\README.md
echo.
echo 🆘 Need help? Check the troubleshooting section in MARKETPLACE_SETUP.md
echo.
pause
