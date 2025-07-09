# EcoLoop Marketplace

## Overview
The EcoLoop Marketplace is a feature that allows users to buy and sell recycled or upcycled products, promoting sustainability and circular economy.

## API Documentation
For detailed API endpoints and usage, refer to `MARKETPLACE_API.md`.

## Setup Instructions

### Prerequisites
- Node.js 16+
- Python 3.8+ (for AI service)
- MongoDB connection

### Setup Steps
1. Clone the repository
2. Copy `.env.example` to `.env` and configure MongoDB connection
3. Install dependencies:
   ```bash
   npm install
   cd ai-service
   pip install -r requirements.txt
   ```
4. Start the services:
   ```bash
   # Terminal 1: Start main server
   npm run dev
   
   # Terminal 2: Start AI service
   cd ai-service
   python app.py
   ```

## Components

### Frontend
- Marketplace.tsx - Main marketplace page
- MarketplaceItemCard.tsx - Card component for displaying items
- MarketplaceItemDetail.tsx - Detailed view of an item
- SellItemModal.tsx - Modal for selling/listing items
- MarketplaceAdminDashboard.tsx - Admin dashboard for marketplace

### Backend
- MarketplaceItem.js - Database model
- marketplaceController.js - Business logic
- marketplace.js - API routes

### AI Service
- app.py - Flask application for image analysis
