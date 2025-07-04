import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

// Upload image to Cloudinary
export const uploadImage = async (file, folder = 'eco-loop') => {
  try {
    // If file is a base64 string, use it directly
    let uploadData = file;
    
    // If file is a File object or buffer, convert to base64
    if (file instanceof Buffer || (file && file.buffer)) {
      uploadData = `data:${file.mimetype || 'image/jpeg'};base64,${file.buffer.toString('base64')}`;
    } else if (file && typeof file === 'object' && file.data) {
      // Handle multer file object
      uploadData = `data:${file.mimetype || 'image/jpeg'};base64,${file.data.toString('base64')}`;
    }
    
    const result = await cloudinary.uploader.upload(uploadData, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

// Upload multiple images
export const uploadMultipleImages = async (files, folder = 'eco-loop') => {
  try {
    console.log('uploadMultipleImages called with', files.length, 'files');
    console.log('Files:', files.map(f => typeof f));
    
    const uploadPromises = files.map((file, index) => {
      console.log(`Uploading file ${index + 1}:`, typeof file);
      return uploadImage(file, folder);
    });
    const results = await Promise.all(uploadPromises);
    console.log('All uploads completed successfully');
    return results;
  } catch (error) {
    console.error('Multiple images upload error:', error);
    throw new Error('Failed to upload multiple images');
  }
};

// Delete image from Cloudinary
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

// Delete multiple images
export const deleteMultipleImages = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteImage(publicId));
    const results = await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error('Multiple images delete error:', error);
    throw new Error('Failed to delete multiple images');
  }
};

// Generate optimized URL for different sizes
export const getOptimizedUrl = (publicId, options = {}) => {
  const {
    width = 800,
    height = 600,
    crop = 'limit',
    quality = 'auto',
    format = 'auto'
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop,
    quality,
    format,
    secure: true
  });
};

// Upload base64 image
export const uploadBase64Image = async (base64String, folder = 'eco-loop') => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    
    return {
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Base64 upload error:', error);
    throw new Error('Failed to upload base64 image');
  }
}; 