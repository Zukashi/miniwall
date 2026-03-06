import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB using the MONGO_URI environment variable.
 * Logs success or terminates the process on failure.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI as string;
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}
