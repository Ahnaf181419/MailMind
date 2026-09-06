import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { getAuthClient } from './db.js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

type AuthInstance = ReturnType<typeof betterAuth>;

let _auth: AuthInstance | null = null;

export async function initAuth(): Promise<AuthInstance> {
  if (_auth) return _auth;
  const client = getAuthClient();
  const db = client.db(env.MONGODB_DB_NAME);
  const options: BetterAuthOptions = {
    database: mongodbAdapter(db),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map((s) => s.trim()),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 6,
    },
    user: {
      additionalFields: {
        role: { type: 'string', defaultValue: 'faculty' },
      },
    },
    advanced: {
      cookiePrefix: 'mailmind',
    },
  };
  _auth = betterAuth(options);
  logger.info('Better-auth initialized');
  return _auth;
}

export function getAuth(): AuthInstance {
  if (!_auth) throw new Error('Auth not initialized — call initAuth() first');
  return _auth;
}
