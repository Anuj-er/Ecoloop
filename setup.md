# 🚀 Eco Loop AI Connect - Setup Guide

## MongoDB Connection Setup

### Step 1: Create Environment File
1. Copy the `env.example` file to `.env`:
   ```bash
   cp env.example .env
   ```

### Step 2: Configure MongoDB Atlas
1. **Get your MongoDB Atlas connection string:**
   - Log into [MongoDB Atlas](https://cloud.mongodb.com)
   - Go to your cluster
   - Click "Connect"
   - Choose "Connect your application"
   - Copy the connection string

2. **Update your `.env` file:**
   ```env
   MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/eco-loop-ai?retryWrites=true&w=majority
   ```

3. **Replace the placeholders:**
   - `your_username`: Your MongoDB Atlas username
   - `your_password`: Your MongoDB Atlas password
   - `your_cluster`: Your cluster name

### Step 3: Configure JWT Secret
Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Add it to your `.env` file:
```env
JWT_SECRET=your_generated_secret_here
```

### Step 4: Start the Application

1. **Install dependencies:**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install frontend dependencies
   cd ..
   npm install
   ```

2. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

3. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```

## 🔧 Troubleshooting

### MongoDB Connection Issues

**Error: `ENOTFOUND`**
- Check your internet connection
- Verify your MongoDB Atlas cluster is running
- Ensure your IP address is whitelisted in MongoDB Atlas
- Check if your connection string is correct

**Error: `Authentication failed`**
- Check your username and password
- Ensure your MongoDB Atlas user has the correct permissions
- Verify the database name in your connection string

### IP Whitelist Setup
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Add your current IP or use "Allow Access from Anywhere" (0.0.0.0/0) for development

### Database User Setup
1. Go to MongoDB Atlas → Database Access
2. Create a new database user with read/write permissions
3. Use these credentials in your connection string

## 📝 Example .env File
```env
# MongoDB Connection Strings
MONGODB_URI=mongodb+srv://myuser:mypassword@mycluster.mongodb.net/eco-loop-ai?retryWrites=true&w=majority
MONGODB_URI_PROD=mongodb+srv://myuser:mypassword@mycluster.mongodb.net/eco-loop-ai?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=my_super_secret_jwt_key_here

# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

## 🎯 Quick Start Commands
```bash
# 1. Setup environment
cp env.example .env
# Edit .env with your MongoDB credentials

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Start the application
cd server && npm run dev
# In another terminal:
npm run dev
```

Your application should now be running at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000 