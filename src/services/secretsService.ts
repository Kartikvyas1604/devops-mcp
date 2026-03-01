import * as vscode from 'vscode';

/**
 * Service connection info
 */
export interface ServiceConnection {
    id: string;
    name: string;
    status: 'connected' | 'disconnected' | 'error';
    lastConnected?: Date;
}

/**
 * SecretsService - Manages credentials using VS Code's SecretStorage API
 * All credentials are stored securely and never exposed in plaintext
 */
export class SecretsService {
    private secretStorage: vscode.SecretStorage;
    private readonly PREFIX = 'devops-omnibus';

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }

    /**
     * Store credentials for a service
     * @param serviceId - The service identifier (e.g., 'github', 'aws')
     * @param credentials - The credentials object to store
     */
    async storeCredentials(serviceId: string, credentials: Record<string, unknown>): Promise<void> {
        const key = `${this.PREFIX}.${serviceId}`;
        await this.secretStorage.store(key, JSON.stringify({
            ...credentials,
            _connectedAt: new Date().toISOString()
        }));
    }

    /**
     * Retrieve credentials for a service
     * @param serviceId - The service identifier
     * @returns The stored credentials or null if not found
     */
    async getCredentials<T = Record<string, unknown>>(serviceId: string): Promise<T | null> {
        const key = `${this.PREFIX}.${serviceId}`;
        const value = await this.secretStorage.get(key);
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    }

    /**
     * Delete credentials for a service
     * @param serviceId - The service identifier
     */
    async deleteCredentials(serviceId: string): Promise<void> {
        const key = `${this.PREFIX}.${serviceId}`;
        await this.secretStorage.delete(key);
    }

    /**
     * Check if a service is connected
     * @param serviceId - The service identifier
     * @returns true if credentials exist for the service
     */
    async isConnected(serviceId: string): Promise<boolean> {
        const credentials = await this.getCredentials(serviceId);
        return credentials !== null;
    }

    /**
     * Get all connected services
     * @returns Array of service connection info
     */
    async getConnectedServices(): Promise<ServiceConnection[]> {
        const services = ['github', 'docker', 'aws', 'azure', 'gcp', 'kubernetes', 'slack', 'jira'];
        const connections: ServiceConnection[] = [];

        for (const serviceId of services) {
            const creds = await this.getCredentials(serviceId);
            if (creds) {
                connections.push({
                    id: serviceId,
                    name: this.getServiceDisplayName(serviceId),
                    status: 'connected',
                    lastConnected: creds._connectedAt ? new Date(creds._connectedAt as string) : undefined
                });
            }
        }

        return connections;
    }

    /**
     * Store a generic secret
     * @param key - The secret key
     * @param value - The secret value
     */
    async storeSecret(key: string, value: string): Promise<void> {
        const secretKey = `${this.PREFIX}.secret.${key}`;
        await this.secretStorage.store(secretKey, value);
    }

    /**
     * Retrieve a generic secret
     * @param key - The secret key
     * @returns The secret value or null
     */
    async getSecret(key: string): Promise<string | null> {
        const secretKey = `${this.PREFIX}.secret.${key}`;
        const value = await this.secretStorage.get(secretKey);
        return value ?? null;
    }

    /**
     * Delete a generic secret
     * @param key - The secret key
     */
    async deleteSecret(key: string): Promise<void> {
        const secretKey = `${this.PREFIX}.secret.${key}`;
        await this.secretStorage.delete(secretKey);
    }

    /**
     * List all stored secret keys
     * @returns Array of secret keys (without values)
     */
    async listSecrets(): Promise<string[]> {
        // VS Code SecretStorage doesn't provide a list method
        // We need to track keys ourselves
        const keysJson = await this.secretStorage.get(`${this.PREFIX}.secretKeys`);
        if (!keysJson) {
            return [];
        }
        try {
            return JSON.parse(keysJson) as string[];
        } catch {
            return [];
        }
    }

    /**
     * Get display name for a service
     */
    private getServiceDisplayName(serviceId: string): string {
        const names: Record<string, string> = {
            github: 'GitHub',
            docker: 'Docker',
            aws: 'AWS',
            azure: 'Azure',
            gcp: 'Google Cloud',
            kubernetes: 'Kubernetes',
            slack: 'Slack',
            jira: 'Jira'
        };
        return names[serviceId] || serviceId;
    }
}