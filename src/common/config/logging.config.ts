import { LogLevel } from '@nestjs/common';

export const getLogLevels = (): LogLevel[] => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return ['error', 'warn', 'log'];
    case 'staging':
      return ['error', 'warn', 'log', 'debug'];
    case 'development':
    default:
      return ['error', 'warn', 'log', 'debug', 'verbose'];
  }
};

export const loggingConfig = {
  logLevels: getLogLevels(),
  enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING !== 'false',
  enableErrorTracking: process.env.ENABLE_ERROR_TRACKING !== 'false',
  slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD || '1000'),
  highMemoryThreshold: parseInt(
    process.env.HIGH_MEMORY_THRESHOLD || '52428800',
  ), // 50MB
};
