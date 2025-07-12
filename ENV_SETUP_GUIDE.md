# 🔑 Environment Variables Setup Guide

## 📋 Quick Setup Checklist

- [ ] Get Razorpay API keys
- [ ] Get Ethereum RPC URL
- [ ] Deploy smart contract
- [ ] Create .env files
- [ ] Test payment integration

---

## 1. 💳 Razorpay Setup (Traditional Payments)

### Step 1: Create Account
1. Go to [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
2. Sign up for a free account
3. Complete KYC verification (for live payments)

### Step 2: Get API Keys
1. Login to Razorpay Dashboard
2. Go to **Settings** → **API Keys**
3. Click **Generate Test Key** (for development)
4. Copy both keys:
   - **Key ID**: `rzp_test_xxxxxxxxxx` (for frontend)
   - **Key Secret**: `xxxxxxxxxxxxxxxx` (for backend only)

### Step 3: Configure Webhooks (Optional)
1. Go to **Settings** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`

---

## 2. ⛓️ Blockchain Setup (Crypto Payments)

### Option A: Infura (Recommended)
1. Go to [https://infura.io/](https://infura.io/)
2. Create free account
3. Create new project
4. Copy the **HTTPS** endpoint:
   ```
   https://mainnet.infura.io/v3/YOUR_PROJECT_ID
   ```

### Option B: Alchemy
1. Go to [https://alchemy.com/](https://alchemy.com/)
2. Create free account
3. Create new app
4. Copy the **HTTPS** URL

### Option C: Public RPCs (For Testing Only)
```bash
# Ethereum Mainnet
VITE_ETHEREUM_RPC_URL=https://eth-mainnet.public.blastapi.io

# Or Polygon (cheaper gas)
VITE_ETHEREUM_RPC_URL=https://polygon-rpc.com
```

---

## 3. 📝 Smart Contract Deployment

### Using Remix IDE (Easiest)
1. Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)
2. Create new file: `EcoLoopEscrow.sol`
3. Paste the contract code from `/contracts/EcoLoopEscrow.sol`
4. Compile with Solidity 0.8.19+
5. Deploy to testnet first (Goerli/Sepolia)
6. Copy the deployed contract address

### Using Hardhat (Advanced)
```bash
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npx hardhat init
# Follow deployment guides
```

---

## 4. 📄 Environment Files Setup

### Frontend `.env` file
Create `.env` in project root:
```bash
# Copy from .env.example and fill in your values
cp .env.example .env
```

### Backend `server/.env` file
Create `server/.env`:
```bash
# Razorpay (KEEP THESE SECRET!)
RAZORPAY_KEY_ID=rzp_test_your_key_here
RAZORPAY_KEY_SECRET=your_secret_key_here

# Blockchain
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_project_id
ESCROW_CONTRACT_ADDRESS=0x123...

# Database (if using MongoDB)
MONGODB_URI=mongodb://localhost:27017/ecoloop

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Port
PORT=5000
```

---

## 5. 🧪 Testing Setup

### Test Cards (Razorpay)
```
Success: 4111 1111 1111 1111
Failure: 4000 0000 0000 0002
CVV: Any 3 digits
Expiry: Any future date
```

### Test Networks
- **Ethereum Goerli**: Free test ETH from faucets
- **Polygon Mumbai**: Free test MATIC
- **Sepolia**: Latest Ethereum testnet

### Test Wallets
1. Install MetaMask
2. Switch to test network
3. Get test ETH from faucets:
   - [Goerli Faucet](https://goerlifaucet.com/)
   - [Sepolia Faucet](https://sepoliafaucet.com/)

---

## 6. 🚀 Quick Start Commands

```bash
# 1. Copy environment files
cp .env.example .env
cd server && cp .env.example .env && cd ..

# 2. Install dependencies
npm install
cd server && npm install && cd ..

# 3. Start development
npm run dev  # Frontend
cd server && npm run dev  # Backend
```

---

## 7. 🔒 Security Notes

### ⚠️ NEVER commit these to Git:
- Razorpay Key Secret
- Private keys
- Production API keys
- MongoDB connection strings with passwords

### ✅ Safe to commit:
- Razorpay Key ID (public key)
- Public RPC URLs
- Contract addresses
- Test environment configs

---

## 8. 📊 Cost Breakdown

### Razorpay Fees
- **Domestic Cards**: 2% + ₹3
- **International Cards**: 3% + ₹3
- **UPI**: 0.7% (max ₹15)
- **Net Banking**: 0.9% + ₹3

### Blockchain Fees
- **Ethereum**: 0.001-0.01 ETH per transaction
- **Polygon**: ~0.01 MATIC per transaction
- **Free tier**: Infura (100k requests/day)

---

## 9. 🆘 Troubleshooting

### Common Issues

**"MetaMask not detected"**
- Install MetaMask browser extension
- Refresh the page

**"Payment gateway not loading"**
- Check Razorpay key configuration
- Verify CORS settings

**"Transaction failed"**
- Check wallet balance
- Verify gas fees
- Ensure contract is deployed

**"API connection failed"**
- Check backend is running
- Verify API URL in .env
- Check CORS configuration

---

## 10. 📞 Support Resources

- **Razorpay Docs**: [https://razorpay.com/docs/](https://razorpay.com/docs/)
- **Infura Docs**: [https://docs.infura.io/](https://docs.infura.io/)
- **MetaMask Docs**: [https://docs.metamask.io/](https://docs.metamask.io/)
- **Ethereum Docs**: [https://ethereum.org/developers/](https://ethereum.org/developers/)

---

## 🎯 Production Deployment

### Before Going Live:
1. Switch to Razorpay Live keys
2. Deploy contract to Ethereum Mainnet
3. Use production RPC endpoints
4. Set up proper webhook handling
5. Implement proper error logging
6. Add rate limiting
7. Set up monitoring and alerts
