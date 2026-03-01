import { CommandHandler } from '../commandRegistry';
import { AwsClient } from '../../providers/aws/awsClient';
import { AzureClient } from '../../providers/azure/azureClient';
import { GcpClient } from '../../providers/gcp/gcpClient';

const awsClient = new AwsClient();
const azureClient = new AzureClient();
const gcpClient = new GcpClient();

export const handleCloudCommand: CommandHandler = async (command: string, options: any) => {
    switch (command) {
        case 'aws:deploy':
            return await awsClient.deploy(options);
        case 'azure:deploy':
            return await azureClient.deploy(options);
        case 'gcp:deploy':
            return await gcpClient.deploy(options);
        default:
            throw new Error('Unknown cloud command');
    }
};