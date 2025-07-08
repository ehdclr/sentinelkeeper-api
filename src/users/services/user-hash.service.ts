import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserHashService {
  private readonly saltRounds = 12;

  /**
   * 비밀번호를 해시화합니다.
   * @param password 원본 비밀번호
   * @returns 해시화된 비밀번호
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 비밀번호가 해시와 일치하는지 확인합니다.
   * @param password 원본 비밀번호
   * @param hash 해시화된 비밀번호
   * @returns 일치 여부
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
