# EcoLoop Marketplace API Documentation

## Overview

The EcoLoop Marketplace API provides endpoints for managing marketplace items, user interactions, and AI-powered image analysis. This documentation covers all marketplace-related endpoints.

## Base URL

```
http://localhost:5000/api/marketplace
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Marketplace Items

#### Get All Marketplace Items

```http
GET /api/marketplace
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 12)
- `materialType` (string, optional): Filter by material type
- `category` (string, optional): Filter by category
- `condition` (string, optional): Filter by condition
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `pinCode` (string, optional): Filter by pin code
- `search` (string, optional): Text search in title/description
- `tags` (string, optional): Comma-separated tags

**Response:**
```json
{
  "success": true,
  "count": 12,
  "pagination": {
    "next": { "page": 2, "limit": 12 }
  },
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012",
      "title": "Cotton Fabric Scraps",
      "description": "High-quality cotton fabric scraps perfect for crafting",
      "price": 150,
      "currency": "INR",
      "materialType": "cloth",
      "condition": "good",
      "quantity": 5,
      "pinCode": "560001",
      "images": [
        {
          "url": "https://res.cloudinary.com/...",
          "public_id": "marketplace/image1",
          "aiAnalysis": {
            "label": "cloth",
            "confidence": 89.5,
            "status": "usable"
          }
        }
      ],
      "seller": {
        "_id": "64a1b2c3d4e5f6789013",
        "username": "eco_crafter",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://res.cloudinary.com/...",
        "userType": "individual"
      },
      "tags": ["recycled", "eco-friendly"],
      "category": "textiles",
      "views": 25,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### Create Marketplace Item

```http
POST /api/marketplace
```

**Request Body:**
```json
{
  "title": "Cotton Fabric Scraps",
  "description": "High-quality cotton fabric scraps perfect for crafting",
  "quantity": 5,
  "materialType": "cloth",
  "pinCode": "560001",
  "price": 150,
  "condition": "good",
  "images": [
    {
      "url": "https://res.cloudinary.com/...",
      "public_id": "marketplace/image1"
    }
  ],
  "tags": ["recycled", "eco-friendly"],
  "category": "textiles",
  "dimensions": {
    "length": 100,
    "width": 50,
    "height": 2,
    "weight": 0.5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marketplace item created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789012",
    "title": "Cotton Fabric Scraps",
    // ... full item object
  }
}
```

**Error Response (AI Analysis Failure):**
```json
{
  "success": false,
  "message": "Image quality issues detected. Please upload clearer images.",
  "warnings": [
    {
      "imageUrl": "https://res.cloudinary.com/...",
      "issue": "blurry",
      "confidence": 45.2,
      "message": "Image quality issue detected: blurry (confidence: 45.2%)"
    }
  ],
  "blockPost": true
}
```

#### Get Single Marketplace Item

```http
GET /api/marketplace/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64a1b2c3d4e5f6789012",
    "title": "Cotton Fabric Scraps",
    // ... full item object with populated seller and interested buyers
    "interestedBuyers": [
      {
        "buyer": {
          "_id": "64a1b2c3d4e5f6789014",
          "username": "buyer1",
          "firstName": "Jane",
          "lastName": "Smith"
        },
        "message": "I'm interested in purchasing this item",
        "contactInfo": {
          "phone": "9876543210",
          "email": "jane@example.com"
        },
        "createdAt": "2024-01-16T09:00:00Z"
      }
    ]
  }
}
```

#### Update Marketplace Item

```http
PUT /api/marketplace/:id
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "price": 200,
  "status": "sold"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    // ... updated item object
  }
}
```

#### Delete Marketplace Item

```http
DELETE /api/marketplace/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Marketplace item deleted successfully"
}
```

### User Interactions

#### Express Interest

```http
POST /api/marketplace/:id/interest
```

**Request Body:**
```json
{
  "message": "I'm interested in purchasing this item for my project",
  "contactInfo": {
    "phone": "9876543210",
    "email": "buyer@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Interest expressed successfully",
  "data": {
    // ... updated item with new interested buyer
  }
}
```

#### Get My Marketplace Items

```http
GET /api/marketplace/my-items
```

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789012",
      // ... user's items with interested buyers populated
    }
  ]
}
```

### Admin Endpoints

#### Get Pending Review Items (Admin Only)

```http
GET /api/marketplace/admin/pending-review
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6789015",
      "title": "Flagged Item",
      "status": "pending_review",
      "reviewStatus": "pending",
      "images": [
        {
          "url": "https://res.cloudinary.com/...",
          "aiAnalysis": {
            "label": "unknown",
            "confidence": 25.3,
            "status": "suspicious"
          }
        }
      ],
      // ... rest of item data
    }
  ]
}
```

#### Review Marketplace Item (Admin Only)

```http
PUT /api/marketplace/admin/:id/review
```

**Request Body:**
```json
{
  "action": "approve",
  "moderationNotes": "Item approved after manual review"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Item approved successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6789015",
    "reviewStatus": "approved",
    "status": "active",
    "moderationNotes": "Item approved after manual review"
  }
}
```

## AI Image Analysis API

### Base URL
```
http://localhost:5000
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "EcoLoop AI Image Analysis",
  "model": "MobileNetV2",
  "version": "1.0.0"
}
```

### Analyze Single Image

```http
POST /predict
```

**Request Body:**
```json
{
  "image_url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample.jpg"
}
```

**Response:**
```json
{
  "label": "cloth",
  "raw_label": "jersey",
  "confidence": 89.5,
  "status": "usable",
  "quality_analysis": {
    "quality_score": 85,
    "status": "usable",
    "issues": [],
    "metrics": {
      "blur_score": 250.5,
      "brightness": 128.4,
      "dimensions": "800x600"
    }
  },
  "classification": {
    "label": "cloth",
    "confidence": 89.5,
    "all_predictions": [
      {
        "label": "jersey",
        "confidence": 89.5
      },
      {
        "label": "velvet",
        "confidence": 5.2
      }
    ]
  },
  "suspicious_analysis": {
    "is_suspicious": false,
    "indicators": [],
    "risk_level": "low"
  },
  "recommendations": ["Image quality is good"]
}
```

### Analyze Multiple Images

```http
POST /analyze-batch
```

**Request Body:**
```json
{
  "image_urls": [
    "https://res.cloudinary.com/your-cloud/image1.jpg",
    "https://res.cloudinary.com/your-cloud/image2.jpg"
  ]
}
```

**Response:**
```json
{
  "batch_results": [
    {
      "index": 0,
      "url": "https://res.cloudinary.com/your-cloud/image1.jpg",
      "result": {
        "label": "cloth",
        "confidence": 89.5,
        "status": "usable"
      }
    },
    {
      "index": 1,
      "url": "https://res.cloudinary.com/your-cloud/image2.jpg",
      "result": {
        "label": "wood",
        "confidence": 75.2,
        "status": "usable"
      }
    }
  ],
  "total_processed": 2,
  "status": "completed"
}
```

## Data Models

### MarketplaceItem Schema

```javascript
{
  seller: ObjectId, // Reference to User
  title: String, // Max 100 characters
  description: String, // Max 500 characters
  quantity: Number, // Min 1
  materialType: String, // Enum: cloth, wood, metal, plastic, glass, paper, electronics, fabric, leather, other
  pinCode: String, // 6 digits
  price: Number, // Min 0
  currency: String, // Default: INR
  condition: String, // Enum: new, like-new, good, fair, poor
  images: [{
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
    aiAnalysis: {
      label: String,
      confidence: Number,
      status: String, // usable, blurry, low_quality, suspicious
      qualityScore: Number
    }
  }],
  status: String, // active, sold, inactive, pending_review, rejected
  views: Number,
  interestedBuyers: [{
    buyer: ObjectId, // Reference to User
    message: String,
    contactInfo: {
      phone: String,
      email: String
    },
    createdAt: Date
  }],
  tags: [String], // recycled, upcycled, sustainable, eco-friendly, handmade, vintage, organic, biodegradable
  category: String, // raw-materials, finished-goods, tools, equipment, craft-supplies, textiles, furniture, electronics
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: String // cm, inch, meter
  },
  availableFrom: Date,
  availableUntil: Date,
  moderationNotes: String,
  reviewStatus: String, // approved, pending, rejected
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Server error |

## Rate Limiting

- **General API**: 100 requests per minute per user
- **Image Upload**: 10 uploads per minute per user
- **AI Analysis**: 20 requests per minute per user

## Best Practices

1. **Image Upload**:
   - Use high-quality images (min 300x300px)
   - Keep file sizes under 5MB
   - Use common formats (JPEG, PNG, WebP)

2. **Error Handling**:
   - Always check the `success` field in responses
   - Handle AI service unavailability gracefully
   - Implement retry logic for failed requests

3. **Performance**:
   - Use pagination for large datasets
   - Cache frequently accessed data
   - Compress images before upload

4. **Security**:
   - Validate all input data
   - Use HTTPS in production
   - Implement proper authentication checks
