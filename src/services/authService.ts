import { OAuth2Client } from 'google-auth-library';

class AuthService {
    private oauth2Client: OAuth2Client;

    constructor(clientId: string, clientSecret: string, redirectUri: string) {
        this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    }

    async authenticate(code: string): Promise<any> {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    getAuthUrl(): string {
        const authUrl = this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: ['https://www.googleapis.com/auth/userinfo.profile'],
        });
        return authUrl;
    }

    async refreshAccessToken(): Promise<any> {
        const tokens = await this.oauth2Client.refreshAccessToken();
        this.oauth2Client.setCredentials(tokens.credentials);
        return tokens.credentials;
    }
}

export default AuthService;