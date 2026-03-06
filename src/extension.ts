import * as vscode from 'vscode';
import { CredentialManager } from './auth/CredentialManager';
import { OAuthWebView } from './auth/OAuthWebView';
import { ProjectScanner } from './scanner/ProjectScanner';
import { ServiceType, ConnectionStatus } from './shared/types';
import { ProjectAnalyzer } from './context/projectAnalyzer';
import { ChatPanel } from './ui/chatPanel';
import { ConnectionsTreeProvider } from './ui/treeViews/connectionsTreeProvider';
import { ResourcesTreeProvider } from './ui/treeViews/resourcesTreeProvider';
import { PipelinesTreeProvider } from './ui/treeViews/pipelinesTreeProvider';
import { HistoryTreeProvider } from './ui/treeViews/historyTreeProvider';

let credentialManager: CredentialManager;
let oauthWebView: OAuthWebView;
let projectScanner: ProjectScanner;
let projectAnalyzer: ProjectAnalyzer;
let chatPanel: ChatPanel | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('🧞 GenieOps is now active!');

    try {
        // Initialize services
        credentialManager = new CredentialManager(context);
        oauthWebView = new OAuthWebView(context);
        projectScanner = new ProjectScanner();
        projectAnalyzer = new ProjectAnalyzer();
        
        // Initialize tree view providers
        const connectionsProvider = new ConnectionsTreeProvider(credentialManager);
        const resourcesProvider = new ResourcesTreeProvider();
        const pipelinesProvider = new PipelinesTreeProvider();
        const historyProvider = new HistoryTreeProvider();
        
        // Register tree views
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider('genieops.connectionsView', connectionsProvider),
            vscode.window.registerTreeDataProvider('genieops.resourcesView', resourcesProvider),
            vscode.window.registerTreeDataProvider('genieops.pipelinesView', pipelinesProvider),
            vscode.window.registerTreeDataProvider('genieops.historyView', historyProvider)
        );
        
        // Register chat command
        context.subscriptions.push(
            vscode.commands.registerCommand('genieops.openChat', () => {
                chatPanel = ChatPanel.createOrShow(context.extensionUri, credentialManager, projectScanner);
            })
        );
        
        // Register main command
        context.subscriptions.push(
            vscode.commands.registerCommand('genieops.runCommand', async () => {
                const input = await vscode.window.showInputBox({
                    placeHolder: 'Example: Deploy my Next.js app to Vercel',
                    prompt: 'What do you want to do? (Type ONE sentence)',
                    ignoreFocusOut: true
                });
                
                if (input) {
                    chatPanel = ChatPanel.createOrShow(context.extensionUri, credentialManager, projectScanner);
                    chatPanel.sendMessage(input);
                }
            })
        );
        
        // Refresh tree views commands
        context.subscriptions.push(
            vscode.commands.registerCommand('genieops.refreshConnections', () => {
                connectionsProvider.refresh();
            }),
            vscode.commands.registerCommand('genieops.refreshResources', () => {
                resourcesProvider.refresh();
            })
        );

        // Analyze project command
        context.subscriptions.push(
            vscode.commands.registerCommand('genieops.analyzeProject', async () => {
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('No workspace folder open');
                    return;
                }

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Analyzing project...',
                    cancellable: false
                }, async () => {
                    const analysis = await projectAnalyzer.analyze(workspaceFolder.uri.fsPath);

                    const info = [
                        `Framework: ${analysis.framework || 'Unknown'}`,
                        `Language: ${analysis.language || 'Unknown'}`,
                        `Package Manager: ${analysis.packageManager || 'Unknown'}`,
                        analysis.hasDocker ? '✅ Docker configured' : '❌ No Docker',
                        analysis.hasCICD ? `✅ CI/CD configured` : '❌ No CI/CD',
                        analysis.hasTests ? '✅ Tests configured' : '❌ No Tests'
                    ].join('\n');

                    vscode.window.showInformationMessage(info, { modal: true });
                });
            })
        );

        // Connect Service commands
        const services = [
            { cmd: 'genieops.connectService.aws', type: ServiceType.AWS, name: 'AWS' },
            { cmd: 'genieops.connectService.gcp', type: ServiceType.GCP, name: 'GCP' },
            { cmd: 'genieops.connectService.azure', type: ServiceType.AZURE, name: 'Azure' },
            { cmd: 'genieops.connectService.vercel', type: ServiceType.VERCEL, name: 'Vercel' },
            { cmd: 'genieops.connectService.docker', type: ServiceType.DOCKER, name: 'Docker' },
            { cmd: 'genieops.connectService.github', type: ServiceType.GITHUB, name: 'GitHub' },
            { cmd: 'genieops.connectService.slack', type: ServiceType.SLACK, name: 'Slack' },
            { cmd: 'genieops.connectService.jira', type: ServiceType.JIRA, name: 'Jira' }
        ];

        for (const service of services) {
            context.subscriptions.push(
                vscode.commands.registerCommand(service.cmd, async () => {
                    const apiKey = await vscode.window.showInputBox({
                        prompt: `Enter your ${service.name} API key or token`,
                        password: true,
                        ignoreFocusOut: true
                    });

                    if (apiKey) {
                        await credentialManager.storeApiKey(service.type, apiKey);
                        await credentialManager.updateConnectionStatus(service.type, ConnectionStatus.CONNECTED);
                        vscode.window.showInformationMessage(`✅ Connected to ${service.name}!`);
                        connectionsProvider.refresh();
                    }
                })
            );
        }

        // Show welcome
        vscode.window.showInformationMessage(
            '🧞 GenieOps activated! Type "GenieOps: Run Command" to get started.',
            'Open Chat', 'Get Started'
        ).then(selection => {
            if (selection === 'Get Started') {
                vscode.commands.executeCommand('genieops.runCommand');
            } else if (selection === 'Open Chat') {
                vscode.commands.executeCommand('genieops.openChat');
            }
        });

    } catch (error) {
        vscode.window.showErrorMessage(`GenieOps activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export function deactivate(): void {
    console.log('GenieOps deactivated');
}
