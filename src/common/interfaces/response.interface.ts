export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}
