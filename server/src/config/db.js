import mongoose from 'mongoose';

export async function connectDB() {
  const isProduction = process.env.NODE_ENV === 'production';
  const uri = process.env.MONGODB_URI;

  if (isProduction && !uri) {
    console.error('[Database Fatal] MONGODB_URI environment variable is required in production.');
    process.exit(1);
  }

  const effectiveUri = uri || 'mongodb://127.0.0.1:27017/talentflow_cyphermatrix';
  const targetDbName = (process.env.MONGODB_DB_NAME || 'talentflow_cyphermatrix').trim();

  try {
    const conn = await mongoose.connect(effectiveUri, {
      dbName: targetDbName,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[Database Error] MongoDB connection failed: ${err.message}`);
    if (isProduction) {
      console.error('[Database Fatal] Failed to connect to MongoDB in production environment. Exiting.');
      process.exit(1);
    }
    console.warn('[Database] Continuing in limited mode. Ensure MongoDB is running at', effectiveUri);
  }
}
