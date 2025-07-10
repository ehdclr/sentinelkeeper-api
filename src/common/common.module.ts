import { Module, Global } from '@nestjs/common';
import { PemKeyService } from '@/common/services/pem-key.service';
import { FileService } from '@/common/services/file.service';
import { BcryptHashService } from '@/common/services/hash.service';
import { CryptoService } from '@/common/services/crypto.service';

@Global()
@Module({
  providers: [PemKeyService, FileService, BcryptHashService, CryptoService],
  exports: [PemKeyService, FileService, BcryptHashService, CryptoService], // Export the class directly
})
export class CommonModule {}
