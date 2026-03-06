import * as vscode from 'vscode';
import { ServiceType, ServiceConnection, ConnectionStatus, OAuthTokens } from '../shared/types';

export class CredentialManager {
    private readonly secretStorage: vscode.SecretStorage;
    private readonly connectionStatusEmitter: vscode.EventEmitter<ServiceType>;

    public readonly onConnectionStatusChanged: vscode.Event<ServiceType>;

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
        this.connectionStatusEmitter = new vscode.EventEmitter<ServiceType>();
        this.onConnectionStatusChanged = this.connectionStatusEmitter.event;
    }

    /**
     * Store OAuth tokens for a service
     */
    async storeOAuthTokens(service: ServiceType, tokens: OAuthTokens): Promise<void> {
        const key = this.getSecretKey(service, 'oauth');
        const value = JSON.stringify({
            ...tokens,
            storedAt: new Date().toISOString()
        });
        await this.secretStorage.store(key, value);

        // Update connection status
        await this.updateConnectionStatus(service, ConnectionStatus.CONNECTED);
        this.connectionStatusEmitter.fire(service);
    }

    /**
     * Retrieve OAuth tokens for a service
     */
    async getOAuthTokens(service: ServiceType): Promise<OAuthTokens | null> {
        const key = this.getSecretKey(service, 'oauth');
        const value = await this.secretStorage.get(key);

        if (!value) {
            return null;
        }

        try {
            const stored = JSON.parse(value);

            // Check if token is expired
            if (stored.expiresAt) {
                const expiresAt = new Date(stored.expiresAt);
                if (expiresAt < new Date()) {
                    // Token expired
                    await this.updateConnectionStatus(service, ConnectionStatus.EXPIRED);
                    return null;
                }
            }

            return {
                accessToken: stored.accessToken,
                refreshToken: stored.refreshToken,
                expiresAt: stored.expiresAt ? new Date(stored.expiresAt) : undefined,
                tokenType: stored.tokenType,
                scope: stored.scope
            };
        } catch (error) {
            // Error parsing tokens - return null
            return null;
        }
    }

    /**
     * Store API key for a service
     */
    async storeApiKey(service: ServiceType, apiKey: string, metadata?: Record<string, unknown>): Promise<void> {
        const key = this.getSecretKey(service, 'api-key');
        const value = JSON.stringify({
            apiKey,
            metadata,
            storedAt: new Date().toISOString()
        });
        await this.secretStorage.store(key, value);

        await this.updateConnectionStatus(service, ConnectionStatus.CONNECTED);
        this.connectionStatusEmitter.fire(service);
    }

    /**
     * Retrieve API key for a service
     */
    async getApiKey(service: ServiceType): Promise<string | null> {
        const key = this.getSecretKey(service, 'api-key');
        const value = await this.secretStorage.get(key);

        if (!value) {
            return null;
        }

        try {
            const stored = JSON.parse(value);
            return stored.apiKey;
        } catch (error) {
            // Error parsing API key - return null
            return null;
        }
    }

    /**
     * Store generic credentials (username/password, tokens, etc.)
     */
    async storeCredentials(service: ServiceType, credentials: Record<string, unknown>): Promise<void> {
        const key = this.getSecretKey(service, 'credentials');
        const value = JSON.stringify({
            ...credentials,
            storedAt: new Date().toISOString()
        });
        await this.secretStorage.store(key, value);

        await this.updateConnectionStatus(service, ConnectionStatus.CONNECTED);
        this.connectionStatusEmitter.fire(service);
    }

    /**
     * Retrieve generic credentials
     */
    async getCredentials(service: ServiceType): Promise<Record<string, unknown> | null> {
        const key = this.getSecretKey(service, 'credentials');
        const value = await this.secretStorage.get(key);

        if (!value) {
            return null;
        }

        try {
            const stored = JSON.parse(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { storedAt, ...credentials } = stored;
            return credentials;
        } catch (error) {
            // Error parsing credentials - return null
            return null;
        }
    }

    /**
     * Remove all credentials for a service (disconnect)
     */
    async removeCredentials(service: ServiceType): Promise<void> {
        const keys = [
            this.getSecretKey(service, 'oauth'),
            this.getSecretKey(service, 'api-key'),
            this.getSecretKey(service, 'credentials'),
            this.getSecretKey(service, 'metadata')
        ];

        for (const key of keys) {
            await this.secretStorage.delete(key);
        }

        await this.updateConnectionStatus(service, ConnectionStatus.DISCONNECTED);
        this.connectionStatusEmitter.fire(service);
    }

    /**
     * Check if a service is connected (has valid credentials)
     */
    async isConnected(service: ServiceType): Promise<boolean> {
        const status = await this.getConnectionStatus(service);
        return status === ConnectionStatus.CONNECTED;
    }

    /**
     * Get connection status for a service
     */
    async getConnectionStatus(service: ServiceType): Promise<ConnectionStatus> {
        const key = this.getSecretKey(service, 'status');
        const value = await this.secretStorage.get(key);

        if (!value) {
            return ConnectionStatus.DISCONNECTED;
        }

        return value as ConnectionStatus;
    }

    /**
     * Update connection status
     */
    private async updateConnectionStatus(service: ServiceType, status: ConnectionStatus): Promise<void> {
        const key = this.getSecretKey(service, 'status');
        await this.secretStorage.store(key, status);
    }

    /**
     * Store connection metadata (region, project ID, workspace, etc.)
     */
    async storeMetadata(service: ServiceType, metadata: Record<string, unknown>): Promise<void> {
        const key = this.getSecretKey(service, 'metadata');
        const value = JSON.stringify({
            ...metadata,
            updatedAt: new Date().toISOString()
        });
        await this.secretStorage.store(key, value);
    }

    /**
     * Retrieve connection metadata
     */
    async getMetadata(service: ServiceType): Promise<Record<string, unknown> | null> {
        const key = this.getSecretKey(service, 'metadata');
        const value = await this.secretStorage.get(key);

        if (!value) {
            return null;
        }

        try {
            const stored = JSON.parse(value);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { updatedAt, ...metadata } = stored;
            return metadata;
        } catch (error) {
            // Error parsing metadata - return null
            return null;
        }
    }

    /**
     * Get full service connection info
     */
    async getServiceConnection(service: ServiceType): Promise<ServiceConnection | null> {
        const status = await this.getConnectionStatus(service);

        if (status === ConnectionStatus.DISCONNECTED) {
            return null;
        }

        const metadata = await this.getMetadata(service);
        const credentials = await this.getCredentials(service);
        const apiKey = await this.getApiKey(service);

        return {
            id: service,
            type: service,
            status,
            displayName: this.getServiceDisplayName(service),
            connectedAt: metadata?.connectedAt ? new Date(metadata.connectedAt as string | number | Date) : new Date(),
            lastUsed: metadata?.lastUsed ? new Date(metadata.lastUsed as string | number | Date) : undefined,
            credentials: (credentials as { [key: string]: string }) || (apiKey ? { apiKey } : undefined),
            metadata
        };
    }

    /**
     * List all connected services
     */
    async listConnectedServices(): Promise<ServiceConnection[]> {
        const connections: ServiceConnection[] = [];

        // Check all possible service types
        for (const serviceType of Object.values(ServiceType)) {
            const connection = await this.getServiceConnection(serviceType as ServiceType);
            if (connection && connection.status === ConnectionStatus.CONNECTED) {
                connections.push(connection);
            }
        }

        return connections;
    }

    /**
     * Update last used timestamp for a service
     */
    async updateLastUsed(service: ServiceType): Promise<void> {
        const metadata = await this.getMetadata(service) || {};
        metadata.lastUsed = new Date().toISOString();
        await this.storeMetadata(service, metadata);
    }

    /**
     * Refresh OAuth token if refresh token is available
     */
    async refreshOAuthToken(service: ServiceType, refreshTokenFn: (token: string) => Promise<OAuthTokens>): Promise<boolean> {
        const tokens = await this.getOAuthTokens(service);

        if (!tokens?.refreshToken) {
            return false;
        }

        try {
            const newTokens = await refreshTokenFn(tokens.refreshToken);
            await this.storeOAuthTokens(service, newTokens);
            return true;
        } catch (error) {
            // Error refreshing token
            await this.updateConnectionStatus(service, ConnectionStatus.ERROR);
            return false;
        }
    }

    /**
     * Generate secret storage key for a service and type
     */
    private getSecretKey(service: ServiceType, type: 'oauth' | 'api-key' | 'credentials' | 'metadata' | 'status'): string {
        return `genieops.${service}.${type}`;
    }

    /**
     * Get display name for a service
     */
    private getServiceDisplayName(service: ServiceType): string {
        const displayNames: Record<ServiceType, string> = {
            [ServiceType.AWS]: 'AWS',
            [ServiceType.GCP]: 'Google Cloud',
            [ServiceType.AZURE]: 'Microsoft Azure',
            [ServiceType.VERCEL]: 'Vercel',
            [ServiceType.RAILWAY]: 'Railway',
            [ServiceType.NETLIFY]: 'Netlify',
            [ServiceType.RENDER]: 'Render',
            [ServiceType.FLY_IO]: 'Fly.io',
            [ServiceType.DOCKER]: 'Docker',
            [ServiceType.KUBERNETES]: 'Kubernetes',
            [ServiceType.JENKINS]: 'Jenkins',
            [ServiceType.GITHUB]: 'GitHub',
            [ServiceType.GITLAB]: 'GitLab',
            [ServiceType.BITBUCKET]: 'Bitbucket',
            [ServiceType.TERRAFORM]: 'Terraform',
            [ServiceType.PULUMI]: 'Pulumi',
            [ServiceType.ARGOCD]: 'ArgoCD',
            [ServiceType.FLUX]: 'Flux',
            [ServiceType.JIRA]: 'Jira',
            [ServiceType.LINEAR]: 'Linear',
            [ServiceType.TRELLO]: 'Trello',
            [ServiceType.ASANA]: 'Asana',
            [ServiceType.NOTION]: 'Notion',
            [ServiceType.SLACK]: 'Slack',
            [ServiceType.TEAMS]: 'Microsoft Teams',
            [ServiceType.DISCORD]: 'Discord',
            [ServiceType.PAGERDUTY]: 'PagerDuty',
            [ServiceType.AUTH0]: 'Auth0',
            [ServiceType.FIREBASE_AUTH]: 'Firebase Auth',
            [ServiceType.SUPABASE]: 'Supabase',
            [ServiceType.CLERK]: 'Clerk',
            [ServiceType.COGNITO]: 'AWS Cognito',
            [ServiceType.NEXTAUTH]: 'NextAuth.js',
            [ServiceType.GOOGLE_OAUTH]: 'Google OAuth',
            [ServiceType.GITHUB_OAUTH]: 'GitHub OAuth',
            [ServiceType.FACEBOOK_OAUTH]: 'Facebook OAuth',
            [ServiceType.TWITTER_OAUTH]: 'Twitter OAuth',
            [ServiceType.APPLE_OAUTH]: 'Apple Sign In',
            [ServiceType.LINKEDIN_OAUTH]: 'LinkedIn OAuth',
            [ServiceType.MICROSOFT_OAUTH]: 'Microsoft OAuth',
            [ServiceType.DISCORD_OAUTH]: 'Discord OAuth',
            [ServiceType.STRIPE]: 'Stripe',
            [ServiceType.PAYPAL]: 'PayPal',
            [ServiceType.TWILIO]: 'Twilio',
            [ServiceType.SENDGRID]: 'SendGrid',
            [ServiceType.RESEND]: 'Resend',
            [ServiceType.POSTMARK]: 'Postmark',
            [ServiceType.POSTGRESQL]: 'PostgreSQL',
            [ServiceType.MYSQL]: 'MySQL',
            [ServiceType.MONGODB]: 'MongoDB',
            [ServiceType.REDIS]: 'Redis',
            [ServiceType.DYNAMODB]: 'DynamoDB',
            [ServiceType.FIRESTORE]: 'Firestore'
        };

        return displayNames[service] || service;
    }

    /**
     * Export credentials to external vault (Doppler, AWS Secrets Manager, etc.)
     * Only exports if user has enabled vault sync in settings
     */
    async syncToExternalVault(_vaultProvider: 'doppler' | 'aws-secrets-manager' | 'hashicorp-vault'): Promise<boolean> {
        // TODO: Implement vault sync
        // This would be called when user enables vault sync in settings
        // For now, return false as not implemented
        return false;
    }
}
