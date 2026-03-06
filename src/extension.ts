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
        // Create status bar item
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.text = '🧞 GenieOps';
        statusBarItem.tooltip = 'Click to open GenieOps Chat';
        statusBarItem.command = 'genieops.openChat';
        statusBarItem.show();
        context.subscriptions.push(statusBarItem);

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
                try {
                    console.log('🧞 Opening GenieOps Chat Panel...');
                    chatPanel = ChatPanel.createOrShow(context.extensionUri, credentialManager, projectScanner);
                    console.log('✅ Chat panel created successfully');
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    console.error('❌ Failed to open chat panel:', error);
                    vscode.window.showErrorMessage(`Failed to open GenieOps Chat: ${errorMsg}`);
                }
            })
        );

        // Register main command
        context.subscriptions.push(
            vscode.commands.registerCommand('genieops.runCommand', async () => {
                try {
                    const input = await vscode.window.showInputBox({
                        placeHolder: 'Example: Deploy my Next.js app to Vercel',
                        prompt: 'What do you want to do? (Type ONE sentence)',
                        ignoreFocusOut: true
                    });

                    if (input) {
                        console.log('🧞 Running command with input:', input);
                        chatPanel = ChatPanel.createOrShow(context.extensionUri, credentialManager, projectScanner);
                        chatPanel.sendMessage(input);
                    }
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                    console.error('❌ Failed to run command:', error);
                    vscode.window.showErrorMessage(`Failed to execute command: ${errorMsg}`);
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

        // Check for API key and show welcome
        await checkAndPromptForApiKey(context);
        
        // Show activation success
        console.log('✅ GenieOps fully initialized and ready!');

    } catch (error) {
        vscode.window.showErrorMessage(`GenieOps activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function checkAndPromptForApiKey(context: vscode.ExtensionContext): Promise<void> {
    const config = vscode.workspace.getConfiguration('genieops');
    const geminiApiKey = config.get<string>('googleApiKey');
    const hasShownWelcome = context.globalState.get<boolean>('genieops.hasShownWelcome');

    if (!geminiApiKey || geminiApiKey.trim() === '') {
        // No API key configured - show setup wizard
        const choice = await vscode.window.showInformationMessage(
            '🧞 Welcome to GenieOps! Configure your Gemini API key to get started.',
            'Configure Now',
            'Later'
        );

        if (choice === 'Configure Now') {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your Gemini API Key (get it from https://makersuite.google.com/app/apikey)',
                placeHolder: 'AIzaSy...',
                password: true,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'API key cannot be empty';
                    }
                    if (!value.startsWith('AIza')) {
                        return 'Invalid Gemini API key format (should start with AIza)';
                    }
                    return null;
                }
            });

            if (apiKey) {
                await config.update('googleApiKey', apiKey, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(
                    '✅ Gemini API key configured! GenieOps is ready.',
                    'Open Chat',
                    'Run Command'
                ).then(action => {
                    if (action === 'Open Chat') {
                        vscode.commands.executeCommand('genieops.openChat');
                    } else if (action === 'Run Command') {
                        vscode.commands.executeCommand('genieops.runCommand');
                    }
                });
                await context.globalState.update('genieops.hasShownWelcome', true);
            }
        }
    } else if (!hasShownWelcome) {
        // API key exists but first time - show quick welcome
        const choice = await vscode.window.showInformationMessage(
            '🧞 GenieOps is ready! Click the genie icon in the Activity Bar or use commands.',
            'Open Chat',
            'Get Started'
        );

        if (choice === 'Get Started') {
            vscode.commands.executeCommand('genieops.runCommand');
        } else if (choice === 'Open Chat') {
            vscode.commands.executeCommand('genieops.openChat');
        }

        await context.globalState.update('genieops.hasShownWelcome', true);
    }
}

export function deactivate(): void {
    console.log('GenieOps deactivated');
}
