import * as vscode from 'vscode';
import { SidebarProvider } from './sidebar/SidebarProvider';
import { registerCommands } from './commands';
import { createStatusBarItem } from './statusBar/statusBar';
import { SecretStorageFacade } from './auth/secretStorage';
import { OAuthManager } from './auth/oauth';
import { McpClient } from './mcp/mcpClient';
import { initializeProjectContext } from './context/analyzer';

/**
 * Activates the Genie-ops extension.
 *
 * This is the main entry point that wires together:
 * - Secret storage
 * - MCP client connection
 * - Sidebar webview
 * - Commands
 * - Status bar indicators
 * - AI orchestration
 * - Project context analysis
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	const secretStorage = new SecretStorageFacade(context.secrets);
	const oauthManager = new OAuthManager(secretStorage);

	const mcpClient = new McpClient({
		extensionContext: context,
		secretStorage
	});

	// Start MCP client lazily; failures are surfaced via notifications.
	await mcpClient.start().catch((error: unknown) => {
		console.error('Failed to start MCP client', error);
		void vscode.window.showErrorMessage(
			'Genie-ops: Failed to start MCP backend. Open the Output panel for details.'
		);
	});

	const projectContextService = initializeProjectContext(context, mcpClient);

	const sidebarProvider = new SidebarProvider(
		context.extensionUri,
		mcpClient,
		secretStorage,
		projectContextService
	);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('genie-ops.chatView', sidebarProvider)
	);

	registerCommands(context, {
		mcpClient,
		oauthManager,
		secretStorage,
		projectContext: projectContextService,
		extensionUri: context.extensionUri,
		revealChat: () => sidebarProvider.reveal()
	});

	const statusBarItem = createStatusBarItem(mcpClient);
	context.subscriptions.push(statusBarItem);
	statusBarItem.show();
}

/**
 * Deactivates the extension.
 */
export async function deactivate(): Promise<void> {
	// At the moment, all cleanup is handled by VS Code disposables and MCP client teardown.
}

