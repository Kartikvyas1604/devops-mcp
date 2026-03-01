import { workspace } from 'vscode';

export interface Config {
    apiUrl: string;
    timeout: number;
    logLevel: 'info' | 'warn' | 'error';
}

export class ConfigService {
    private config: Config;

    constructor() {
        this.config = this.loadConfig();
    }

    private loadConfig(): Config {
        const config = workspace.getConfiguration('devOpsOmnibus');
        return {
            apiUrl: config.get<string>('apiUrl') || 'http://localhost:3000',
            timeout: config.get<number>('timeout') || 5000,
            logLevel: config.get<'info' | 'warn' | 'error'>('logLevel') || 'info',
        };
    }

    public getApiUrl(): string {
        return this.config.apiUrl;
    }

    public getTimeout(): number {
        return this.config.timeout;
    }

    public getLogLevel(): 'info' | 'warn' | 'error' {
        return this.config.logLevel;
    }

    public updateConfig(newConfig: Partial<Config>): void {
        this.config = { ...this.config, ...newConfig };
        // Save the updated configuration to workspace settings
        workspace.getConfiguration('devOpsOmnibus').update('apiUrl', this.config.apiUrl, true);
        workspace.getConfiguration('devOpsOmnibus').update('timeout', this.config.timeout, true);
        workspace.getConfiguration('devOpsOmnibus').update('logLevel', this.config.logLevel, true);
    }
}