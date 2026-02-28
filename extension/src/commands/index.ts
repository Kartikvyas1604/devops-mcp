import * as vscode from 'vscode';
import { McpClient } from '../mcp/mcpClient';
import { SecretStorageFacade } from '../auth/secretStorage';
import { OAuthManager } from '../auth/oauth';
import { ProjectContextService } from '../context/analyzer';
import { ConnectionGraphPanel } from '../sidebar/ConnectionGraphPanel';

export interface CommandServices {
	mcpClient: McpClient;
	secretStorage: SecretStorageFacade;
	oauthManager: OAuthManager;
	projectContext: ProjectContextService;
	revealChat: () => void;
	extensionUri: vscode.Uri;
}

/**
 * Registers all Genie-ops commands with VS Code.
 */
export function registerCommands(
	context: vscode.ExtensionContext,
	services: CommandServices
): void {
	const { mcpClient, oauthManager, extensionUri, revealChat } = services;

	const disposables: vscode.Disposable[] = [];

	disposables.push(
		vscode.commands.registerCommand('genie-ops.openChat', () => {
			revealChat();
		})
	);

	disposables.push(
		vscode.commands.registerCommand('genie-ops.runTask', async () => {
			const prompt = await vscode.window.showInputBox({
				title: 'Genie-ops – Run DevOps Task',
				placeHolder: 'Describe what you want to do (e.g. "Set up CI/CD for this repo")',
				ignoreFocusOut: true
			});

			if (!prompt) {
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Genie-ops – Running task',
					cancellable: false
				},
				async () => {
					const result = await mcpClient.sendChat(prompt);
					const winner = result.modelResponses.find((r: any) => r.isWinner) ?? result.modelResponses[0];
					if (winner) {
						void vscode.window.showInformationMessage(
							`Genie-ops task processed by ${winner.displayName}. Open the sidebar for full details.`
						);
					}
				}
			);
		})
	);

	const connectServices = [
		{ command: 'genie-ops.connectService.github', label: 'GitHub', authFn: () => oauthManager.authenticateGitHub() },
		{ command: 'genie-ops.connectService.docker', label: 'Docker', authFn: () => Promise.resolve('local') },
		{ command: 'genie-ops.connectService.aws', label: 'AWS', authFn: () => oauthManager.authenticateAWS() },
		{ command: 'genie-ops.connectService.slack', label: 'Slack', authFn: () => oauthManager.authenticateSlack() },
		{ command: 'genie-ops.connectService.jira', label: 'Jira', authFn: () => oauthManager.authenticateJira() },
		{ command: 'genie-ops.connectService.gcp', label: 'Google Cloud', authFn: () => oauthManager.authenticateGCP() },
		{ command: 'genie-ops.connectService.azure', label: 'Azure', authFn: async () => {
			void vscode.window.showInformationMessage('Azure auth coming soon');
			return undefined;
		}},
		{ command: 'genie-ops.connectService.kubernetes', label: 'Kubernetes', authFn: async () => {
			const kubeconfigPath = await vscode.window.showInputBox({
				prompt: 'Enter path to kubeconfig (leave empty for default ~/.kube/config)',
				placeHolder: '~/.kube/config'
			});
			if (kubeconfigPath !== undefined) {
				await services.secretStorage.storeSecret('kubernetes.kubeconfig', kubeconfigPath || '~/.kube/config');
				return kubeconfigPath;
			}
			return undefined;
		}}
	] as const;

	for (const { command, label, authFn } of connectServices) {
		disposables.push(
			vscode.commands.registerCommand(command, async () => {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: `Connecting to ${label}...`,
						cancellable: false
					},
					async () => {
						const result = await authFn();
						if (result) {
							void vscode.window.showInformationMessage(`✓ Successfully connected to ${label}`);
						} else {
							void vscode.window.showWarningMessage(`${label} connection cancelled or failed`);
						}
					}
				);
			})
		);
	}

	disposables.push(
		vscode.commands.registerCommand('genie-ops.cloneEnvironment', async () => {
			void vscode.window.showInformationMessage(
				'Genie-ops: Environment cloning will appear here once cloud integrations are configured.'
			);
		})
	);

	disposables.push(
		vscode.commands.registerCommand('genie-ops.vibeCode', async () => {
			const prompt = await vscode.window.showInputBox({
				title: 'Genie-ops – Vibe Code Application',
				placeHolder: 'Describe the app you want to scaffold (stack, features, integrations)…',
				ignoreFocusOut: true
			});

			if (!prompt) {
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'Genie-ops – Generating project via Vibe Code',
					cancellable: false
				},
				async () => {
					const vibePrompt = `[VIBE CODE REQUEST] ${prompt}`;
					const result = await mcpClient.sendChat(vibePrompt);
					const winner = result.modelResponses.find((r: any) => r.isWinner) ?? result.modelResponses[0];
					if (winner) {
						void vscode.window.showInformationMessage(
							`✨ Vibe Code project scaffold generated. Check sidebar for details.`
						);
					}
				}
			);
		})
	);

	disposables.push(
		vscode.commands.registerCommand('genie-ops.disconnect', async () => {
			const services = [
				'GitHub',
				'Docker',
				'AWS',
				'Slack',
				'Jira',
				'Google Cloud',
				'Azure',
				'Kubernetes'
			];

			const selected = await vscode.window.showQuickPick(services, {
				placeHolder: 'Select service to disconnect'
			});

			if (selected) {
				await oauthManager.disconnect(selected);
			}
		})
	);

	disposables.push(
		vscode.commands.registerCommand('genie-ops.showConnectionGraph', () => {
			ConnectionGraphPanel.createOrShow(extensionUri, oauthManager);
		})
	);

	context.subscriptions.push(...disposables);
}

