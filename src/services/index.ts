// Re-export all service classes
export { default as authService, AuthService } from './authService';
export { ConfigService } from './configService';
export { LoggingService, LogLevel } from './loggingService';
export { SecretsService } from './secretsService';
export { default as telemetryService, TelemetryService } from './telemetryService';

// Create singleton instances
import { ConfigService } from './configService';
import { LoggingService } from './loggingService';
import { SecretsService } from './secretsService';

export const configService = new ConfigService();
export const loggingService = new LoggingService();
export const secretsService = new SecretsService();