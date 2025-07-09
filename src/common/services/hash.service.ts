import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface HashService {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}

@Injectable()
export class BcryptHashService implements HashService {
  private readonly saltRounds = 12;

  async hash(plain: string): Promise<string> {
    return await bcrypt.hash(plain, this.saltRounds);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
  }
}
