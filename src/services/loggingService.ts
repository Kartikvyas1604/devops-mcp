import * as vscode from 'vscode';

/**
 * Log levels for the logging service
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * LoggingService - Centralized logging for DevOps Omnibus
 * Uses VS Code's OutputChannel for visibility
 */
export class LoggingService {
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = 'info';

    constructor(channelName: string = 'DevOps Omnibus') {
        this.outputChannel = vscode.window.createOutputChannel(channelName);
    }

    /**
     * Set the minimum log level
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    /**
     * Log a debug message
     */
    debug(message: string, ...args: unknown[]): void {
        if (this.shouldLog('debug')) {
            this.log('DEBUG', message, args);
        }
    }

    /**
     * Log an info message
     */
    info(message: string, ...args: unknown[]): void {
        if (this.shouldLog('info')) {
            this.log('INFO', message, args);
        }
    }

    /**
     * Log a warning message
     */
    warn(message: string, ...args: unknown[]): void {
        if (this.shouldLog('warn')) {
            this.log('WARN', message, args);
        }
    }

    /**
     * Log an error message
     */
    error(message: string, ...args: unknown[]): void {
        if (this.shouldLog('error')) {
            this.log('ERROR', message, args);
        }
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Clear the output channel
     */
    clear(): void {
        this.outputChannel.clear();
    }

    /**
     * Dispose the output channel
     */
    dispose(): void {
        this.outputChannel.dispose();
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private log(level: string, message: string, args: unknown[]): void {
        const timestamp = new Date().toISOString();
        let formattedMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (args.length > 0) {
            formattedMessage += ' ' + args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
        }

        this.outputChannel.appendLine(formattedMessage);
        
        // Also log to console in development
        if (level === 'ERROR') {
            console.error(formattedMessage);
        } else {
            console.log(formattedMessage);
        }
    }
}

// Legacy exports for backward compatibility
const defaultLogger = new LoggingService();

export const logInfo = (message: string): void => defaultLogger.info(message);
export const logError = (message: string): void => defaultLogger.error(message);
export const logDebug = (message: string): void => defaultLogger.debug(message);