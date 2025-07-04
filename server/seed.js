import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import User from './models/User.js';
import Post from './models/Post.js';
import Connection from './models/Connection.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const usersData = [
  {
    username: 'sarla_patel',
    email: 'sarla@ecoloop.com',
    password: 'password123',
    firstName: 'Sarla',
    lastName: 'Patel',
    userType: 'individual',
    avatar: '/images/avtars/Sarla.png',
    bio: 'Sustainability consultant passionate about circular economy and waste reduction. Helping businesses transition to zero-waste operations.',
    location: 'Mumbai, India',
    interests: ['recycling', 'zero-waste'],
    skills: ['Waste Management', 'Sustainability Consulting', 'Circular Economy'],
    isVerified: true
  },
  {
    username: 'ravi_kumar',
    email: 'ravi@greenkraft.com',
    password: 'password123',
    firstName: 'Ravi',
    lastName: 'Kumar',
    userType: 'organization',
    avatar: '/images/avtars/Male1.png',
    bio: 'Founder of GreenKraft Studios - Creating sustainable packaging solutions that protect both products and planet.',
    location: 'Delhi, India',
    interests: ['recycling', 'green-tech'],
    skills: ['Sustainable Packaging', 'Product Design', 'Biodegradable Materials'],
    organization: {
      name: 'GreenKraft Studios',
      website: 'www.greenkraft.com',
      industry: 'Packaging',
      size: 'medium'
    },
    isVerified: true
  },
  {
    username: 'meera_textiles',
    email: 'meera@meeratextiles.com',
    password: 'password123',
    firstName: 'Meera',
    lastName: 'Sharma',
    userType: 'organization',
    avatar: '/images/avtars/Female1.png',
    bio: 'CEO of Meera Textiles - Sustainable fashion for conscious consumers. Transforming the textile industry one thread at a time.',
    location: 'Bangalore, India',
    interests: ['sustainable-fashion', 'recycling'],
    skills: ['Sustainable Fashion', 'Textile Recycling', 'Eco-friendly Dyes'],
    organization: {
      name: 'Meera Textiles',
      website: 'www.meeratextiles.com',
      industry: 'Fashion',
      size: 'large'
    },
    isVerified: true
  },
  {
    username: 'priya_singh',
    email: 'priya@ecoinnovator.com',
    password: 'password123',
    firstName: 'Priya',
    lastName: 'Singh',
    userType: 'individual',
    avatar: '/images/avtars/Female2.png',
    bio: 'Environmental scientist and eco-entrepreneur. Building solutions for a sustainable future through innovation and collaboration.',
    location: 'Chennai, India',
    interests: ['green-tech', 'renewable-energy'],
    skills: ['Environmental Science', 'Renewable Energy', 'Solar Technology'],
    isVerified: true
  },
  {
    username: 'amit_verma',
    email: 'amit@organicfarms.in',
    password: 'password123',
    firstName: 'Amit',
    lastName: 'Verma',
    userType: 'organization',
    avatar: '/images/avtars/Male2.png',
    bio: 'Managing Director at Organic Farms India - Promoting sustainable agriculture and organic farming practices across the country.',
    location: 'Pune, India',
    interests: ['organic-farming', 'clean-water'],
    skills: ['Organic Farming', 'Sustainable Agriculture', 'Water Conservation'],
    organization: {
      name: 'Organic Farms India',
      website: 'www.organicfarms.in',
      industry: 'Agriculture',
      size: 'large'
    },
    isVerified: true
  },
  {
    username: 'neha_gupta',
    email: 'neha@ecotourism.co',
    password: 'password123',
    firstName: 'Neha',
    lastName: 'Gupta',
    userType: 'individual',
    avatar: '/images/avtars/Female1.png',
    bio: 'Eco-tourism specialist and travel blogger. Exploring sustainable travel destinations and promoting responsible tourism.',
    location: 'Goa, India',
    interests: ['eco-tourism', 'clean-water'],
    skills: ['Eco-tourism', 'Sustainable Travel', 'Community Development'],
    isVerified: true
  },
  {
    username: 'vikram_tech',
    email: 'vikram@greenstartup.tech',
    password: 'password123',
    firstName: 'Vikram',
    lastName: 'Sharma',
    userType: 'organization',
    avatar: '/images/avtars/Male1.png',
    bio: 'CTO at GreenStartup - Developing cutting-edge green technology solutions for a sustainable tomorrow.',
    location: 'Hyderabad, India',
    interests: ['green-tech', 'renewable-energy'],
    skills: ['Green Technology', 'IoT Solutions', 'Energy Management'],
    organization: {
      name: 'GreenStartup',
      website: 'www.greenstartup.tech',
      industry: 'Technology',
      size: 'startup'
    },
    isVerified: true
  },
  {
    username: 'anita_recycling',
    email: 'anita@wastewise.org',
    password: 'password123',
    firstName: 'Anita',
    lastName: 'Reddy',
    userType: 'organization',
    avatar: '/images/avtars/Female2.png',
    bio: 'Founder of WasteWise - Revolutionizing waste management through innovative recycling solutions and community education.',
    location: 'Kolkata, India',
    interests: ['recycling', 'zero-waste'],
    skills: ['Waste Management', 'Recycling Technology', 'Community Outreach'],
    organization: {
      name: 'WasteWise',
      website: 'www.wastewise.org',
      industry: 'Waste Management',
      size: 'medium'
    },
    isVerified: true
  },
  {
    username: 'rajesh_energy',
    email: 'rajesh@solarpower.co',
    password: 'password123',
    firstName: 'Rajesh',
    lastName: 'Malhotra',
    userType: 'organization',
    avatar: '/images/avtars/Male2.png',
    bio: 'CEO at SolarPower Solutions - Making renewable energy accessible to every household and business in India.',
    location: 'Ahmedabad, India',
    interests: ['renewable-energy', 'green-tech'],
    skills: ['Solar Energy', 'Renewable Energy', 'Energy Consulting'],
    organization: {
      name: 'SolarPower Solutions',
      website: 'www.solarpower.co',
      industry: 'Energy',
      size: 'large'
    },
    isVerified: true
  },
  {
    username: 'divya_fashion',
    email: 'divya@ecofashion.in',
    password: 'password123',
    firstName: 'Divya',
    lastName: 'Kapoor',
    userType: 'individual',
    avatar: '/images/avtars/Female1.png',
    bio: 'Sustainable fashion designer and influencer. Creating beautiful clothing that respects both people and planet.',
    location: 'Jaipur, India',
    interests: ['sustainable-fashion', 'recycling'],
    skills: ['Sustainable Fashion Design', 'Textile Art', 'Eco-friendly Materials'],
    isVerified: true
  }
];

