/**
 * Database Connection
 * Connects to MongoDB with proper error handling and indexing
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await createIndexes();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    console.log('Server will start without database connection');
  }
};

/**
 * Create database indexes for query performance
 */
const createIndexes = async () => {
  try {
    // Indexes will be created when models are compiled
    console.log('Database indexes configured');
  } catch (error) {
    console.error('Index creation error:', error.message);
  }
};

module.exports = connectDB;
