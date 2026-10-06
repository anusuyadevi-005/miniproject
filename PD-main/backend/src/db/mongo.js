import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.set('strictQuery', false);
mongoose.set('bufferCommands', false);

let isConnected = false;

export async function connectMongoDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri || mongoUri.includes('cluster0.mongodb.net') || mongoUri.includes('<username>')) {
    console.log('ℹ️ MONGODB_URI is unconfigured or using placeholder. Application running with in-memory fallback.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      bufferCommands: false
    });
    isConnected = mongoose.connection.readyState === 1;
    console.log('✅ Connected successfully to MongoDB Atlas!');
    return true;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection error: ${err.message}. Application running with in-memory fallback.`);
    isConnected = false;
    return false;
  }
}

export function getMongoStatus() {
  return {
    isConnected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || 'Atlas / Local',
    dbName: mongoose.connection.name || 'asdse_db',
  };
}
