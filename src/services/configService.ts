import * as vscode from 'vscode';

/**
 * AI Provider options
 */
export type AIProvider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'local';

/**
 * Cloud Provider options
 */
export type CloudProvider = 'aws' | 'gcp' | 'azure';

/**
 * Secrets Backend options
 */
export type SecretsBackend = 'vscode' | 'aws-secrets-manager' | 'hashicorp-vault' | 'doppler';

/**
 * ConfigService - Centralized configuration management for DevOps Omnibus
 * Reads from VS Code workspace configuration
 */
export class ConfigService {
    private readonly SECTION = 'devops-omnibus';

    /**
     * Get a configuration value
     * @param key - The configuration key (without section prefix)
     * @returns The configuration value or undefined
     */
    get<T>(key: string): T | undefined {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return config.get<T>(key);
    }

    /**
     * Set a configuration value
     * @param key - The configuration key
     * @param value - The value to set
     * @param global - Whether to set globally or for workspace
     */
    async set<T>(key: string, value: T, global: boolean = false): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        await config.update(key, value, global);
    }

    /**
     * Get the primary AI provider
     */
    getAIProvider(): AIProvider {
        return this.get<AIProvider>('aiProvider') || 'anthropic';
    }

    /**
     * Get Anthropic API key
     */
    getAnthropicApiKey(): string {
        return this.get<string>('anthropicApiKey') || '';
    }

    /**
     * Get OpenAI API key
     */
    getOpenAIApiKey(): string {
        return this.get<string>('openaiApiKey') || '';
    }

    /**
     * Get Google API key
     */
    getGoogleApiKey(): string {
        return this.get<string>('googleApiKey') || '';
    }

    /**
     * Check if parallel model execution is enabled
     */
    isParallelModelsEnabled(): boolean {
        return this.get<boolean>('enableParallelModels') || false;
    }

    /**
     * Check if telemetry is enabled
     */
    isTelemetryEnabled(): boolean {
        return this.get<boolean>('enableTelemetry') || false;
    }

    /**
     * Get the default cloud provider
     */
    getDefaultCloud(): CloudProvider {
        return this.get<CloudProvider>('defaultCloud') || 'aws';
    }

    /**
     * Check if auto project analysis is enabled
     */
    isAutoAnalyzeEnabled(): boolean {
        return this.get<boolean>('autoAnalyzeProject') ?? true;
    }

    /**
     * Get the secrets backend
     */
    getSecretsBackend(): SecretsBackend {
        return this.get<SecretsBackend>('secretsBackend') || 'vscode';
    }

    /**
     * Get MCP server port
     */
    getMCPServerPort(): number {
        return this.get<number>('mcpServerPort') || 3000;
    }

    /**
     * Get all configuration as an object
     */
    getAll(): Record<string, unknown> {
        const config = vscode.workspace.getConfiguration(this.SECTION);
        return {
            aiProvider: this.getAIProvider(),
            anthropicApiKey: this.getAnthropicApiKey() ? '***' : '',
            openaiApiKey: this.getOpenAIApiKey() ? '***' : '',
            googleApiKey: this.getGoogleApiKey() ? '***' : '',
            enableParallelModels: this.isParallelModelsEnabled(),
            enableTelemetry: this.isTelemetryEnabled(),
            defaultCloud: this.getDefaultCloud(),
            autoAnalyzeProject: this.isAutoAnalyzeEnabled(),
            secretsBackend: this.getSecretsBackend(),
            mcpServerPort: this.getMCPServerPort()
        };
    }

    /**
     * Listen for configuration changes
     */
    onDidChangeConfiguration(
        callback: (e: vscode.ConfigurationChangeEvent) => void
    ): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(this.SECTION)) {
                callback(e);
            }
        });
    }
}