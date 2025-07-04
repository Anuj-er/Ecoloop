import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes
export const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Middleware to check if user is verified
export const requireVerification = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({ 
      message: 'Account verification required',
      code: 'VERIFICATION_REQUIRED'
    });
  }
  next();
};

// Middleware to check if user is active
export const requireActive = async (req, res, next) => {
  if (!req.user.isActive) {
    return res.status(403).json({ 
      message: 'Account is deactivated',
      code: 'ACCOUNT_DEACTIVATED'
    });
  }
  next();
};

// Middleware to check user role (optional)
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Middleware to check if user owns resource or is admin
export const requireOwnership = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resource = await resourceModel.findById(req.params.id);
      
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      // Check if user owns the resource or is admin
      if (resource.author && resource.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Not authorized to access this resource',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};

// Generate JWT token
export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
}; 