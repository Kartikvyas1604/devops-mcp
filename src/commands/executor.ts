import * as vscode from 'vscode';
import { MCPClient, MCPToolResult } from '../mcp/client';
import { SecretsService } from '../services/secretsService';
import { LoggingService } from '../services/loggingService';
import { IntentParser, ParsedIntent } from '../nlp/intentParser';
import { ProjectAnalyzer } from '../context/projectAnalyzer';

/**
 * Command execution result
 */
export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: unknown;
    toolsUsed?: string[];
    duration?: number;
}

/**
 * CommandExecutor - Processes natural language commands and executes them
 * Routes commands through NLP parsing, tool selection, and execution
 */
export class CommandExecutor {
    private mcpClient: MCPClient;
    private secretsService: SecretsService;
    private logger: LoggingService;
    private intentParser: IntentParser;
    private projectAnalyzer: ProjectAnalyzer;

    constructor(
        mcpClient: MCPClient,
        secretsService: SecretsService,
        logger: LoggingService
    ) {
        this.mcpClient = mcpClient;
        this.secretsService = secretsService;
        this.logger = logger;
        this.intentParser = new IntentParser();
        this.projectAnalyzer = new ProjectAnalyzer();
    }

    /**
     * Execute a natural language command
     * @param command - The natural language command
     * @param cancellationToken - Token to cancel the operation
     * @returns Execution result
     */
    async execute(
        command: string, 
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        const startTime = Date.now();
        this.logger.info(`Executing command: ${command}`);

        try {
            // Check for cancellation
            if (cancellationToken?.isCancellationRequested) {
                return { success: false, message: 'Operation cancelled' };
            }

            // Parse the intent from the command
            const intent = this.intentParser.parse(command);
            this.logger.debug('Parsed intent:', intent);

            // Get project context if workspace is open
            let projectContext = '';
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                projectContext = await this.projectAnalyzer.getProjectContext(
                    workspaceFolder.uri.fsPath
                );
            }

            // Route to appropriate handler based on intent
            const result = await this.routeIntent(intent, projectContext, cancellationToken);

            const duration = Date.now() - startTime;
            this.logger.info(`Command completed in ${duration}ms`);

            return {
                ...result,
                duration
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Command execution failed: ${errorMessage}`);
            
            return {
                success: false,
                message: `Execution failed: ${errorMessage}`,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Route intent to appropriate handler
     */
    private async routeIntent(
        intent: ParsedIntent,
        projectContext: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        const toolsUsed: string[] = [];

        switch (intent.category) {
            case 'docker':
                return this.handleDockerIntent(intent, toolsUsed, cancellationToken);

            case 'cicd':
                return this.handleCICDIntent(intent, toolsUsed, cancellationToken);

            case 'cloud':
                return this.handleCloudIntent(intent, toolsUsed, cancellationToken);

            case 'kubernetes':
                return this.handleKubernetesIntent(intent, toolsUsed, cancellationToken);

            case 'git':
                return this.handleGitIntent(intent, toolsUsed, cancellationToken);

            case 'jira':
                return this.handleJiraIntent(intent, toolsUsed, cancellationToken);

            case 'slack':
                return this.handleSlackIntent(intent, toolsUsed, cancellationToken);

            case 'vibe':
                return this.handleVibeIntent(intent, projectContext, toolsUsed, cancellationToken);

            default:
                return this.handleGenericIntent(intent, projectContext, toolsUsed);
        }
    }

    /**
     * Handle Docker-related intents
     */
    private async handleDockerIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        const action = intent.action || 'generate';

        if (action === 'generate' || intent.originalCommand.toLowerCase().includes('dockerfile')) {
            toolsUsed.push('generate_dockerfile');
            
            const result = await this.mcpClient.executeTool('generate_dockerfile', {
                projectPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            }, cancellationToken);

            if (result.success && result.data) {
                // Create the Dockerfile
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (workspaceFolder) {
                    const dockerfilePath = vscode.Uri.joinPath(workspaceFolder.uri, 'Dockerfile');
                    await vscode.workspace.fs.writeFile(
                        dockerfilePath, 
                        Buffer.from(result.data as string, 'utf-8')
                    );
                    
                    // Open the file
                    const doc = await vscode.workspace.openTextDocument(dockerfilePath);
                    await vscode.window.showTextDocument(doc);
                }

                return {
                    success: true,
                    message: 'Dockerfile generated successfully!',
                    data: result.data,
                    toolsUsed
                };
            }

            return {
                success: false,
                message: result.error || 'Failed to generate Dockerfile',
                toolsUsed
            };
        }

        if (action === 'build') {
            toolsUsed.push('docker_build');
            
            const result = await this.mcpClient.executeTool('docker_build', {
                imageName: intent.parameters?.imageName || 'myapp',
                tag: intent.parameters?.tag || 'latest'
            }, cancellationToken);

            return {
                success: result.success,
                message: result.success 
                    ? 'Docker image built successfully!' 
                    : (result.error || 'Build failed'),
                data: result.data,
                toolsUsed
            };
        }

        return {
            success: false,
            message: `Unknown Docker action: ${action}`,
            toolsUsed
        };
    }

    /**
     * Handle CI/CD-related intents
     */
    private async handleCICDIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('generate_cicd');

        const provider = intent.parameters?.provider || 'github-actions';
        
        const result = await this.mcpClient.executeTool('generate_cicd', {
            provider,
            projectPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        }, cancellationToken);

        if (result.success && result.data) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                let filePath: vscode.Uri;
                
                if (provider === 'github-actions') {
                    // Create .github/workflows directory
                    const workflowsDir = vscode.Uri.joinPath(workspaceFolder.uri, '.github', 'workflows');
                    await vscode.workspace.fs.createDirectory(workflowsDir);
                    filePath = vscode.Uri.joinPath(workflowsDir, 'ci.yml');
                } else if (provider === 'gitlab-ci') {
                    filePath = vscode.Uri.joinPath(workspaceFolder.uri, '.gitlab-ci.yml');
                } else {
                    filePath = vscode.Uri.joinPath(workspaceFolder.uri, 'Jenkinsfile');
                }

                await vscode.workspace.fs.writeFile(
                    filePath,
                    Buffer.from(result.data as string, 'utf-8')
                );

                const doc = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(doc);
            }

            return {
                success: true,
                message: `${provider} pipeline generated successfully!`,
                data: result.data,
                toolsUsed
            };
        }

        return {
            success: false,
            message: result.error || 'Failed to generate CI/CD pipeline',
            toolsUsed
        };
    }

    /**
     * Handle cloud deployment intents
     */
    private async handleCloudIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('deploy_cloud');

        // Check if credentials exist
        const provider = intent.parameters?.provider || 'aws';
        const hasCredentials = await this.secretsService.isConnected(provider);
        
        if (!hasCredentials) {
            return {
                success: false,
                message: `Not connected to ${provider.toUpperCase()}. Please connect first using the "Connect Service" command.`,
                toolsUsed
            };
        }

        const result = await this.mcpClient.executeTool('deploy_cloud', {
            provider,
            service: intent.parameters?.service || 'lambda',
            projectPath: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        }, cancellationToken);

        return {
            success: result.success,
            message: result.success 
                ? `Deployed to ${provider.toUpperCase()} successfully!` 
                : (result.error || 'Deployment failed'),
            data: result.data,
            toolsUsed
        };
    }

    /**
     * Handle Kubernetes intents
     */
    private async handleKubernetesIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('manage_kubernetes');

        const hasCredentials = await this.secretsService.isConnected('kubernetes');
        
        if (!hasCredentials) {
            return {
                success: false,
                message: 'Not connected to Kubernetes. Please connect first.',
                toolsUsed
            };
        }

        const result = await this.mcpClient.executeTool('manage_kubernetes', {
            action: intent.action || 'deploy',
            resource: intent.parameters?.resource
        }, cancellationToken);

        return {
            success: result.success,
            message: result.success 
                ? 'Kubernetes operation completed!' 
                : (result.error || 'Operation failed'),
            data: result.data,
            toolsUsed
        };
    }

    /**
     * Handle Git intents
     */
    private async handleGitIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('git_operations');

        const result = await this.mcpClient.executeTool('git_operations', {
            action: intent.action || 'commit',
            message: intent.parameters?.message
        }, cancellationToken);

        return {
            success: result.success,
            message: result.success 
                ? 'Git operation completed!' 
                : (result.error || 'Git operation failed'),
            data: result.data,
            toolsUsed
        };
    }

    /**
     * Handle Jira intents
     */
    private async handleJiraIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('create_jira_issue');

        const hasCredentials = await this.secretsService.isConnected('jira');
        
        if (!hasCredentials) {
            return {
                success: false,
                message: 'Not connected to Jira. Please connect first.',
                toolsUsed
            };
        }

        const result = await this.mcpClient.executeTool('create_jira_issue', {
            type: intent.parameters?.type || 'task',
            summary: intent.parameters?.summary,
            description: intent.parameters?.description
        }, cancellationToken);

        return {
            success: result.success,
            message: result.success 
                ? 'Jira issue created!' 
                : (result.error || 'Failed to create Jira issue'),
            data: result.data,
            toolsUsed
        };
    }

    /**
     * Handle Slack intents
     */
    private async handleSlackIntent(
        intent: ParsedIntent,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        toolsUsed.push('send_slack_message');

        const hasCredentials = await this.secretsService.isConnected('slack');
        
        if (!hasCredentials) {
            return {
                success: false,
                message: 'Not connected to Slack. Please connect first.',
                toolsUsed
            };
        }

        const result = await this.mcpClient.executeTool('send_slack_message', {
            channel: intent.parameters?.channel,
            message: intent.parameters?.message
        }, cancellationToken);

        return {
            success: result.success,
            message: result.success 
                ? 'Slack message sent!' 
                : (result.error || 'Failed to send Slack message'),
            data: result.data,
            toolsUsed
        };
    }

    /**
     * Handle Vibe coding intents
     */
    private async handleVibeIntent(
        intent: ParsedIntent,
        projectContext: string,
        toolsUsed: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<ExecutionResult> {
        // Vibe coding would involve AI to generate entire project structures
        // This is a placeholder for the full implementation
        
        return {
            success: true,
            message: 'Vibe coding feature is being set up. Describe what you want to build!',
            data: {
                intent: intent.originalCommand,
                context: projectContext
            },
            toolsUsed: ['vibe_engine']
        };
    }

    /**
     * Handle generic/unrecognized intents
     */
    private async handleGenericIntent(
        intent: ParsedIntent,
        projectContext: string,
        toolsUsed: string[]
    ): Promise<ExecutionResult> {
        // For unrecognized intents, we could route to an AI model
        // For now, provide helpful feedback
        
        const suggestions = [
            'Generate Dockerfile',
            'Set up CI/CD pipeline',
            'Deploy to AWS/GCP/Azure',
            'Create Jira issue',
            'Send Slack notification'
        ];

        return {
            success: false,
            message: `I couldn't understand that command. Try one of these:\n${suggestions.map(s => `• ${s}`).join('\n')}`,
            data: { intent, projectContext },
            toolsUsed
        };
    }
}