const postsData = [
  {
    content: 'Just completed a comprehensive waste audit for a local restaurant chain! They reduced waste by 60% and saved ₹50,000 monthly. The power of sustainable practices! 🌱♻️',
    authorUsername: 'sarla_patel',
    category: 'achievement',
    tags: ['recycling', 'zero-waste'],
    location: 'Mumbai, India',
    impact: {
      carbonSaved: 2.5,
      wasteReduced: 500,
      energySaved: 0,
      peopleReached: 150
    }
  },
  {
    content: 'Excited to announce our new biodegradable packaging line! Made from agricultural waste and completely compostable. This could revolutionize the packaging industry! 📦🌿',
    authorUsername: 'ravi_kumar',
    category: 'project',
    tags: ['recycling', 'green-tech'],
    location: 'Delhi, India',
    impact: {
      carbonSaved: 5.2,
      wasteReduced: 1000,
      energySaved: 0,
      peopleReached: 500
    }
  },
  {
    content: 'Launching our Spring Collection made entirely from recycled materials! Each piece tells a story of sustainability. Fashion can be beautiful AND responsible! 👗💚',
    authorUsername: 'meera_textiles',
    category: 'project',
    tags: ['sustainable-fashion'],
    location: 'Bangalore, India',
    impact: {
      carbonSaved: 3.8,
      wasteReduced: 800,
      energySaved: 0,
      peopleReached: 300
    }
  },
  {
    content: 'Successfully installed solar panels in 10 schools across Chennai! These schools will now generate their own clean energy and educate students about renewable energy. ☀️📚',
    authorUsername: 'priya_singh',
    category: 'achievement',
    tags: ['renewable-energy'],
    location: 'Chennai, India',
    impact: {
      carbonSaved: 15.5,
      wasteReduced: 0,
      energySaved: 2500,
      peopleReached: 2000
    }
  },
  {
    content: 'Our organic farming initiative has transformed 500 acres of land! Using traditional methods combined with modern sustainable practices. The results are incredible! 🌾🌱',
    authorUsername: 'amit_verma',
    category: 'achievement',
    tags: ['organic-farming', 'clean-water'],
    location: 'Pune, India',
    impact: {
      carbonSaved: 8.3,
      wasteReduced: 200,
      energySaved: 0,
      peopleReached: 800
    }
  },
  {
    content: 'Just discovered an amazing eco-resort in Goa that runs entirely on renewable energy! Perfect example of sustainable tourism. Sharing this gem with fellow travelers! 🏖️🌿',
    authorUsername: 'neha_gupta',
    category: 'tip',
    tags: ['eco-tourism', 'clean-water'],
    location: 'Goa, India',
    impact: {
      carbonSaved: 0,
      wasteReduced: 0,
      energySaved: 0,
      peopleReached: 100
    }
  },
  {
    content: 'Our new IoT-based energy management system is live! Real-time monitoring and optimization of energy consumption. This is the future of smart, sustainable buildings! 🏢⚡',
    authorUsername: 'vikram_tech',
    category: 'project',
    tags: ['green-tech', 'renewable-energy'],
    location: 'Hyderabad, India',
    impact: {
      carbonSaved: 12.7,
      wasteReduced: 0,
      energySaved: 1800,
      peopleReached: 1200
    }
  },
  {
    content: 'Community recycling drive was a huge success! Collected 2 tons of recyclable materials and educated 500+ families about proper waste segregation. Every small step counts! ♻️👥',
    authorUsername: 'anita_recycling',
    category: 'achievement',
    tags: ['recycling', 'zero-waste'],
    location: 'Kolkata, India',
    impact: {
      carbonSaved: 4.1,
      wasteReduced: 2000,
      energySaved: 0,
      peopleReached: 500
    }
  },
  {
    content: 'Installed solar panels for 100 rural households! These families now have reliable electricity and reduced their energy bills by 80%. Clean energy for all! ☀️🏠',
    authorUsername: 'rajesh_energy',
    category: 'achievement',
    tags: ['renewable-energy', 'green-tech'],
    location: 'Ahmedabad, India',
    impact: {
      carbonSaved: 20.3,
      wasteReduced: 0,
      energySaved: 3500,
      peopleReached: 400
    }
  },
  {
    content: 'My latest collection features fabrics dyed with natural plant extracts! No harmful chemicals, just beautiful colors from nature. Sustainable fashion is the way forward! 🎨🌿',
    authorUsername: 'divya_fashion',
    category: 'project',
    tags: ['sustainable-fashion', 'recycling'],
    location: 'Jaipur, India',
    impact: {
      carbonSaved: 2.9,
      wasteReduced: 300,
      energySaved: 0,
      peopleReached: 250
    }
  }
];

