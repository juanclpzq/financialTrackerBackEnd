// db.js
import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI

export const connect = async () => {
  try {
    mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    throw err;
  }
};