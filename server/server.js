import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/post.js';
import connectionRoutes from './routes/connection.js';
import notificationRoutes from './routes/notifications.js';
import uploadRoutes from './routes/upload.js';
import adminRoutes from './routes/admin.js';
import debugRoutes from './routes/debug.js';
import marketplaceRoutes from './routes/marketplace.js';

dotenv.config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000']
    : process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(helmet());
app.use(compression());
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Eco Loop AI Connect API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      connections: '/api/connections',
      notifications: '/api/notifications',
      upload: '/api/upload',
      marketplace: '/api/marketplace'
    },
    status: 'Server is running!'
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Not found and error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});