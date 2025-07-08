#!/bin/bash

# EcoLoop Marketplace Setup Script
# This script sets up the complete marketplace feature including AI service

echo "🌱 Setting up EcoLoop Marketplace..."

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

if ! command_exists python3; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

if ! command_exists pip; then
    echo "❌ pip is not installed. Please install pip first."
    exit 1
fi

echo "✅ Prerequisites check passed!"

# Setup AI Service
echo "🤖 Setting up AI Service..."
cd ai-service

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ AI Service setup complete!"

# Go back to root
cd ..

# Setup Backend
echo "🔧 Setting up Backend..."
cd server

# Install Node.js dependencies (if not already installed)
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Install additional dependencies for marketplace
echo "Installing marketplace dependencies..."
npm install axios

echo "✅ Backend setup complete!"

# Go back to root
cd ..

# Setup Frontend
echo "⚛️ Setting up Frontend..."

# Install Node.js dependencies (if not already installed)
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

echo "✅ Frontend setup complete!"

# Create environment files if they don't exist
echo "📝 Setting up environment variables..."

# Backend .env
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env file..."
    cat > server/.env << EOL
# Add your existing environment variables here
AI_SERVICE_URL=http://localhost:5000
EOL
    echo "⚠️  Please update server/.env with your MongoDB, JWT, and Cloudinary settings"
else
    # Add AI_SERVICE_URL to existing .env if not present
    if ! grep -q "AI_SERVICE_URL" server/.env; then
        echo "AI_SERVICE_URL=http://localhost:5000" >> server/.env
        echo "✅ Added AI_SERVICE_URL to server/.env"
    fi
fi

# AI Service .env
if [ ! -f "ai-service/.env" ]; then
    echo "Creating ai-service/.env file..."
    cat > ai-service/.env << EOL
PORT=5000
FLASK_ENV=development
EOL
fi

echo "✅ Environment setup complete!"

# Create startup scripts
echo "📜 Creating startup scripts..."

# Create startup script for all services
cat > start-marketplace.sh << 'EOL'
#!/bin/bash

echo "🚀 Starting EcoLoop Marketplace..."

# Function to kill background processes on exit
cleanup() {
    echo "Stopping all services..."
    jobs -p | xargs -r kill
    exit
}
trap cleanup EXIT

# Start AI Service
echo "Starting AI Service..."
cd ai-service
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
python app.py &
AI_PID=$!
cd ..

# Wait for AI service to start
echo "Waiting for AI service to start..."
sleep 5

# Start Backend
echo "Starting Backend..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Start Frontend
echo "Starting Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ All services started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:5000/api"
echo "🤖 AI Service: http://localhost:5000"
echo "🛒 Marketplace: http://localhost:5173/marketplace"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for any process to exit
wait
EOL

chmod +x start-marketplace.sh

# Create Windows batch file
cat > start-marketplace.bat << 'EOL'
@echo off
echo 🚀 Starting EcoLoop Marketplace...

echo Starting AI Service...
cd ai-service
call venv\Scripts\activate
start "AI Service" python app.py
cd ..

echo Waiting for AI service to start...
timeout /t 5 /nobreak > nul

echo Starting Backend...
cd server
start "Backend" npm start
cd ..

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "Frontend" npm run dev

echo ✅ All services started!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend: http://localhost:5000/api
echo 🤖 AI Service: http://localhost:5000
echo 🛒 Marketplace: http://localhost:5173/marketplace
echo.
echo Press any key to exit...
pause > nul
EOL

echo "✅ Startup scripts created!"

# Final instructions
echo ""
echo "🎉 EcoLoop Marketplace setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update server/.env with your MongoDB, JWT, and Cloudinary credentials"
echo "2. Start all services:"
echo "   - Linux/macOS: ./start-marketplace.sh"
echo "   - Windows: start-marketplace.bat"
echo "3. Visit http://localhost:5173/marketplace to test the marketplace"
echo ""
echo "📚 Documentation:"
echo "- Setup Guide: MARKETPLACE_SETUP.md"
echo "- AI Service: ai-service/README.md"
echo ""
echo "🆘 Need help? Check the troubleshooting section in MARKETPLACE_SETUP.md"
