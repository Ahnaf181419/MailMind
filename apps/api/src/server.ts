import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { initAuth } from './config/betterAuth.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { ensureDemoUser, runSeed } from './services/seed.js';

async function main() {
  await connectDb();
  await initAuth();

  const demoUserId = await ensureDemoUser();

  if (env.SEED_ON_BOOT) {
    const result = await runSeed(demoUserId);
    logger.info(result, 'Seed complete');
  }

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'API listening');
  });
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Fatal boot error');
  process.exit(1);
});
