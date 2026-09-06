import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),

  MONGODB_URI: z.string().optional().default(''),
  MONGODB_DB_NAME: z.string().default('mailmind'),

  BETTER_AUTH_SECRET: z.string().min(16).default('dev-secret-replace-me-with-32+chars'),
  BETTER_AUTH_URL: z.string().default('http://localhost:4000'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().default('http://localhost:3000'),

  LLM_PROVIDER: z.string().default('openai'),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_BASE_URL: z.string().default('https://api.openai.com/v1'),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  LLM_TIMEOUT_MS: z.coerce.number().default(20000),

  FOLLOWUP_THRESHOLD_HOURS: z.coerce.number().default(48),
  STALE_THRESHOLD_HOURS: z.coerce.number().default(48),
  DIGEST_CACHE_TTL_SECONDS: z.coerce.number().default(300),
  MAX_MESSAGES_PER_THREAD: z.coerce.number().default(200),

  SEED_ON_BOOT: z.coerce.boolean().default(true),
  DEMO_USER_EMAIL: z.string().default('demo@aust.edu'),
  DEMO_USER_PASSWORD: z.string().default('demo1234'),

  GMAIL_CLIENT_ID: z.string().optional().default(''),
  GMAIL_CLIENT_SECRET: z.string().optional().default(''),
  GMAIL_REDIRECT_URI: z
    .string()
    .default('http://localhost:4000/api/auth/google/callback'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
