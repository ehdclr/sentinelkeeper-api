export interface User {
  id: number;
  username: string;
  passwordHash: string;
  email: string | null;
  isActive: boolean;
  isSystemAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserEntity {
  static create(data: {
    username: string;
    passwordHash: string;
    email?: string;
    isSystemAdmin?: boolean;
  }): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      username: data.username,
      passwordHash: data.passwordHash,
      email: data.email || null,
      isActive: true,
      isSystemAdmin: data.isSystemAdmin || false,
    };
  }
}
