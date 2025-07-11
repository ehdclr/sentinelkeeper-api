import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  serial,
  varchar as pgVarchar,
  boolean as pgBoolean,
  timestamp as pgTimestamp,
} from 'drizzle-orm/pg-core';
import {
  mysqlTable,
  int,
  varchar as mysqlVarchar,
  tinyint as mysqlTinyint,
  timestamp as mysqlTimestamp,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// SQLite 스키마
export const sqliteUsers = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').unique(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isSystemAdmin: integer('is_system_admin', { mode: 'boolean' }).default(false),
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
  isSystemAdmin: pgBoolean('is_system_admin').default(false),
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
  isSystemAdmin: mysqlTinyint('is_system_admin').default(0),
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
