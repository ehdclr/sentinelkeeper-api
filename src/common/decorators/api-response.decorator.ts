import { ApiResponse } from '../interfaces/response.interface';

export class ResponseBuilder {
  static success<T>(
    data?: T,
    message: string = 'Success',
  ): Omit<ApiResponse<T>, 'statusCode' | 'timestamp' | 'path'> {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(
    message: string,
    error?: string,
  ): Omit<ApiResponse<any>, 'statusCode' | 'timestamp' | 'path'> {
    return {
      success: false,
      message,
      error,
    };
  }
}
