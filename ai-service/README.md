# EcoLoop AI Image Analysis Service

A Flask-based microservice for analyzing marketplace item images using computer vision and machine learning.

## Features

- **Image Quality Assessment**: Detects blurry, dark, or low-quality images
- **Material Classification**: Uses MobileNetV2 to identify recyclable materials
- **Document Detection**: Sophisticated detection of documents, IDs, and text-heavy content
- **Suspicious Content Detection**: Flags potentially inappropriate content
- **Context Detection**: Distinguishes between marketplace listings, profile photos, and posts
- **Admin Review System**: Clear accept/flag/reject status with reasons
- **Actionable Recommendations**: User-friendly guidance for improving images
- **Batch Processing**: Analyze multiple images at once
- **Testing Tools**: Built-in validation and diagnostics
- **RESTful API**: Easy integration with the main EcoLoop application

## API Endpoints

### Health Check
```
GET /health
```

### Marketplace Image Analysis
```
POST /predict
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg",
  "context": "marketplace",
  "admin_mode": false
}
```

### Profile Image Analysis
```
POST /analyze-profile
Content-Type: application/json

{
  "image_url": "https://example.com/profile.jpg",
  "admin_mode": false
}
```

### Post Image Analysis
```
POST /analyze-post
Content-Type: application/json

{
  "image_url": "https://example.com/post.jpg",
  "post_type": "general",
  "admin_mode": false
}
```

### Batch Image Analysis
```
POST /analyze-batch
Content-Type: application/json

{
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "context": "marketplace"
}
```

### Testing and Diagnostics
```
GET /test
```

Optional: Add a test image URL
```
GET /test?test_image_url=https://example.com/test.jpg
```

Or POST with a test image:
```
POST /test
Content-Type: application/json

{
  "test_image_url": "https://example.com/test.jpg"
}
```

## Response Format

```json
{
  "label": "cloth",
  "raw_label": "jersey",
  "confidence": 85.6,
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
    "confidence": 85.6,
    "all_predictions": [...]
  },
  "suspicious_analysis": {
    "is_suspicious": false,
    "indicators": [],
    "risk_level": "low"
  },
  "recommendations": ["Image quality is good"]
}
```

## Status Values

- `usable`: Image is acceptable and will be shown in the marketplace
- `pending_review`: Image is flagged for admin review (shown to user as "in review")
- `rejected`: Image is automatically rejected (not suitable for platform)

### Rejection Reasons

- `document_detected`: Image contains a document, ID card, or excessive text
- `inappropriate_content`: Image contains potentially inappropriate content
- `sensitive_information`: Image contains personally identifiable or sensitive information
- `non_recyclable`: Image doesn't appear to show a recyclable material

### Flag Reasons

- `too_dark`, `too_bright`, `too_small`, `too_blurry`: Quality issues
- `potential_suspicious`: Content that may be inappropriate but requires human review
- `low_confidence`: Classification confidence is very low
- `possible_non_recyclable`: May not be recyclable material
- `possible_document`: Has some document-like features but needs verification
- `context_mismatch`: Image doesn't match intended use context

## Installation

1. Install Python 3.8+ and pip
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the service:
   ```bash
   python app.py
   ```

## Environment Variables

- `PORT`: Port to run the service on (default: 5000)
- `FLASK_ENV`: Set to 'development' for debug mode
- `AI_SERVICE_URL`: Used by client applications to locate this service

## Testing Tools

### Simple Test Client

A command-line tool to test the service with individual images:

```bash
python test_client.py --service http://localhost:5000 --image https://example.com/image.jpg --endpoint predict
```

Options:
- `--service`: URL of the AI service (default: http://localhost:5000)
- `--image`: URL of the image to analyze
- `--endpoint`: Endpoint to test (predict, analyze-profile, analyze-post, test)

### Batch Test Runner

Tests multiple images across different categories and generates a detailed report:

```bash
python batch_test.py --service http://localhost:5000 --report test_results.csv
```

Options:
- `--service`: URL of the AI service (default: http://localhost:5000)
- `--report`: Path to save test results (default: ai_batch_test_results.csv)

## Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

## Integration with EcoLoop

The service is automatically called by the EcoLoop backend when users upload marketplace item images. The analysis results determine whether the item can be immediately listed or needs manual review.
