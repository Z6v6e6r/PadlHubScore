import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo } from './db/mongo.js';

async function bootstrap() {
  await connectMongo();

  const app = createApp();

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PadlHubScore API is running on port ${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap service', error);
  process.exit(1);
});
