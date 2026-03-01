// Re-export all service classes
export { default as authService, AuthService } from './authService';
export { ConfigService } from './configService';
export { LoggingService, LogLevel } from './loggingService';
export { SecretsService, ServiceConnection } from './secretsService';
export { default as telemetryService, TelemetryService } from './telemetryService';

// Create singleton instances (for services that don't require context)
import { ConfigService } from './configService';
import { LoggingService } from './loggingService';

export const configService = new ConfigService();
export const loggingService = new LoggingService();

// Note: secretsService requires ExtensionContext, must be initialized in activate()
// Note: telemetryService singleton is created in telemetryService.ts