import { Module, Global } from '@nestjs/common';
import { PemKeyService } from '@/common/services/pem-key.service';
import { FileService } from '@/common/services/file.service';
import { BcryptHashService } from '@/common/services/hash.service';

@Global()
@Module({
  providers: [PemKeyService, FileService, BcryptHashService],
  exports: [PemKeyService, FileService, BcryptHashService], // Export the class directly
})
export class CommonModule {}
