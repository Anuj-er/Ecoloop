# 🌱 **EcoLoop** - Turning Waste Into Worth

> **AI-powered surplus exchange platform connecting waste generators with buyers for a sustainable future**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://mongodb.com/)
[![Ethereum](https://img.shields.io/badge/Blockchain-Ethereum-blue.svg)](https://ethereum.org/)

## 🎯 **What is Ecoloop?**

Ecoloop is a comprehensive sustainable marketplace platform featuring:

- **🛒 Smart Marketplace** - Buy/sell eco-friendly materials with AI-powered fraud detection
- **🤝 Eco Connect** - Network with sustainability enthusiasts and businesses  
- **💰 Dual Payments** - Support for both fiat (Stripe) and cryptocurrency (Ethereum)
- **🔐 Secure Escrow** - Smart contract-based escrow for crypto transactions
- **🤖 AI Moderation** - Automated content and image analysis for quality assurance

## 🚀 **Quick Start (3 Commands)**

```bash
# 1. Clone & Install
git clone https://github.com/AkankshaMishra2/Ecoloop.git && cd Ecoloop && npm install && cd server && npm install && cd ../ai-service && pip install -r requirements.txt && cd ..

# 2. Setup Environment (copy from examples below)
cp .env.example .env && cp server/.env.example server/.env && cp contracts-ecoloop/.env.example contracts-ecoloop/.env

# 3. Run (3 terminals)
cd server && npm start           # Terminal 1: Backend (Port 5000)
npm run dev                      # Terminal 2: Frontend (Port 8080)
cd ai-service && python app.py  # Terminal 3: AI Service (Port 5001)
```

**🎉 Ready!** Open [http://localhost:8080](http://localhost:8080)

## ⚙️ **Environment Setup**

### **Frontend (`.env`)**
```bash
# Payment & API
VITE_PAYMENT_MODE=stripe
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Blockchain (Optional - for crypto payments)
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_ESCROW_CONTRACT_ADDRESS=0x...
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key

# Cloudinary (Optional - for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### **Backend (`server/.env`)**
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/ecoloop
# OR MongoDB Atlas: mongodb+srv://USERNAME:PASSWORD@your-cluster.mongodb.net/ecoloop

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here

# Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Blockchain (Optional)
ALCHEMY_API_KEY=your_alchemy_key
ESCROW_CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your_wallet_private_key
```

### **Smart Contracts (`contracts-ecoloop/.env`)**
```bash
# Only needed if deploying contracts
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_key
```

## 🛠️ **Tech Stack**

| **Category** | **Technology** |
|-------------|----------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express.js, MongoDB, Mongoose |
| **Payments** | Stripe (Fiat), Ethereum (Crypto), Smart Contracts |
| **AI Services** | Python Flask, Image Analysis, Fraud Detection |
| **Blockchain** | Solidity, Hardhat, Alchemy, Sepolia Testnet |
| **Cloud** | Cloudinary (Images), MongoDB Atlas (Database) |

## 🎨 **Key Features**

### **🛒 Marketplace**
- **Smart Listings** - AI-powered image analysis and categorization
- **Multi-Payment** - Fiat via Stripe + Crypto via Ethereum
- **Escrow Protection** - Smart contract-based secure transactions
- **Search & Filter** - Advanced filtering by material, location, price

### **🤝 Social Network**
- **Eco Connect** - Network with sustainable businesses and individuals
- **Impact Tracking** - Monitor carbon savings and waste reduction
- **Project Sharing** - Showcase sustainability projects and initiatives

### **🔐 Security**
- **AI Fraud Detection** - Automated suspicious activity detection
- **Image Moderation** - AI-powered content screening
- **Smart Contracts** - Decentralized escrow for crypto payments
- **JWT Authentication** - Secure user authentication

### **📱 User Experience**
- **Responsive Design** - Works on all devices
- **Real-time Updates** - Live notifications and status updates
- **Dark/Light Mode** - User preference themes
- **Multi-language** - I18n support ready

## 📁 **Project Structure**

```
Ecoloop/
├── 🎨 Frontend (React + Vite)
│   ├── src/components/     # UI components
│   ├── src/contexts/       # React contexts
│   └── src/services/       # API services
├── 🔧 Backend (Node.js + Express)
│   ├── controllers/        # Business logic
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API endpoints
│   └── middleware/        # Auth, validation, etc.
├── 🤖 AI Service (Python)
│   └── app.py             # Image analysis & fraud detection
├── ⛓️ Smart Contracts (Solidity)
│   ├── contracts/         # Solidity contracts
│   └── scripts/           # Deployment scripts
```

## 🚀 **Deployment**

### **Production**
- **Frontend**: Deploy to Vercel/Netlify
- **Backend**: Deploy to Railway/Heroku/DigitalOcean  
- **Database**: MongoDB Atlas
- **AI Service**: Deploy Python Flask app
- **Smart Contracts**: Already deployed on Sepolia

## 👥 **Team**

**Team 404 Name Not Found** | Chitkara University


- **[@anuj-er](https://github.com/anuj-er)** 
- **[@anushi13prsnl](https://github.com/anushi13prsnl)** 
- **[@akankshamishra2](https://github.com/akankshamishra2)** 

Built with ❤️ for a sustainable future

## 📄 **License**

MIT License - feel free to use this project for learning and building your own sustainable solutions!

---

### 🌍 **Join the Movement**
Every transaction on Ecoloop contributes to a more sustainable future. Start your eco-journey today!

**📹 Live Demo**: [Watch on YouTube](https://youtu.be/zQkFUziNMN0?si=__2dLU80eUUcKG0D)  
**📚 Documentation**: [Wiki](https://github.com/AkankshaMishra2/Ecoloop/wiki)  
**🐛 Issues**: [Bug Reports](https://github.com/AkankshaMishra2/Ecoloop/issues)
