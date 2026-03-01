/**
 * Azure Services - High-level Azure operations wrapper
 */

import { AzureClient, AzureResource, AzureResourceGroup } from './azureClient';

export class AzureServices {
    private client: AzureClient;

    constructor(subscriptionId?: string) {
        this.client = new AzureClient(subscriptionId || process.env.AZURE_SUBSCRIPTION_ID || '');
    }

    public async createResourceGroup(name: string, location: string): Promise<AzureResourceGroup | null> {
        return this.client.createResourceGroup(name, location);
    }

    public async listResources(): Promise<AzureResource[]> {
        return this.client.listResources();
    }

    public async getResourceGroup(resourceGroupName: string): Promise<AzureResourceGroup | null> {
        return this.client.getResourceGroup(resourceGroupName);
    }

    public async deleteResourceGroup(resourceGroupName: string): Promise<void> {
        return this.client.deleteResourceGroup(resourceGroupName);
    }
}