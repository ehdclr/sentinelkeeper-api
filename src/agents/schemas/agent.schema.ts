import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  serial,
  varchar as pgVarchar,
  timestamp as pgTimestamp,
  text as pgText,
  integer as pgInteger,
} from 'drizzle-orm/pg-core';
import {
  mysqlTable,
  int,
  varchar as mysqlVarchar,
  timestamp as mysqlTimestamp,
  text as mysqlText,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// SQLite 스키마
export const sqliteAgents = sqliteTable('agents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  host: text('host').notNull(),
  ownerId: integer('owner_id').notNull(),
  token: text('token').notNull().unique(),
  lastHeartbeat: integer('last_heartbeat', { mode: 'timestamp' }),
  status: text('status').notNull().default('offline'), // online/offline/error
  version: text('version'),
  metadata: text('metadata'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});

// PostgreSQL 스키마
export const pgAgents = pgTable('agents', {
  id: serial('id').primaryKey(),
  name: pgVarchar('name', { length: 100 }).notNull(),
  host: pgVarchar('host', { length: 255 }).notNull(),
  ownerId: pgInteger('owner_id').notNull(),
  token: pgVarchar('token', { length: 255 }).notNull().unique(),
  lastHeartbeat: pgTimestamp('last_heartbeat'),
  status: pgVarchar('status', { length: 20 }).notNull().default('offline'),
  version: pgVarchar('version', { length: 50 }),
  metadata: pgText('metadata'),
  createdAt: pgTimestamp('created_at').defaultNow(),
  updatedAt: pgTimestamp('updated_at').defaultNow(),
});

// MySQL 스키마
export const mysqlAgents = mysqlTable('agents', {
  id: int('id').primaryKey().autoincrement(),
  name: mysqlVarchar('name', { length: 100 }).notNull(),
  host: mysqlVarchar('host', { length: 255 }).notNull(),
  ownerId: int('owner_id').notNull(),
  token: mysqlVarchar('token', { length: 255 }).notNull().unique(),
  lastHeartbeat: mysqlTimestamp('last_heartbeat'),
  status: mysqlVarchar('status', { length: 20 }).notNull().default('offline'),
  version: mysqlVarchar('version', { length: 50 }),
  metadata: mysqlText('metadata'),
  createdAt: mysqlTimestamp('created_at').defaultNow(),
  updatedAt: mysqlTimestamp('updated_at').defaultNow().onUpdateNow(),
});

export const getAgentsTable = (dbType: string) => {
  switch (dbType) {
    case 'sqlite':
      return sqliteAgents;
    case 'postgres':
      return pgAgents;
    case 'mysql':
      return mysqlAgents;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
};
