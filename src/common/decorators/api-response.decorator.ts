import { ApiResponse } from '../interfaces/response.interface';
import { HttpStatus } from '@nestjs/common';

export class ResponseBuilder {
  static success<T>(
    data?: T,
    message: string = 'Success',
    statusCode?: number,
  ): Omit<ApiResponse<T>, 'timestamp' | 'path'> {
    return {
      statusCode: statusCode || HttpStatus.OK,
      success: true,
      message,
      data,
    };
  }

  static error(
    message: string,
    error?: string,
    statusCode?: number,
  ): Omit<ApiResponse<any>, 'timestamp' | 'path'> {
    return {
      statusCode: statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message,
      error,
    };
  }
}
