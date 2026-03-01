import { AzureClient } from './azureClient';

export class AzureServices {
    private client: AzureClient;

    constructor() {
        this.client = new AzureClient();
    }

    public async createResourceGroup(name: string, location: string) {
        return this.client.createResourceGroup(name, location);
    }

    public async deployTemplate(resourceGroupName: string, template: object) {
        return this.client.deployTemplate(resourceGroupName, template);
    }

    public async listResources(resourceGroupName: string) {
        return this.client.listResources(resourceGroupName);
    }

    public async deleteResource(resourceGroupName: string, resourceName: string) {
        return this.client.deleteResource(resourceGroupName, resourceName);
    }

    // Additional Azure service-related functions can be added here
}