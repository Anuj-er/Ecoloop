import { detectPostFraud } from '../utils/fraudDetection.js';
import { asyncHandler } from './errorHandler.js';

/**
 * Middleware to detect fraud in posts
 * Runs fraud detection and attaches results to req.fraudAnalysis
 */
export const fraudDetection = asyncHandler(async (req, res, next) => {
  // Only run fraud detection for post creation and updates
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return next();
  }

  try {
    const fraudAnalysis = await detectPostFraud(req.body, req.user._id);
    
    // Attach fraud analysis to request object for controller use
    req.fraudAnalysis = fraudAnalysis;
    
    // If post is highly suspicious, flag it
    if (fraudAnalysis.isSuspicious) {
      console.log(`[FRAUD DETECTION] Suspicious post detected: ${JSON.stringify(fraudAnalysis.fraudFlags)}`);
    }
    
    next();
  } catch (error) {
    console.error('Fraud detection error:', error);
    // Continue even if fraud detection fails
    next();
  }
});
