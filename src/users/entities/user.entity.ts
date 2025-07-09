import { z } from 'zod';

// 엔티티 스키마 (Zod)
export const UserSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  email: z.string().nullable(),
  isActive: z.boolean(),
  isSystemAdmin: z.boolean(),
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
    isSystemAdmin?: boolean;
  }): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      username: data.username,
      password: data.password,
      email: data.email || null,
      isActive: true,
      isSystemAdmin: data.isSystemAdmin || false,
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
    this.data.isSystemAdmin = true;
    this.data.updatedAt = new Date();
  }

  demoteFromAdmin(): void {
    this.data.isSystemAdmin = false;
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
  get isSystemAdmin(): boolean {
    return this.data.isSystemAdmin;
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
