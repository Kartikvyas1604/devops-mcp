import * as vscode from 'vscode';
import { CicdHandler } from './handlers/cicdHandler';
import { CloudHandler } from './handlers/cloudHandler';
import { ContainerHandler } from './handlers/containerHandler';
import { GitHandler } from './handlers/gitHandler';
import { InfrastructureHandler } from './handlers/infrastructureHandler';

/**
 * Command handler function type
 */
export type CommandHandler = (...args: unknown[]) => Promise<unknown>;

/**
 * Command registry for managing DevOps Omnibus commands
 */
export class CommandRegistry {
    private commandMap: Map<string, CommandHandler>;
    private disposables: vscode.Disposable[] = [];
    
    // Handler instances
    private cicdHandler: CicdHandler;
    private cloudHandler: CloudHandler;
    private containerHandler: ContainerHandler;
    private gitHandler: GitHandler;
    private infrastructureHandler: InfrastructureHandler;

    constructor() {
        this.commandMap = new Map();
        this.cicdHandler = new CicdHandler();
        this.cloudHandler = new CloudHandler();
        this.containerHandler = new ContainerHandler();
        this.gitHandler = new GitHandler();
        this.infrastructureHandler = new InfrastructureHandler();
        this.registerCommands();
    }

    private registerCommands(): void {
        // CICD commands
        this.register('devops.cicd.createPipeline', (config: unknown) => 
            this.cicdHandler.createPipeline(config));
        this.register('devops.cicd.triggerPipeline', (id: unknown) => 
            this.cicdHandler.triggerPipeline(id as string));
        this.register('devops.cicd.getPipelineStatus', (id: unknown) => 
            this.cicdHandler.getPipelineStatus(id as string));

        // Cloud commands
        this.register('devops.cloud.deploy', (provider: unknown, options: unknown) => 
            this.cloudHandler.deploy(provider as string, options));

        // Container commands
        this.register('devops.container.buildImage', (name: unknown, path: unknown) => 
            this.containerHandler.buildDockerImage(name as string, path as string));
        this.register('devops.container.runContainer', (image: unknown, name: unknown) => 
            this.containerHandler.runDockerContainer(image as string, name as string));
        this.register('devops.container.deployK8s', (config: unknown) => 
            this.containerHandler.deployToKubernetes(config));

        // Git commands
        this.register('devops.git.clone', (url: unknown, dest: unknown) => 
            this.gitHandler.cloneRepository(url as string, dest as string));
        this.register('devops.git.createPR', (repo: unknown, title: unknown, body: unknown) => 
            this.gitHandler.createPullRequest(repo as string, title as string, body as string));

        // Infrastructure commands
        this.register('devops.infra.createResource', (type: unknown, config: unknown) => 
            this.infrastructureHandler.createResource(type as string, config));
        this.register('devops.infra.deleteResource', (id: unknown) => 
            this.infrastructureHandler.deleteResource(id as string));
        this.register('devops.infra.listResources', () => 
            this.infrastructureHandler.listResources());
    }

    private register(command: string, handler: CommandHandler): void {
        this.commandMap.set(command, handler);
        const disposable = vscode.commands.registerCommand(command, handler);
        this.disposables.push(disposable);
    }

    /**
     * Register a custom command
     */
    registerCommand(command: string, handler: CommandHandler): vscode.Disposable {
        this.commandMap.set(command, handler);
        const disposable = vscode.commands.registerCommand(command, handler);
        this.disposables.push(disposable);
        return disposable;
    }

    /**
     * Dispose all registered commands
     */
    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.commandMap.clear();
    }
}

/**
 * Singleton command registry instance
 */
export const commandRegistry = new CommandRegistry();

/**
 * Helper to register a command
 */
export function registerCommand(command: string, handler: CommandHandler): vscode.Disposable {
    return commandRegistry.registerCommand(command, handler);
}