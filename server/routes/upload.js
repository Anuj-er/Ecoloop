import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.js';
import { uploadMultipleImages } from '../utils/cloudinary.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import axios from 'axios';

const router = express.Router();

// Configuration for AI image analysis service - same as in marketplaceController.js
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Helper function to analyze image with AI
const analyzeImageWithAI = async (imageUrl) => {
  try {
    console.log(`Sending image to AI service for analysis: ${imageUrl}`);
    
    const response = await axios.post(`${AI_SERVICE_URL}/predict`, {
      image_url: imageUrl
    }, {
      timeout: 15000, // 15 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('AI Analysis Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    
    // If AI service is unavailable, return a default "safe" response
    return {
      label: 'unknown',
      confidence: 50,
      status: 'usable',
      qualityScore: 75,
      error: 'AI service unavailable'
    };
  }
};

// @desc    Upload images to Cloudinary
// @route   POST /api/upload/images
// @access  Private
router.post('/images', 
  protect, 
  uploadMultiple, 
  handleUploadError,
  asyncHandler(async (req, res) => {
    console.log('Upload images endpoint called');
    console.log('Files received:', req.files ? req.files.length : 0);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    try {
      // Convert files to base64 strings for Cloudinary
      const files = req.files.map(file => {
        console.log('Processing file:', file.originalname, file.mimetype);
        const base64 = file.buffer.toString('base64');
        const dataURI = `data:${file.mimetype};base64,${base64}`;
        return dataURI;
      });

      console.log('Uploading', files.length, 'files to Cloudinary');
      // Upload to Cloudinary
      const uploadResults = await uploadMultipleImages(files, 'eco-loop/posts');
      console.log('Upload successful:', uploadResults.length, 'files');

      res.json({
        success: true,
        data: uploadResults
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload images'
      });
    }
  })
);

// @desc    Upload single image to Cloudinary
// @route   POST /api/upload/image
// @access  Private
router.post('/image', 
  protect, 
  uploadSingle, 
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const file = req.file;
      const base64 = file.buffer.toString('base64');
      const dataURI = `data:${file.mimetype};base64,${base64}`;

      // Upload to Cloudinary
      const uploadResult = await uploadMultipleImages([dataURI], 'eco-loop/avatars');

      res.json({
        success: true,
        data: uploadResult[0]
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image'
      });
    }
  })
);

// @desc    Analyze an image using AI
// @route   POST /api/upload/analyze/image
// @access  Private
router.post('/analyze/image', 
  protect,
  asyncHandler(async (req, res) => {
    const { image_url } = req.body;
    
    if (!image_url) {
      return res.status(400).json({
        success: false,
        message: 'No image URL provided'
      });
    }

    try {
      // Analyze with AI service
      const analysisResult = await analyzeImageWithAI(image_url);
      
      // Return analysis results
      res.json({
        success: true,
        ...analysisResult
      });
    } catch (error) {
      console.error('Image analysis error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze image',
        error: error.message
      });
    }
  })
);

export default router; 