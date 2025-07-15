import { z } from 'zod';

// 엔티티 스키마 (Zod)
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemRoot: z.boolean(),
  publicKey: z.string().nullable(),
  publicKeyCreatedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// 도메인 엔티티 클래스
export class UserEntity {
  private data: User;

  constructor(data: User) {
    this.data = UserSchema.parse(data);
  }

  // 정적 팩토리 메서드
  static create(data: {
    username: string;
    password: string;
    email?: string;
    isSystemRoot?: boolean;
    publicKey?: string;
    publicKeyCreatedAt?: Date;
  }): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      username: data.username,
      password: data.password,
      email: data.email || null,
      isActive: true,
      isSystemRoot: data.isSystemRoot || false,
      publicKey: data.publicKey || null,
      publicKeyCreatedAt: data.publicKeyCreatedAt || null,
    };
  }

  // 도메인 메서드들
  activate(): void {
    this.data.isActive = true;
    this.data.updatedAt = new Date();
  }

  deactivate(): void {
    this.data.isActive = false;
    this.data.updatedAt = new Date();
  }

  promoteToAdmin(): void {
    this.data.isSystemRoot = true;
    this.data.updatedAt = new Date();
  }

  demoteFromAdmin(): void {
    this.data.isSystemRoot = false;
    this.data.updatedAt = new Date();
  }

  changePassword(newPassword: string): void {
    this.data.password = newPassword;
    this.data.updatedAt = new Date();
  }

  // Getter 메서드들
  get id(): number {
    return this.data.id;
  }
  get username(): string {
    return this.data.username;
  }
  get email(): string | null {
    return this.data.email;
  }

  get password(): string {
    return this.data.password;
  }

  get isActive(): boolean {
    return this.data.isActive;
  }
  get isSystemRoot(): boolean {
    return this.data.isSystemRoot;
  }
  get publicKey(): string | null {
    return this.data.publicKey;
  }
  get publicKeyCreatedAt(): Date | null {
    return this.data.publicKeyCreatedAt;
  }
  get createdAt(): Date {
    return this.data.createdAt;
  }
  get updatedAt(): Date {
    return this.data.updatedAt;
  }

  // 데이터 반환 (Repository에서 사용)
  toData(): User {
    return { ...this.data };
  }
}
