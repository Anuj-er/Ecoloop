import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload.js';
import { uploadMultipleImages } from '../utils/cloudinary.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

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

export default router; 