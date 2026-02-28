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
 * Registers all Genie-ops commands with VS Code.
 */
export function registerCommands(
	context: vscode.ExtensionContext,
	services: CommandServices
): void {
	const { mcpClient, revealChat } = services;

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
					const winner = result.modelResponses.find((r) => r.isWinner) ?? result.modelResponses[0];
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
		{ command: 'genie-ops.connectService.github', label: 'GitHub' },
		{ command: 'genie-ops.connectService.docker', label: 'Docker' },
		{ command: 'genie-ops.connectService.aws', label: 'AWS' },
		{ command: 'genie-ops.connectService.slack', label: 'Slack' },
		{ command: 'genie-ops.connectService.jira', label: 'Jira' },
		{ command: 'genie-ops.connectService.gcp', label: 'Google Cloud' },
		{ command: 'genie-ops.connectService.azure', label: 'Azure' },
		{ command: 'genie-ops.connectService.kubernetes', label: 'Kubernetes' }
	] as const;

	for (const { command, label } of connectServices) {
		disposables.push(
			vscode.commands.registerCommand(command, async () => {
				void vscode.window.showInformationMessage(
					`Genie-ops: ${label} connection flows will appear here.`
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
					title: 'Genie-ops – Vibe coding in progress',
					cancellable: false
				},
				async () => {
					await mcpClient.sendChat(`VIBE_CODING_REQUEST:: ${prompt}`);
					void vscode.window.showInformationMessage(
						'Genie-ops: Vibe coding plan generated. Open the sidebar for details.'
					);
				}
			);
		})
	);

	disposables.push(
		vscode.commands.registerCommand('genie-ops.rollbackLastAction', async () => {
			void vscode.window.showInformationMessage(
				'Genie-ops: Rollback of the last action will appear here once change tracking is wired.'
			);
		})
	);

	for (const disposable of disposables) {
		context.subscriptions.push(disposable);
	}
}

