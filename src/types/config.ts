export interface Config {
    apiUrl: string;
    timeout: number;
    retryAttempts: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    services: {
        aws: {
            accessKeyId: string;
            secretAccessKey: string;
            region: string;
        };
        azure: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
        };
        gcp: {
            projectId: string;
            keyFile: string;
        };
        github: {
            token: string;
        };
        gitlab: {
            token: string;
        };
        jenkins: {
            url: string;
            username: string;
            apiToken: string;
        };
    };
}