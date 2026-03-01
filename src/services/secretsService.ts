import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as AWS from 'aws-sdk';
import { AzureKeyVault } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class SecretsService {
    private gcpClient: SecretManagerServiceClient;
    private awsClient: AWS.SecretsManager;
    private azureClient: AzureKeyVault;

    constructor() {
        this.gcpClient = new SecretManagerServiceClient();
        this.awsClient = new AWS.SecretsManager();
        this.azureClient = new AzureKeyVault(new DefaultAzureCredential());
    }

    async getSecretFromGCP(secretName: string): Promise<string> {
        const [version] = await this.gcpClient.accessSecretVersion({ name: secretName });
        return version.payload.data.toString('utf8');
    }

    async getSecretFromAWS(secretId: string): Promise<string> {
        const data = await this.awsClient.getSecretValue({ SecretId: secretId }).promise();
        return data.SecretString || '';
    }

    async getSecretFromAzure(secretName: string): Promise<string> {
        const secret = await this.azureClient.getSecret(secretName);
        return secret.value || '';
    }

    async setSecretInGCP(secretName: string, payload: string): Promise<void> {
        const [secret] = await this.gcpClient.createSecret({
            parent: 'projects/YOUR_PROJECT_ID',
            secretId: secretName,
            secret: { replication: { automatic: {} } },
        });
        await this.gcpClient.addSecretVersion({
            parent: secret.name,
            payload: { data: Buffer.from(payload) },
        });
    }

    async setSecretInAWS(secretId: string, payload: string): Promise<void> {
        await this.awsClient.createSecret({
            Name: secretId,
            SecretString: payload,
        }).promise();
    }

    async setSecretInAzure(secretName: string, payload: string): Promise<void> {
        await this.azureClient.setSecret(secretName, payload);
    }
}