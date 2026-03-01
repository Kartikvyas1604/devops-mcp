import * as vscode from 'vscode';
import { SecretsService } from './services/secretsService';
import { LoggingService } from './services/loggingService';
import { ConfigService } from './services/configService';
import { ChatViewProvider } from './ui/webviews/chatPanel';
import { ConnectionsTreeProvider } from './ui/treeViews/connectionsTreeProvider';
import { PipelinesTreeProvider } from './ui/treeViews/pipelinesTreeProvider';
import { ResourcesTreeProvider } from './ui/treeViews/resourcesTreeProvider';
import { HistoryTreeProvider } from './ui/treeViews/historyTreeProvider';
import { StatusBarManager } from './ui/statusBar';
import { MCPClient } from './mcp/client';
import { ProjectAnalyzer } from './context/projectAnalyzer';
import { CommandExecutor } from './commands/executor';

/** Global extension state */
let extensionContext: vscode.ExtensionContext;
let mcpClient: MCPClient;
let secretsService: SecretsService;
let loggingService: LoggingService;
let configService: ConfigService;
let statusBarManager: StatusBarManager;
let commandExecutor: CommandExecutor;
let projectAnalyzer: ProjectAnalyzer;

/**
 * Called when the extension is activated
 * @param context - The extension context provided by VS Code
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    extensionContext = context;
    
    // Initialize core services
    loggingService = new LoggingService('DevOps Omnibus');
    loggingService.info('Activating DevOps Omnibus extension...');
    
    try {
        // Initialize services
        secretsService = new SecretsService(context);
        configService = new ConfigService();
        statusBarManager = new StatusBarManager();
        projectAnalyzer = new ProjectAnalyzer();
        
        // Initialize MCP client
        mcpClient = new MCPClient(configService, loggingService);
        
        // Initialize command executor
        commandExecutor = new CommandExecutor(mcpClient, secretsService, loggingService);
        
        // Register tree view providers
        const connectionsProvider = new ConnectionsTreeProvider(secretsService);
        const pipelinesProvider = new PipelinesTreeProvider();
        const resourcesProvider = new ResourcesTreeProvider();
        const historyProvider = new HistoryTreeProvider();
        
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('devops-omnibus.connectionsView', connectionsProvider),
            vscode.window.registerTreeDataProvider('devops-omnibus.pipelinesView', pipelinesProvider),
            vscode.window.registerTreeDataProvider('devops-omnibus.resourcesView', resourcesProvider),
            vscode.window.registerTreeDataProvider('devops-omnibus.historyView', historyProvider)
        );
        
        // Register WebView provider for chat
        const chatProvider = new ChatViewProvider(context.extensionUri, commandExecutor, loggingService);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('devops-omnibus.chatView', chatProvider)
        );
        
        // Register all commands
        registerCommands(context, connectionsProvider, pipelinesProvider, resourcesProvider, historyProvider);
        
        // Initialize status bar
        statusBarManager.initialize(context);
        
        // Auto-analyze project if enabled
        if (configService.get<boolean>('autoAnalyzeProject')) {
            analyzeCurrentProject();
        }
        
        // Start MCP server connection
        await mcpClient.connect();
        statusBarManager.setConnected(true);
        
        loggingService.info('DevOps Omnibus extension activated successfully!');
        vscode.window.showInformationMessage('DevOps Omnibus is ready! Press Cmd+Shift+D to run a command.');
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loggingService.error(`Failed to activate extension: ${errorMessage}`);
        vscode.window.showErrorMessage(`DevOps Omnibus activation failed: ${errorMessage}`);
    }
}

/**
 * Register all extension commands
 */
