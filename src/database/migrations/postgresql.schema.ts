import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

// 사용자 테이블
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  isActive: boolean('is_active').default(true),
  isSystemAdmin: boolean('is_system_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 역할 테이블
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
});

// 사용자-역할 연결 테이블
export const userRoles = pgTable(
  'user_roles',
  {
    userId: serial('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: serial('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

// 시스템 설정 테이블
export const systemSettings = pgTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 1000 }),
});
