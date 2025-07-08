# EcoLoop AI Image Analysis Service

A Flask-based microservice for analyzing marketplace item images using computer vision and machine learning.

## Features

- **Image Quality Assessment**: Detects blurry, dark, or low-quality images
- **Object Classification**: Uses MobileNetV2 to classify items into marketplace categories
- **Suspicious Content Detection**: Flags potentially inappropriate content
- **Batch Processing**: Analyze multiple images at once
- **RESTful API**: Easy integration with the main EcoLoop application

## API Endpoints

### Health Check
```
GET /health
```

### Single Image Analysis
```
POST /predict
Content-Type: application/json

{
  "image_url": "https://example.com/image.jpg"
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
  ]
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

- `usable`: Image is good quality and appropriate for marketplace
- `blurry`: Image is too blurry
- `low_quality`: Image quality is poor (too dark, too small, etc.)
- `suspicious`: Image flagged for manual review
- `low_confidence`: Classification confidence is very low

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