function registerCommands(
    context: vscode.ExtensionContext,
    connectionsProvider: ConnectionsTreeProvider,
    pipelinesProvider: PipelinesTreeProvider,
    resourcesProvider: ResourcesTreeProvider,
    historyProvider: HistoryTreeProvider
): void {
    
    // Main command - Run DevOps Command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.runCommand', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter your DevOps command in natural language',
                placeHolder: 'e.g., "Deploy this to AWS Lambda" or "Create a GitHub Actions pipeline"',
                ignoreFocusOut: true
            });
            
            if (input) {
                await executeCommand(input);
            }
        })
    );
    
    // Open Chat Panel
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.openChat', () => {
            vscode.commands.executeCommand('devops-omnibus.chatView.focus');
        })
    );
    
    // Connect Service
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.connectService', async () => {
            const services = [
                { label: '$(mark-github) GitHub', description: 'Connect to GitHub for repository management', value: 'github' },
                { label: '$(terminal) Docker', description: 'Connect to local Docker daemon', value: 'docker' },
                { label: '$(cloud) AWS', description: 'Connect to Amazon Web Services', value: 'aws' },
                { label: '$(azure) Azure', description: 'Connect to Microsoft Azure', value: 'azure' },
                { label: '$(cloud) Google Cloud', description: 'Connect to Google Cloud Platform', value: 'gcp' },
                { label: '$(server) Kubernetes', description: 'Connect to Kubernetes cluster', value: 'kubernetes' },
                { label: '$(comment-discussion) Slack', description: 'Connect to Slack workspace', value: 'slack' },
                { label: '$(checklist) Jira', description: 'Connect to Jira for issue tracking', value: 'jira' }
            ];
            
            const selected = await vscode.window.showQuickPick(services, {
                placeHolder: 'Select a service to connect',
                title: 'Connect Service'
            });
            
            if (selected) {
                await connectService(selected.value);
                connectionsProvider.refresh();
            }
        })
    );
    
    // Disconnect Service
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.disconnectService', async (node?: { serviceId: string }) => {
            if (node) {
                await disconnectService(node.serviceId);
            } else {
                const connectedServices = await secretsService.getConnectedServices();
                if (connectedServices.length === 0) {
                    vscode.window.showInformationMessage('No services connected.');
                    return;
                }
                
                const selected = await vscode.window.showQuickPick(
                    connectedServices.map(s => ({ label: s.name, value: s.id })),
                    { placeHolder: 'Select a service to disconnect' }
                );
                
                if (selected) {
                    await disconnectService(selected.value);
                }
            }
            connectionsProvider.refresh();
        })
    );
    
    // Show Connections
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.showConnections', async () => {
            const connections = await secretsService.getConnectedServices();
            if (connections.length === 0) {
                vscode.window.showInformationMessage('No services connected. Use "Connect Service" to add one.');
            } else {
                const items = connections.map(c => `${c.name}: ${c.status}`);
                vscode.window.showQuickPick(items, { placeHolder: 'Connected Services' });
            }
        })
    );
    
    // Analyze Project
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.analyzeProject', async () => {
            await analyzeCurrentProject();
        })
    );
    
    // Generate Dockerfile
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.generateDockerfile', async () => {
            await executeCommand('Generate a Dockerfile for this project');
        })
    );
    
    // Generate CI/CD Pipeline
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.generateCICD', async () => {
            const providers = [
                { label: 'GitHub Actions', value: 'github-actions' },
                { label: 'GitLab CI', value: 'gitlab-ci' },
                { label: 'Jenkins', value: 'jenkins' },
                { label: 'Azure DevOps', value: 'azure-devops' },
                { label: 'CircleCI', value: 'circleci' }
            ];
            
            const selected = await vscode.window.showQuickPick(providers, {
                placeHolder: 'Select CI/CD provider'
            });
            
            if (selected) {
                await executeCommand(`Generate a ${selected.label} CI/CD pipeline for this project`);
            }
        })
    );
    
    // Deploy to Cloud
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.deployToCloud', async () => {
            const providers = [
                { label: '$(cloud) AWS Lambda', value: 'aws-lambda' },
                { label: '$(cloud) AWS ECS', value: 'aws-ecs' },
                { label: '$(cloud) AWS EC2', value: 'aws-ec2' },
                { label: '$(cloud) Google Cloud Run', value: 'gcp-cloud-run' },
                { label: '$(cloud) Google Cloud Functions', value: 'gcp-functions' },
                { label: '$(azure) Azure App Service', value: 'azure-app-service' },
                { label: '$(azure) Azure Functions', value: 'azure-functions' },
                { label: '$(server) Kubernetes', value: 'kubernetes' }
            ];
            
            const selected = await vscode.window.showQuickPick(providers, {
                placeHolder: 'Select deployment target'
            });
            
            if (selected) {
                await executeCommand(`Deploy this project to ${selected.label}`);
            }
        })
    );
    
    // Vibe Code
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.vibeCode', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'Describe the application you want to create',
                placeHolder: 'e.g., "A Next.js app with Stripe payments, Auth0 authentication, and PostgreSQL"',
                ignoreFocusOut: true
            });
            
            if (input) {
                await executeCommand(`Vibe code: ${input}`);
            }
        })
    );
    
    // Clone Environment
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.cloneEnvironment', async () => {
            const environments = ['staging', 'production', 'development', 'testing'];
            const selected = await vscode.window.showQuickPick(environments, {
                placeHolder: 'Select target environment'
            });
            
            if (selected) {
                await executeCommand(`Clone current environment to ${selected}`);
            }
        })
    );
    
    // Manage Secrets
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.manageSecrets', async () => {
            const actions = [
                { label: '$(add) Add Secret', value: 'add' },
                { label: '$(edit) Edit Secret', value: 'edit' },
                { label: '$(trash) Delete Secret', value: 'delete' },
                { label: '$(sync) Sync Secrets', value: 'sync' },
                { label: '$(list-unordered) List Secrets', value: 'list' }
            ];
            
            const selected = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select action'
            });
            
            if (selected) {
                await handleSecretsAction(selected.value);
            }
        })
    );
    
    // Refresh Connections
    context.subscriptions.push(
        vscode.commands.registerCommand('devops-omnibus.refreshConnections', () => {
            connectionsProvider.refresh();
            pipelinesProvider.refresh();
            resourcesProvider.refresh();
            vscode.window.showInformationMessage('Connections refreshed');
        })
    );
}

