# EcoLoop Marketplace - Complete Setup Guide

This guide will help you set up the complete Marketplace feature for EcoLoop, including the AI image analysis service.

## 🚀 What's New

### ✅ Frontend Features
- **Marketplace Page**: Browse items for sale by other users
- **Sell Item Modal**: List your items with AI-powered image analysis
- **Item Detail View**: Detailed view with seller information and interest expression
- **Admin Dashboard**: Review flagged items and manage marketplace content

### ✅ Backend Features
- **MarketplaceItem Model**: Complete schema for marketplace items
- **AI Integration**: Automatic image analysis during item listing
- **Admin Review System**: Items flagged by AI go to admin approval queue
- **Interest System**: Buyers can express interest and contact sellers

### ✅ AI Microservice
- **Flask AI Service**: Analyzes images for quality and content
- **MobileNetV2 Classification**: Identifies item categories
- **Quality Assessment**: Detects blurry, dark, or low-quality images
- **Suspicious Content Detection**: Flags inappropriate content

## 📋 Prerequisites

- Node.js 16+ and npm
- MongoDB
- Python 3.8+ and pip
- Git

## 🛠️ Installation Steps

### 1. Backend Setup (Node.js + Express)

```bash
# Navigate to server directory
cd server

# Install new dependencies (if not already installed)
npm install axios

# Start the server
npm start
```

The backend now includes:
- `/api/marketplace` - All marketplace endpoints
- AI image analysis integration
- Admin review system

### 2. AI Service Setup (Flask + TensorFlow)

```bash
# Navigate to AI service directory
cd ai-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the AI service
python app.py
```

The AI service will run on `http://localhost:5000` by default.

### 3. Frontend Setup (React + TypeScript)

```bash
# Navigate to project root
cd ..

# Install any new dependencies (if needed)
npm install

# Start the development server
npm run dev
```

### 4. Environment Variables

Add these to your `.env` files:

**Backend (.env in /server)**:
```env
AI_SERVICE_URL=http://localhost:5000
```

**AI Service (.env in /ai-service)**:
```env
PORT=5000
FLASK_ENV=development
```

## 🎯 Usage Guide

### For Users

1. **Access Marketplace**: Click "Marketplace" in the navigation bar
2. **Browse Items**: View items with search and filtering options
3. **Sell Items**: Click "Sell Item" to list your own items
4. **Image Upload**: Upload clear, high-quality images (AI will analyze them)
5. **Express Interest**: Contact sellers for items you want to buy

### For Admins

1. **Access Admin Dashboard**: Navigate to `/admin/marketplace`
2. **Review Flagged Items**: Items flagged by AI appear for manual review
3. **Approve/Reject**: Make decisions on suspicious content
4. **Add Notes**: Document your moderation decisions

## 🔧 Configuration

### AI Service Configuration

The AI service can be configured by modifying `ai-service/app.py`:

- **Quality Thresholds**: Adjust blur and brightness detection
- **Confidence Thresholds**: Change minimum confidence for classification
- **Category Mapping**: Add more marketplace-relevant categories

### Backend Configuration

Marketplace settings in `server/controllers/marketplaceController.js`:

- **Image Limits**: Maximum 5 images per item
- **File Size Limits**: 5MB per image
- **AI Service Timeout**: 30 seconds

## 🚨 Troubleshooting

### Common Issues

1. **AI Service Not Responding**
   - Check if Flask service is running on port 5000
   - Verify TensorFlow installation
   - Check firewall/network settings

2. **Image Upload Fails**
   - Verify Cloudinary configuration
   - Check image file size (max 5MB)
   - Ensure stable internet connection

3. **Admin Dashboard Access Denied**
   - Verify user has admin role in database
   - Check JWT token validity

### Error Logs

- **Backend**: Check server console for API errors
- **AI Service**: Check Flask console for analysis errors
- **Frontend**: Check browser console for React errors

## 📊 Performance Optimization

### AI Service Optimization

1. **Model Caching**: MobileNetV2 loads once on startup
2. **Batch Processing**: Support for multiple images
3. **Error Handling**: Graceful fallbacks when AI is unavailable

### Database Optimization

1. **Indexes**: Marketplace items indexed for search performance
2. **Pagination**: Items loaded in batches of 12
3. **Image CDN**: Cloudinary handles image optimization

## 🔐 Security Features

### Image Security

1. **AI Content Analysis**: Filters inappropriate content
2. **File Type Validation**: Only image files accepted
3. **Size Limits**: Prevents large file uploads

### API Security

1. **Authentication**: JWT tokens required for all marketplace APIs
2. **Authorization**: Owner and admin checks for sensitive operations
3. **Input Validation**: All form data validated

## 🚀 Deployment

### Production Deployment

1. **AI Service**: Deploy Flask app with Gunicorn
2. **Backend**: Standard Node.js deployment
3. **Frontend**: Build and serve static files

### Docker Deployment

```dockerfile
# AI Service Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

## 📈 Monitoring

### Health Checks

- **AI Service**: `GET /health`
- **Backend**: `GET /health`
- **Database**: MongoDB connection status

### Performance Metrics

- Image analysis response times
- Marketplace item view counts
- Admin review queue size

## 🎉 Success!

Your EcoLoop Marketplace is now fully functional with:

✅ Complete item listing and browsing
✅ AI-powered image analysis
✅ Admin moderation system
✅ User interest and contact system
✅ Responsive design for all devices

Visit `http://localhost:5173/marketplace` to start using the marketplace!

## 🆘 Support

If you encounter any issues:

1. Check this README for troubleshooting steps
2. Review error logs in browser console and server logs
3. Verify all services are running (Backend, AI Service, Database)
4. Ensure all environment variables are set correctly

The marketplace is designed to gracefully handle AI service failures, so basic functionality will work even if the AI analysis is temporarily unavailable.
