// src/database/constants/database.constants.ts

export const DATABASE_CONFIG = {
  CONFIG_FILE: 'database-config.json',
  LOCK_FILE: '.database-lock',
  CONNECTION_TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const REQUIRED_TABLES = [
  'users',
  'roles',
  'user_roles',
  'system_settings',
  'agents',
] as const;

export const SYSTEM_SETTINGS = {
  APP_NAME: 'Sentinel',
  VERSION: '1.0.0',
} as const;

export const SQL_QUERIES = {
  SQLITE: {
    CREATE_USERS: `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT UNIQUE,
        is_active INTEGER DEFAULT 1,
        is_system_root INTEGER DEFAULT 0,
        public_key TEXT NULL,
        public_key_created_at TIMESTAMP NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `,
    CREATE_SESSIONS: `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data TEXT,
        expires_at TIMESTAMP,
        last_activity_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `,
    CREATE_ROLES: `
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT
      )
    `,
    CREATE_USER_ROLES: `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `,
    CREATE_SYSTEM_SETTINGS: `
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `,
    CREATE_AGENTS: `
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        ip_address TEXT NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        host_name TEXT,
        registration_token TEXT,
        status TEXT DEFAULT 'unregistered',
        registered_at INTEGER DEFAULT (strftime('%s', 'now')),
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `,
    CHECK_TABLE: `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `,
    TEST_QUERY: 'SELECT 1 as test',
  },

  POSTGRES: {
    CREATE_USERS: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        is_active BOOLEAN DEFAULT TRUE,
        is_system_root BOOLEAN DEFAULT FALSE,
        public_key TEXT NULL,
        public_key_created_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `,
    CREATE_SESSIONS: `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data TEXT,
        expires_at TIMESTAMP,
        last_activity_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `,
    CREATE_ROLES: `
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255)
      )
    `,
    CREATE_USER_ROLES: `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `,
    CREATE_SYSTEM_SETTINGS: `
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `,
    CREATE_AGENTS: `
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        ip_address TEXT NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        host_name TEXT,
        registration_token TEXT,
        status TEXT DEFAULT 'unregistered',
        registered_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `,
    CHECK_TABLE: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    `,
    TEST_QUERY: 'SELECT 1 as test',
  },

  MYSQL: {
    CREATE_USERS: `
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        is_active TINYINT(1) DEFAULT 1,
        is_system_root TINYINT(1) DEFAULT 0,
        public_key TEXT NULL,
        public_key_created_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
    CREATE_SESSIONS: `
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        data TEXT,
        expires_at TIMESTAMP,
        last_activity_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
    CREATE_ROLES: `
      CREATE TABLE IF NOT EXISTS roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(255)
      )
    `,
    CREATE_USER_ROLES: `
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT,
        role_id INT,
        PRIMARY KEY (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      )
    `,
    CREATE_SYSTEM_SETTINGS: `
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      )
    `,
    CREATE_AGENTS: `
      CREATE TABLE IF NOT EXISTS agents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        tenant_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        ip_address TEXT NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT FALSE,
        host_name TEXT,
        registration_token TEXT,
        status TEXT DEFAULT 'unregistered',
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `,
    CHECK_TABLE: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = ?
    `,
    TEST_QUERY: 'SELECT 1 as test',
  },
} as const;

export const DEFAULT_ROLES = [
  { name: 'admin', description: '시스템 관리자' },
  { name: 'user', description: '일반 사용자' },
] as const;