/**
 * Execute a natural language command
 */
async function executeCommand(command: string): Promise<void> {
    loggingService.info(`Executing command: ${command}`);
    statusBarManager.setProcessing(true);
    
    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'DevOps Omnibus',
            cancellable: true
        }, async (progress, token) => {
            progress.report({ message: 'Processing command...' });
            
            const result = await commandExecutor.execute(command, token);
            
            if (result.success) {
                vscode.window.showInformationMessage(`✅ ${result.message}`);
            } else {
                vscode.window.showErrorMessage(`❌ ${result.message}`);
            }
            
            return result;
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loggingService.error(`Command execution failed: ${errorMessage}`);
        vscode.window.showErrorMessage(`Command failed: ${errorMessage}`);
    } finally {
        statusBarManager.setProcessing(false);
    }
}

/**
 * Connect to a service
 */
async function connectService(serviceId: string): Promise<void> {
    loggingService.info(`Connecting to service: ${serviceId}`);
    
    try {
        switch (serviceId) {
            case 'github':
                await connectGitHub();
                break;
            case 'docker':
                await connectDocker();
                break;
            case 'aws':
                await connectAWS();
                break;
            case 'azure':
                await connectAzure();
                break;
            case 'gcp':
                await connectGCP();
                break;
            case 'kubernetes':
                await connectKubernetes();
                break;
            case 'slack':
                await connectSlack();
                break;
            case 'jira':
                await connectJira();
                break;
            default:
                throw new Error(`Unknown service: ${serviceId}`);
        }
        
        vscode.window.showInformationMessage(`Successfully connected to ${serviceId}!`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loggingService.error(`Failed to connect to ${serviceId}: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to connect: ${errorMessage}`);
    }
}

/**
 * Disconnect from a service
 */
async function disconnectService(serviceId: string): Promise<void> {
    loggingService.info(`Disconnecting from service: ${serviceId}`);
    
    try {
        await secretsService.deleteCredentials(serviceId);
        vscode.window.showInformationMessage(`Disconnected from ${serviceId}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loggingService.error(`Failed to disconnect from ${serviceId}: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to disconnect: ${errorMessage}`);
    }
}

/**
 * Service connection implementations
 */
async function connectGitHub(): Promise<void> {
    const session = await vscode.authentication.getSession('github', ['repo', 'workflow'], { createIfNone: true });
    await secretsService.storeCredentials('github', { token: session.accessToken });
    loggingService.info('GitHub connected successfully');
}

async function connectDocker(): Promise<void> {
    // Docker uses local socket, no credentials needed
    await secretsService.storeCredentials('docker', { connected: true, host: 'unix:///var/run/docker.sock' });
    loggingService.info('Docker connected successfully');
}

async function connectAWS(): Promise<void> {
    const accessKeyId = await vscode.window.showInputBox({
        prompt: 'Enter AWS Access Key ID',
        password: false,
        ignoreFocusOut: true
    });
    
    if (!accessKeyId) { return; }
    
    const secretAccessKey = await vscode.window.showInputBox({
        prompt: 'Enter AWS Secret Access Key',
        password: true,
        ignoreFocusOut: true
    });
    
    if (!secretAccessKey) { return; }
    
    const region = await vscode.window.showQuickPick(
        ['us-east-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-northeast-1'],
        { placeHolder: 'Select AWS Region' }
    );
    
    if (!region) { return; }
    
    await secretsService.storeCredentials('aws', { accessKeyId, secretAccessKey, region });
    loggingService.info('AWS connected successfully');
}

async function connectAzure(): Promise<void> {
    const session = await vscode.authentication.getSession('microsoft', ['https://management.azure.com/.default'], { createIfNone: true });
    await secretsService.storeCredentials('azure', { token: session.accessToken });
    loggingService.info('Azure connected successfully');
}

async function connectGCP(): Promise<void> {
    const projectId = await vscode.window.showInputBox({
        prompt: 'Enter GCP Project ID',
        ignoreFocusOut: true
    });
    
    if (!projectId) { return; }
    
    // In production, implement proper OAuth flow
    await secretsService.storeCredentials('gcp', { projectId });
    loggingService.info('GCP connected successfully');
}

async function connectKubernetes(): Promise<void> {
    const kubeconfigPath = await vscode.window.showInputBox({
        prompt: 'Enter path to kubeconfig (leave empty for default)',
        placeHolder: '~/.kube/config',
        ignoreFocusOut: true
    });
    
    await secretsService.storeCredentials('kubernetes', { 
        kubeconfigPath: kubeconfigPath || '~/.kube/config' 
    });
    loggingService.info('Kubernetes connected successfully');
}

async function connectSlack(): Promise<void> {
    const botToken = await vscode.window.showInputBox({
        prompt: 'Enter Slack Bot Token',
        password: true,
        ignoreFocusOut: true
    });
    
    if (!botToken) { return; }
    
    await secretsService.storeCredentials('slack', { botToken });
    loggingService.info('Slack connected successfully');
}

async function connectJira(): Promise<void> {
    const domain = await vscode.window.showInputBox({
        prompt: 'Enter Jira domain (e.g., your-company.atlassian.net)',
        ignoreFocusOut: true
    });
    
    if (!domain) { return; }
    
    const email = await vscode.window.showInputBox({
        prompt: 'Enter Jira email',
        ignoreFocusOut: true
    });
    
    if (!email) { return; }
    
    const apiToken = await vscode.window.showInputBox({
        prompt: 'Enter Jira API Token',
        password: true,
        ignoreFocusOut: true
    });
    
    if (!apiToken) { return; }
    
    await secretsService.storeCredentials('jira', { domain, email, apiToken });
    loggingService.info('Jira connected successfully');
}

/**
 * Analyze the current project
 */
async function analyzeCurrentProject(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing project...',
        cancellable: false
    }, async () => {
        const analysis = await projectAnalyzer.analyze(workspaceFolder.uri.fsPath);
        
        const message = `Project: ${analysis.framework || 'Unknown'} | ` +
            `Language: ${analysis.language || 'Unknown'} | ` +
            `Has Docker: ${analysis.hasDocker} | ` +
            `Has CI/CD: ${analysis.hasCICD}`;
        
        vscode.window.showInformationMessage(message);
        loggingService.info(`Project analysis complete: ${JSON.stringify(analysis)}`);
    });
}

/**
 * Handle secrets management actions
 */
async function handleSecretsAction(action: string): Promise<void> {
    switch (action) {
        case 'add':
            const key = await vscode.window.showInputBox({ prompt: 'Enter secret key' });
            if (!key) { return; }
            const value = await vscode.window.showInputBox({ prompt: 'Enter secret value', password: true });
            if (!value) { return; }
            await secretsService.storeSecret(key, value);
            vscode.window.showInformationMessage(`Secret '${key}' added`);
            break;
            
        case 'delete':
            const secrets = await secretsService.listSecrets();
            const selected = await vscode.window.showQuickPick(secrets, { placeHolder: 'Select secret to delete' });
            if (selected) {
                await secretsService.deleteSecret(selected);
                vscode.window.showInformationMessage(`Secret '${selected}' deleted`);
            }
            break;
            
        case 'list':
            const allSecrets = await secretsService.listSecrets();
            if (allSecrets.length === 0) {
                vscode.window.showInformationMessage('No secrets stored');
            } else {
                vscode.window.showQuickPick(allSecrets, { placeHolder: 'Stored secrets' });
            }
            break;
            
        case 'sync':
            await executeCommand('Sync secrets to configured backend');
            break;
    }
}

/**
 * Called when the extension is deactivated
 */
export function deactivate(): void {
    loggingService?.info('DevOps Omnibus extension deactivating...');
    mcpClient?.disconnect();
    statusBarManager?.dispose();
    loggingService?.info('DevOps Omnibus extension deactivated');
}