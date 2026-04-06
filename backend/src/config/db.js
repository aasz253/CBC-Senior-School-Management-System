/**
 * Database Connection
 * Connects to MongoDB with proper error handling and indexing
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are default in Mongoose 6+ but explicit for clarity
      autoIndex: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Create indexes for performance after connection
    await createIndexes();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
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
