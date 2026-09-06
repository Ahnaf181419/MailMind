import { connectDb, disconnectDb } from '../config/db.js';
import { initAuth } from '../config/betterAuth.js';
import { ensureDemoUser, runSeed } from '../services/seed.js';
import { logger } from '../utils/logger.js';

async function main() {
  await connectDb();
  await initAuth();
  const userId = await ensureDemoUser();
  const result = await runSeed(userId, { reset: true });
  logger.info(result, 'Force seed complete');
  await disconnectDb();
}

main().catch((err) => {
  logger.error(
    { err: err instanceof Error ? err.message : String(err) },
    'Seed force failed',
  );
  process.exit(1);
});
