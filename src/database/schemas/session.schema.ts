import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
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
import { sqliteUsers, pgUsers, mysqlUsers } from './user.schema';
import { sql } from 'drizzle-orm';

// SQLite 스키마
export const sqliteSessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => sqliteUsers.id, { onDelete: 'cascade' }),
  data: text('data'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});

// PostgreSQL 스키마
export const pgSessions = pgTable('sessions', {
  id: pgVarchar('id', { length: 255 }).primaryKey(),
  userId: pgInteger('user_id')
    .notNull()
    .references(() => pgUsers.id, { onDelete: 'cascade' }),
  data: pgText('data'),
  expiresAt: pgTimestamp('expires_at'),
  lastActivityAt: pgTimestamp('last_activity_at'),
  createdAt: pgTimestamp('created_at').defaultNow(),
  updatedAt: pgTimestamp('updated_at').defaultNow(),
});

// MySQL 스키마
export const mysqlSessions = mysqlTable('sessions', {
  id: mysqlVarchar('id', { length: 255 }).primaryKey(),
  userId: int('user_id')
    .notNull()
    .references(() => mysqlUsers.id, { onDelete: 'cascade' }),
  data: mysqlText('data'),
  expiresAt: mysqlTimestamp('expires_at'),
  lastActivityAt: mysqlTimestamp('last_activity_at'),
  createdAt: mysqlTimestamp('created_at').defaultNow(),
  updatedAt: mysqlTimestamp('updated_at').defaultNow().onUpdateNow(),
});

// 통합 스키마 (DB 타입에 따라 선택)
export const getSessionsTable = (dbType: string) => {
  switch (dbType) {
    case 'sqlite':
      return sqliteSessions;
    case 'postgres':
      return pgSessions;
    case 'mysql':
      return mysqlSessions;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
};
