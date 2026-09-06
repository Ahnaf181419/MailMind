import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let memoryServer: MongoMemoryServer | null = null;
let authClient: MongoClient | null = null;

async function resolveUri(): Promise<{ uri: string; source: 'atlas' | 'memory' }> {
  if (env.MONGODB_URI) {
    return { uri: env.MONGODB_URI, source: 'atlas' };
  }
  memoryServer = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
    instance: { dbName: env.MONGODB_DB_NAME },
  });
  return { uri: memoryServer.getUri(), source: 'memory' };
}

export async function connectDb(): Promise<void> {
  const { uri, source } = await resolveUri();

  await mongoose.connect(uri, { dbName: env.MONGODB_DB_NAME });
  logger.info({ db: env.MONGODB_DB_NAME, source }, 'MongoDB connected (mongoose)');

  authClient = new MongoClient(uri, { serverSelectionTimeoutMS: 30_000 });
  await authClient.connect();
  logger.info({ db: env.MONGODB_DB_NAME }, 'MongoDB connected (auth client)');
}

export async function disconnectDb(): Promise<void> {
  if (authClient) await authClient.close();
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

export function getAuthClient(): MongoClient {
  if (!authClient) throw new Error('DB not connected — call connectDb() first');
  return authClient;
}

export function dbConnectionState(): 'connected' | 'disconnected' {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
}
