import { Module } from '@nestjs/common';
import { BcryptHashService } from '../services/hash.service';

@Module({
  providers: [
    {
      provide: 'HashService',
      useClass: BcryptHashService,
    },
  ],
  exports: ['HashService'],
})
export class HashModule {}
