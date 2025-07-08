import {
  mysqlTable,
  int,
  varchar,
  tinyint,
  timestamp,
  primaryKey,
} from 'drizzle-orm/mysql-core';

// 사용자 테이블
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  isActive: tinyint('is_active').default(1),
  isSystemAdmin: tinyint('is_system_admin').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// 역할 테이블
export const roles = mysqlTable('roles', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
});

// 사용자-역할 연결 테이블
export const userRoles = mysqlTable(
  'user_roles',
  {
    userId: int('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: int('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

// 시스템 설정 테이블
export const systemSettings = mysqlTable('system_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 1000 }),
});
