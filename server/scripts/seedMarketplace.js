import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import MarketplaceItem from '../models/MarketplaceItem.js';

dotenv.config();

const sampleItems = [
  {
    title: "Recycled Cardboard Boxes - Pack of 20",
    description: "High-quality recycled cardboard boxes perfect for moving or storage. Various sizes available. Eco-friendly and sturdy.",
    price: 150,
    currency: "INR",
    materialType: "cardboard",
    condition: "like-new",
    quantity: 50,
    pinCode: "560001",
    category: "packaging",
    tags: ["recycled", "cardboard", "boxes", "eco-friendly"],
    images: [{
      url: "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=500",
      public_id: "sample_cardboard_boxes"
    }]
  },
  {
    title: "Plastic Bottles for Upcycling - 100 pieces",
    description: "Clean plastic bottles suitable for creative upcycling projects. Mix of different sizes and colors.",
    price: 75,
    currency: "INR",
    materialType: "plastic",
    condition: "good",
    quantity: 25,
    pinCode: "560002",
    category: "upcycling",
    tags: ["plastic", "bottles", "upcycling", "craft"],
    images: [{
      url: "https://images.unsplash.com/photo-1572776685600-aca8c3456337?w=500",
      public_id: "sample_plastic_bottles"
    }]
  },
  {
    title: "Reclaimed Wood Planks",
    description: "Beautiful reclaimed wood planks from old furniture. Perfect for DIY projects and sustainable building.",
    price: 300,
    currency: "INR",
    materialType: "wood",
    condition: "good",
    quantity: 15,
    pinCode: "560003",
    category: "building-materials",
    tags: ["wood", "reclaimed", "sustainable", "diy"],
    images: [{
      url: "https://images.unsplash.com/photo-1419064642531-e575728395f2?w=500",
      public_id: "sample_wood_planks"
    }]
  },
  {
    title: "Organic Compost - 5kg bag",
    description: "Premium organic compost made from kitchen waste. Rich in nutrients for your garden.",
    price: 120,
    currency: "INR",
    materialType: "organic",
    condition: "new",
    quantity: 40,
    pinCode: "560004",
    category: "gardening",
    tags: ["compost", "organic", "gardening", "soil"],
    images: [{
      url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500",
      public_id: "sample_compost"
    }]
  },
  {
    title: "Scrap Metal Collection - 10kg",
    description: "Assorted scrap metal pieces suitable for recycling or art projects. Cleaned and sorted.",
    price: 250,
    currency: "INR",
    materialType: "metal",
    condition: "fair",
    quantity: 8,
    pinCode: "560005",
    category: "recycling",
    tags: ["metal", "scrap", "recycling", "art"],
    images: [{
      url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500",
      public_id: "sample_scrap_metal"
    }]
  }
];

async function seedMarketplace() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find or create a sample seller
    let seller = await User.findOne({ email: 'seller@example.com' });
    
    if (!seller) {
      seller = await User.create({
        username: 'ecoseller',
        email: 'seller@example.com',
        password: 'password123', // This will be hashed
        firstName: 'Eco',
        lastName: 'Seller',
        userType: 'organization',
        isEmailVerified: true,
        organization: {
          name: 'Green Materials Co.',
          industry: 'Recycling',
          size: 'small'
        }
      });
      console.log('Created sample seller');
    }

    // Clear existing sample items
    await MarketplaceItem.deleteMany({ 'seller': seller._id });
    console.log('Cleared existing sample items');

    // Create sample marketplace items
    const itemsWithSeller = sampleItems.map(item => ({
      ...item,
      seller: seller._id,
      status: 'active',
      reviewStatus: 'approved'
    }));

    const createdItems = await MarketplaceItem.insertMany(itemsWithSeller);
    console.log(`Created ${createdItems.length} sample marketplace items`);

    console.log('Marketplace seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error seeding marketplace:', error);
    process.exit(1);
  }
}

seedMarketplace();
