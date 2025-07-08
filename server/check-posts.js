import mongoose from 'mongoose';
import Post from './models/Post.js';

// Connect to MongoDB
await mongoose.connect('mongodb+srv://sarladevineni:sarla12@cluster0.a8mcl9t.mongodb.net/EcoLoop?retryWrites=true&w=majority');

try {
  // Get all posts
  const allPosts = await Post.find({}).select('content status fraudAnalysis author');
  console.log(`Total posts in database: ${allPosts.length}`);
  
  // Get flagged posts
  const flaggedPosts = await Post.find({ status: 'flagged' }).select('content status fraudAnalysis');
  console.log(`Flagged posts: ${flaggedPosts.length}`);
  
  // Get posts without fraud analysis
  const postsWithoutFraud = await Post.find({ 
    $or: [
      { 'fraudAnalysis.fraudScore': { $exists: false } },
      { 'fraudAnalysis.fraudScore': 0 }
    ]
  }).select('content status fraudAnalysis');
  console.log(`Posts without fraud analysis: ${postsWithoutFraud.length}`);
  
  // Show sample posts
  console.log('\nSample posts:');
  allPosts.slice(0, 3).forEach((post, index) => {
    console.log(`${index + 1}. Status: ${post.status}, Content: ${post.content.substring(0, 50)}...`);
    console.log(`   Fraud Score: ${post.fraudAnalysis?.fraudScore || 'not set'}`);
  });
  
} catch (error) {
  console.error('Error:', error);
} finally {
  mongoose.disconnect();
}
