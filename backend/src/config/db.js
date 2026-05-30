import mongoose from 'mongoose';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  // Dev convenience: run a throwaway in-memory MongoDB so the app works with
  // zero database setup. Data does NOT persist across restarts. Never use in prod.
  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log('✓ In-memory MongoDB started (USE_MEMORY_DB=true — data is not persisted)');
    return;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(uri);
  console.log('✓ MongoDB connected');
}
