import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpStatus, Logger, NotFoundException } from '@nestjs/common';
import { ValidateRecoveryKeyCommand } from '../commands/validate-recovery-key.command';
import { UserRepository } from '../repositories/user.repository';
import { PemKeyService } from '@/common/services/pem-key.service';
import { ResponseBuilder } from '@/common/decorators/api-response.decorator';
import {
  ApiResponse,
  ApiErrorResponse,
} from '@/common/interfaces/response.interface';

export interface ValidateRecoveryKeyResponse {
  valid: boolean;
  username: string;
  email?: string;
  createdAt: string;
  algorithm: string;
  publicKeyMatch: boolean;
  message: string;
}

@CommandHandler(ValidateRecoveryKeyCommand)
export class ValidateRecoveryKeyHandler
  implements ICommandHandler<ValidateRecoveryKeyCommand>
{
  private readonly logger = new Logger(ValidateRecoveryKeyHandler.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly pemKeyService: PemKeyService,
  ) {}

  async execute(
    command: ValidateRecoveryKeyCommand,
  ): Promise<ApiResponse<ValidateRecoveryKeyResponse> | ApiErrorResponse> {
    try {
      // 1. PEM 파일 형식 검증
      if (!this.pemKeyService.validateEd25519PemFile(command.pemContent)) {
        throw new Error('유효하지 않은 Ed25519 PEM 파일 형식입니다.');
      }

      // 2. 메타데이터 추출
      const metadata = this.pemKeyService.extractEd25519MetadataFromPem(
        command.pemContent,
      );

      // 3. 사용자 존재 확인
      const user = await this.userRepository.findByUsername(metadata.username);
      if (!user || !user.isSystemRoot || !user.publicKey) {
        throw new NotFoundException(
          '루트 사용자를 찾을 수 없거나 복구 키가 설정되지 않았습니다.',
        );
      }

      // 4. Private Key 추출
      const privateKey = this.pemKeyService.extractEd25519PrivateKeyFromPem(
        command.pemContent,
      );

      // 5. 키 쌍 일치 확인 (PemKeyService 사용)
      const testData = `recovery-validation-${Date.now()}`;
      const testSignature = this.pemKeyService.signEd25519(
        testData,
        privateKey,
      );
      const publicKeyMatch = this.pemKeyService.verifyEd25519(
        testData,
        testSignature,
        user.publicKey,
      );

      if (!publicKeyMatch) {
        throw new Error(
          'PEM 파일의 개인키와 저장된 공개키가 일치하지 않습니다.',
        );
      }

      const responseData: ValidateRecoveryKeyResponse = {
        valid: true,
        username: metadata.username,
        email: metadata.email,
        createdAt: metadata.createdAt,
        algorithm: metadata.algorithm,
        publicKeyMatch: true,
        message: '복구 키가 성공적으로 검증되었습니다.',
      };

      const response = ResponseBuilder.success(
        responseData,
        '복구 키 검증이 완료되었습니다.',
        HttpStatus.OK,
      );

      return {
        ...response,
        timestamp: new Date().toISOString(),
        path: '/users/root/validate-recovery-key',
      } as ApiResponse<ValidateRecoveryKeyResponse>;
    } catch (error) {
      this.logger.error('복구 키 검증 실패:', error);

      const errorResponse = ResponseBuilder.error(
        '복구 키 검증에 실패했습니다.',
        error instanceof Error ? error.message : '알 수 없는 오류',
        HttpStatus.BAD_REQUEST,
      );

      return {
        ...errorResponse,
        timestamp: new Date().toISOString(),
        path: '/users/root/validate-recovery-key',
      } as ApiErrorResponse;
    }
  }
}
