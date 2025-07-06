import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Check if MongoDB URI is configured
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI;

    if (!mongoURI) {
      console.error('❌ MongoDB URI not configured!');
      console.error('Please create a .env file with MONGODB_URI or MONGODB_URI_PROD');
      console.error('See env.example for the required format');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔧 Troubleshooting tips:');
      console.error('1. Check your internet connection');
      console.error('2. Verify your MongoDB Atlas cluster is running');
      console.error('3. Ensure your IP address is whitelisted in MongoDB Atlas');
      console.error('4. Check if your connection string is correct');
      console.error('5. Try using a different DNS server');
    }
    
    if (error.message.includes('Authentication failed')) {
      console.error('\n🔐 Authentication issues:');
      console.error('1. Check your username and password in the connection string');
      console.error('2. Ensure your MongoDB Atlas user has the correct permissions');
      console.error('3. Verify the database name in your connection string');
    }
    
    process.exit(1);
  }
};

export default connectDB; 