const connectionsData = [
  // Core sustainability network
  ['sarla_patel', 'ravi_kumar'],
  ['sarla_patel', 'meera_textiles'],
  ['sarla_patel', 'anita_recycling'],
  ['ravi_kumar', 'meera_textiles'],
  ['ravi_kumar', 'vikram_tech'],
  ['meera_textiles', 'divya_fashion'],
  ['meera_textiles', 'priya_singh'],
  
  // Energy and tech connections
  ['priya_singh', 'rajesh_energy'],
  ['priya_singh', 'vikram_tech'],
  ['rajesh_energy', 'vikram_tech'],
  
  // Agriculture and tourism
  ['amit_verma', 'neha_gupta'],
  ['amit_verma', 'sarla_patel'],
  ['neha_gupta', 'divya_fashion'],
  
  // Cross-industry collaborations
  ['anita_recycling', 'ravi_kumar'],
  ['anita_recycling', 'meera_textiles'],
  ['vikram_tech', 'rajesh_energy'],
  ['divya_fashion', 'anita_recycling'],
  ['neha_gupta', 'priya_singh'],
  ['amit_verma', 'rajesh_energy']
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear collections
    await User.deleteMany({});
    await Post.deleteMany({});
    await Connection.deleteMany({});
    console.log('Cleared existing data');

    // Create users (passwords will be hashed by pre-save middleware)
    const createdUsers = [];
    for (const userData of usersData) {
      const user = new User(userData);
      await user.save(); // This will trigger the password hashing
      createdUsers.push(user);
    }
    console.log('Seeded users');

    // Map usernames to user IDs
    const userMap = {};
    createdUsers.forEach(user => {
      userMap[user.username] = user._id;
    });

    // Create posts
    const postsToInsert = postsData.map(post => ({
      ...post,
      author: userMap[post.authorUsername],
    }));
    await Post.insertMany(postsToInsert);
    console.log('Seeded posts');

    // Create connections
    for (const [username1, username2] of connectionsData) {
      const user1 = userMap[username1];
      const user2 = userMap[username2];
      if (user1 && user2) {
        await Connection.create({ 
          requester: user1, 
          recipient: user2,
          status: 'accepted'
        });
        await User.findByIdAndUpdate(user1, { $addToSet: { connections: user2 } });
        await User.findByIdAndUpdate(user2, { $addToSet: { connections: user1 } });
      }
    }
    console.log('Seeded connections');

    // Write credentials to seeded_users.txt
    const credentials = createdUsers.map(u => `Email: ${u.email}\nPassword: ${u.password}\n`).join('\n');
    const txtPath = path.join(process.cwd(), 'seeded_users.txt');
    try {
      fs.writeFileSync(txtPath, credentials, 'utf8');
      console.log('Wrote credentials to seeded_users.txt at:', txtPath);
    } catch (fileErr) {
      console.error('Failed to write seeded_users.txt:', fileErr);
    }

    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed(); 