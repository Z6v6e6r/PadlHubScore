import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

dotenvConfig();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  REFEREE_TOKEN_SALT: z.string().min(8),
  PIN_PEPPER: z.string().min(8)
});

export const env = envSchema.parse(process.env);
