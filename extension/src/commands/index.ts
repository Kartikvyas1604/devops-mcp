import * as vscode from 'vscode';
import { McpClient } from '../mcp/mcpClient';
import { SecretStorageFacade } from '../auth/secretStorage';
import { ProjectContextService } from '../context/analyzer';

export interface CommandServices {
	mcpClient: McpClient;
	secretStorage: SecretStorageFacade;
	projectContext: ProjectContextService;
	revealChat: () => void;
}

/**
 * Registers all DevOps Omnibus commands with VS Code.
 */
export function registerCommands(
	context: vscode.ExtensionContext,
	services: CommandServices
): void {
	const { mcpClient, revealChat } = services;

	const disposables: vscode.Disposable[] = [];

	disposables.push(
		vscode.commands.registerCommand('devops-omnibus.openChat', () => {
			revealChat();
		})
	);

	disposables.push(
		vscode.commands.registerCommand('devops-omnibus.runTask', async () => {
			const prompt = await vscode.window.showInputBox({
				title: 'DevOps Omnibus – Run DevOps Task',
				placeHolder: 'Describe what you want to do (e.g. "Set up CI/CD for this repo")',
				ignoreFocusOut: true
			});

			if (!prompt) {
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'DevOps Omnibus – Running task',
					cancellable: false
				},
				async () => {
					const result = await mcpClient.sendChat(prompt);
					// For now we just show a short summary; the sidebar displays full details.
					const winner = result.modelResponses.find((r) => r.isWinner) ?? result.modelResponses[0];
					if (winner) {
						void vscode.window.showInformationMessage(
							`DevOps Omnibus task processed by ${winner.displayName}. Open the sidebar for full details.`
						);
					}
				}
			);
		})
	);

	const connectServices = [
		{ command: 'devops-omnibus.connectService.github', label: 'GitHub' },
		{ command: 'devops-omnibus.connectService.docker', label: 'Docker' },
		{ command: 'devops-omnibus.connectService.aws', label: 'AWS' },
		{ command: 'devops-omnibus.connectService.slack', label: 'Slack' },
		{ command: 'devops-omnibus.connectService.jira', label: 'Jira' },
		{ command: 'devops-omnibus.connectService.gcp', label: 'Google Cloud' },
		{ command: 'devops-omnibus.connectService.azure', label: 'Azure' },
		{ command: 'devops-omnibus.connectService.kubernetes', label: 'Kubernetes' }
	] as const;

	for (const { command, label } of connectServices) {
		disposables.push(
			vscode.commands.registerCommand(command, async () => {
				void vscode.window.showInformationMessage(
					`DevOps Omnibus: ${label} connection flows will appear here.`
				);
			})
		);
	}

	disposables.push(
		vscode.commands.registerCommand('devops-omnibus.cloneEnvironment', async () => {
			void vscode.window.showInformationMessage(
				'DevOps Omnibus: Environment cloning will appear here once cloud integrations are configured.'
			);
		})
	);

	disposables.push(
		vscode.commands.registerCommand('devops-omnibus.vibeCode', async () => {
			const prompt = await vscode.window.showInputBox({
				title: 'DevOps Omnibus – Vibe Code Application',
				placeHolder: 'Describe the app you want to scaffold (stack, features, integrations)…',
				ignoreFocusOut: true
			});

			if (!prompt) {
				return;
			}

			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: 'DevOps Omnibus – Vibe coding in progress',
					cancellable: false
				},
				async () => {
					await mcpClient.sendChat(`VIBE_CODING_REQUEST:: ${prompt}`);
					void vscode.window.showInformationMessage(
						'DevOps Omnibus: Vibe coding plan generated. Open the sidebar for details.'
					);
				}
			);
		})
	);

	disposables.push(
		vscode.commands.registerCommand('devops-omnibus.rollbackLastAction', async () => {
			void vscode.window.showInformationMessage(
				'DevOps Omnibus: Rollback of the last action will appear here once change tracking is wired.'
			);
		})
	);

	for (const disposable of disposables) {
		context.subscriptions.push(disposable);
	}
}

