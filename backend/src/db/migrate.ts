import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDbClient } from './client.js';
import { getConfig } from '../config.js';

const config = getConfig();
const db = createDbClient(config.dbPath);

migrate(db, { migrationsFolder: './src/db/migrations' });

console.log(`Migrations applied to ${config.dbPath}`);
