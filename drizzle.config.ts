import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/shared/database/drizzle-schemas/**/*.ts',
  out: './drizzle',
  dialect: 'postgresql', // 또는 'sqlite', 'mysql'
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sentinel',
  },
});
