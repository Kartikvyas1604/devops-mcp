/**
 * Auth Service - OAuth2 authentication wrapper
 * Note: Requires google-auth-library for full OAuth functionality
 */

export interface AuthTokens {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    token_type?: string;
}

class AuthService {
    private oauth2Client: unknown;
    private initialized = false;
    private clientId: string;
    private clientSecret: string;
    private redirectUri: string;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.initializeClient();
    }

    private async initializeClient(): Promise<void> {
        try {
            const googleAuth = await import('google-auth-library').catch(() => null);
            if (googleAuth) {
                this.oauth2Client = new googleAuth.OAuth2Client(
                    this.clientId,
                    this.clientSecret,
                    this.redirectUri
                );
                this.initialized = true;
            }
        } catch {
            console.warn('google-auth-library not available. OAuth will be stubbed.');
        }
    }

    async authenticate(code: string): Promise<AuthTokens> {
        if (!this.initialized || !this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }
        const client = this.oauth2Client as {
            getToken: (code: string) => Promise<{ tokens: AuthTokens }>;
            setCredentials: (tokens: AuthTokens) => void;
        };
        const { tokens } = await client.getToken(code);
        client.setCredentials(tokens);
        return tokens;
    }

    getAuthUrl(): string {
        if (!this.initialized || !this.oauth2Client) {
            return '';
        }
        const client = this.oauth2Client as {
            generateAuthUrl: (opts: { access_type: string; scope: string[] }) => string;
        };
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.profile'],
        });
    }

    async refreshAccessToken(): Promise<AuthTokens> {
        if (!this.initialized || !this.oauth2Client) {
            throw new Error('OAuth client not initialized');
        }
        const client = this.oauth2Client as {
            refreshAccessToken: () => Promise<{ credentials: AuthTokens }>;
            setCredentials: (tokens: AuthTokens) => void;
        };
        const tokens = await client.refreshAccessToken();
        client.setCredentials(tokens.credentials);
        return tokens.credentials;
    }
}

export default AuthService;
export { AuthService };