import {
  mysqlTable,
  int,
  varchar,
  timestamp,
  tinyint,
  primaryKey,
  text,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  isActive: tinyint('is_active').default(1),
  isSystemAdmin: tinyint('is_system_admin').default(0),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .onUpdateNow(),
});

export const roles = mysqlTable('roles', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
});

export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: int('user_id').references(() => users.id),
    roleId: int('role_id').references(() => roles.id),
  },
  (t) => ({
    pk: primaryKey(t.userId, t.roleId),
  }),
);

export const systemSettings = mysqlTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
});
