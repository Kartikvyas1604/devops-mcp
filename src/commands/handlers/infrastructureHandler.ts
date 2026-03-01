import { CommandHandler } from '../commandRegistry';
import { InfrastructureService } from '../../services/infrastructureService';
import { OutputChannel } from '../../ui/outputChannel';

export class InfrastructureHandler implements CommandHandler {
    private infrastructureService: InfrastructureService;
    private outputChannel: OutputChannel;

    constructor() {
        this.infrastructureService = new InfrastructureService();
        this.outputChannel = new OutputChannel('DevOps Omnibus');
    }

    public async createResource(resourceType: string, resourceConfig: any): Promise<void> {
        try {
            const result = await this.infrastructureService.createResource(resourceType, resourceConfig);
            this.outputChannel.appendLine(`Resource created: ${result}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error creating resource: ${error.message}`);
        }
    }

    public async deleteResource(resourceId: string): Promise<void> {
        try {
            await this.infrastructureService.deleteResource(resourceId);
            this.outputChannel.appendLine(`Resource deleted: ${resourceId}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error deleting resource: ${error.message}`);
        }
    }

    public async listResources(): Promise<void> {
        try {
            const resources = await this.infrastructureService.listResources();
            this.outputChannel.appendLine(`Resources: ${JSON.stringify(resources, null, 2)}`);
        } catch (error) {
            this.outputChannel.appendLine(`Error listing resources: ${error.message}`);
        }
    }
}