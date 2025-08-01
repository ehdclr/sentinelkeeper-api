import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  serial,
  varchar as pgVarchar,
  boolean as pgBoolean,
  timestamp as pgTimestamp,
  text as pgText,
} from 'drizzle-orm/pg-core';
import {
  mysqlTable,
  int,
  varchar as mysqlVarchar,
  tinyint as mysqlTinyint,
  timestamp as mysqlTimestamp,
  text as mysqlText,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// SQLite 스키마
export const sqliteUsers = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').unique(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isSystemRoot: integer('is_system_root', { mode: 'boolean' }).default(false),
  publicKey: text('public_key'),
  publicKeyCreatedAt: integer('public_key_created_at', {
    mode: 'timestamp',
  }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(
    sql`(strftime('%s', 'now'))`,
  ),
});

// PostgreSQL 스키마
export const pgUsers = pgTable('users', {
  id: serial('id').primaryKey(),
  username: pgVarchar('username', { length: 50 }).notNull().unique(),
  password: pgVarchar('password', { length: 255 }).notNull(),
  email: pgVarchar('email', { length: 255 }).unique(),
  isActive: pgBoolean('is_active').default(true),
  isSystemRoot: pgBoolean('is_system_root').default(false),
  publicKey: pgText('public_key'),
  publicKeyCreatedAt: pgTimestamp('public_key_created_at'),
  createdAt: pgTimestamp('created_at').defaultNow(),
  updatedAt: pgTimestamp('updated_at').defaultNow(),
});

// MySQL 스키마
export const mysqlUsers = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: mysqlVarchar('username', { length: 50 }).notNull().unique(),
  password: mysqlVarchar('password', { length: 255 }).notNull(),
  email: mysqlVarchar('email', { length: 255 }).unique(),
  isActive: mysqlTinyint('is_active').default(1),
  isSystemRoot: mysqlTinyint('is_system_root').default(0),
  publicKey: mysqlText('public_key'),
  publicKeyCreatedAt: mysqlTimestamp('public_key_created_at'),
  createdAt: mysqlTimestamp('created_at').defaultNow(),
  updatedAt: mysqlTimestamp('updated_at').defaultNow().onUpdateNow(),
});

// 통합 스키마 (DB 타입에 따라 선택)
export const getUsersTable = (dbType: string) => {
  switch (dbType) {
    case 'sqlite':
      return sqliteUsers;
    case 'postgres':
      return pgUsers;
    case 'mysql':
      return mysqlUsers;
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
};
