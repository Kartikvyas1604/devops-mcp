import { DefaultAzureCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';

export class AzureClient {
    private resourceClient: ResourceManagementClient;

    constructor(subscriptionId: string) {
        const credentials = new DefaultAzureCredential();
        this.resourceClient = new ResourceManagementClient(credentials, subscriptionId);
    }

    public async listResources() {
        const resources = await this.resourceClient.resources.list();
        return resources;
    }

    public async getResourceGroup(resourceGroupName: string) {
        const resourceGroup = await this.resourceClient.resourceGroups.get(resourceGroupName);
        return resourceGroup;
    }

    public async createResourceGroup(resourceGroupName: string, location: string) {
        const resourceGroupParams = {
            location: location,
        };
        const result = await this.resourceClient.resourceGroups.createOrUpdate(resourceGroupName, resourceGroupParams);
        return result;
    }

    public async deleteResourceGroup(resourceGroupName: string) {
        await this.resourceClient.resourceGroups.deleteMethod(resourceGroupName);
    }
}