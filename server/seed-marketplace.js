import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MarketplaceItem from './models/MarketplaceItem.js';
import User from './models/User.js';
import { connectDB } from './config/database.js';

// Load environment variables
dotenv.config();

// Connect to database
await connectDB();

const seedMarketplace = async () => {
  try {
    // Clear existing marketplace items
    await MarketplaceItem.deleteMany({});
    console.log('Cleared existing marketplace items');

    // Find a user to set as seller
    const users = await User.find().limit(5);
    if (users.length === 0) {
      console.error('No users found to assign as sellers. Run seed.js first');
      process.exit(1);
    }

    // Sample marketplace items
    const marketplaceItems = [
      {
        title: 'Recycled Cotton Fabric',
        description: 'High-quality recycled cotton fabric, perfect for crafting and sustainable fashion projects. Eco-friendly alternative to new cotton.',
        quantity: 10,
        materialType: 'fabric',
        pinCode: '400001',
        price: 500,
        currency: 'INR',
        condition: 'new',
        seller: users[0]._id,
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
            public_id: 'sample_recycled_cotton',
            aiAnalysis: {
              label: 'fabric',
              confidence: 95,
              status: 'usable',
              qualityScore: 80
            }
          }
        ],
        status: 'active',
        views: 12,
        tags: ['recycled', 'sustainable'],
        category: 'raw-materials',
      },
      {
        title: 'Reclaimed Wooden Planks',
        description: 'Beautiful reclaimed wooden planks from old furniture. Perfect for DIY projects or sustainable home decor. Each piece has unique character.',
        quantity: 5,
        materialType: 'wood',
        pinCode: '400002',
        price: 1200,
        currency: 'INR',
        condition: 'good',
        seller: users[1]._id,
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
            public_id: 'sample_wood_planks',
            aiAnalysis: {
              label: 'wood',
              confidence: 90,
              status: 'usable',
              qualityScore: 75
            }
          }
        ],
        status: 'active',
        views: 8,
        tags: ['upcycled', 'sustainable'],
        category: 'raw-materials',
      },
      {
        title: 'Scrap Metal Pieces for Art Projects',
        description: 'Collection of various metal scraps suitable for art and craft projects. Includes aluminum, copper and brass pieces of different sizes.',
        quantity: 20,
        materialType: 'metal',
        pinCode: '400003',
        price: 800,
        currency: 'INR',
        condition: 'fair',
        seller: users[2]._id,
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
            public_id: 'sample_metal_scraps',
            aiAnalysis: {
              label: 'metal',
              confidence: 85,
              status: 'usable',
              qualityScore: 70
            }
          }
        ],
        status: 'active',
        views: 15,
        tags: ['recycled', 'eco-friendly'],
        category: 'raw-materials',
      },
      {
        title: 'Upcycled Wooden Furniture',
        description: 'Beautiful coffee table made from reclaimed wood. Each piece has unique characteristics and natural wood grain patterns.',
        quantity: 1,
        materialType: 'wood',
        pinCode: '400004',
        price: 3500,
        currency: 'INR',
        condition: 'like-new',
        seller: users[0]._id,
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
            public_id: 'sample_furniture',
            aiAnalysis: {
              label: 'furniture',
              confidence: 92,
              status: 'usable',
              qualityScore: 85
            }
          }
        ],
        status: 'active',
        views: 25,
        tags: ['upcycled', 'handmade'],
        category: 'furniture',
      },
      {
        title: 'Recycled Glass Bottles for Crafting',
        description: 'Collection of clean, empty glass bottles in various colors and sizes. Perfect for DIY projects, vases, or candle holders.',
        quantity: 15,
        materialType: 'glass',
        pinCode: '400005',
        price: 300,
        currency: 'INR',
        condition: 'good',
        seller: users[3]._id,
        images: [
          {
            url: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
            public_id: 'sample_glass_bottles',
            aiAnalysis: {
              label: 'glass',
              confidence: 88,
              status: 'usable',
              qualityScore: 75
            }
          }
        ],
        status: 'active',
        views: 10,
        tags: ['recycled', 'eco-friendly'],
        category: 'craft-supplies',
      }
    ];

    // Insert marketplace items
    await MarketplaceItem.insertMany(marketplaceItems);
    console.log(`Successfully seeded ${marketplaceItems.length} marketplace items`);

  } catch (error) {
    console.error('Error seeding marketplace data:', error);
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run the seeding function
seedMarketplace();
