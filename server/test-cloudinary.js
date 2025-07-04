import dotenv from 'dotenv';
import cloudinary from './config/cloudinary.js';

dotenv.config();

async function testCloudinary() {
  try {
    console.log('Testing Cloudinary configuration...');
    
    // Check if environment variables are set
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    console.log('Environment variables:');
    console.log('- Cloud Name:', cloudName ? '✅ Set' : '❌ Missing');
    console.log('- API Key:', apiKey ? '✅ Set' : '❌ Missing');
    console.log('- API Secret:', apiSecret ? '✅ Set' : '❌ Missing');
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Missing Cloudinary environment variables!');
      console.log('Please add the following to your .env file:');
      console.log('CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('CLOUDINARY_API_KEY=your_api_key');
      console.log('CLOUDINARY_API_SECRET=your_api_secret');
      return;
    }
    
    // Test Cloudinary connection
    console.log('\nTesting Cloudinary connection...');
    
    // Try to get account info (this will verify credentials)
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!');
    console.log('Response:', result);
    
    console.log('\n🎉 Cloudinary is properly configured and working!');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Check your Cloudinary credentials in .env file');
    console.log('2. Verify your Cloudinary account is active');
    console.log('3. Check your internet connection');
  }
}

testCloudinary(); 