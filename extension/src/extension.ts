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
	try {
		console.log('Genie-ops: Starting activation...');
		
		const secretStorage = new SecretStorageFacade(context.secrets);
		console.log('Genie-ops: SecretStorage initialized');
		
		const oauthManager = new OAuthManager(secretStorage);
		console.log('Genie-ops: OAuthManager initialized');

		const mcpClient = new McpClient({
			extensionContext: context,
			secretStorage
		});
		console.log('Genie-ops: McpClient created');

		// Start MCP client lazily; failures are surfaced via notifications.
		await mcpClient.start().catch((error: unknown) => {
			console.error('Failed to start MCP client', error);
			void vscode.window.showErrorMessage(
				'Genie-ops: Failed to start MCP backend. Open the Output panel for details.'
			);
		});
		console.log('Genie-ops: MCP client started');

		const projectContextService = initializeProjectContext(context, mcpClient);
		console.log('Genie-ops: Project context initialized');

		const sidebarProvider = new SidebarProvider(
			context.extensionUri,
			mcpClient,
			secretStorage,
			projectContextService
		);
		console.log('Genie-ops: Sidebar provider created');

		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider('genie-ops.chatView', sidebarProvider)
		);
		console.log('Genie-ops: Webview provider registered');

		registerCommands(context, {
			mcpClient,
			oauthManager,
			secretStorage,
			projectContext: projectContextService,
			extensionUri: context.extensionUri,
			revealChat: () => sidebarProvider.reveal()
		});
		console.log('Genie-ops: Commands registered');

		const statusBarItem = createStatusBarItem(mcpClient);
		context.subscriptions.push(statusBarItem);
		statusBarItem.show();
		console.log('Genie-ops: Status bar created');
		
		console.log('Genie-ops: Activation completed successfully');
	} catch (error) {
		console.error('Genie-ops activation failed:', error);
		void vscode.window.showErrorMessage(
			`Genie-ops failed to activate: ${error instanceof Error ? error.message : String(error)}`
		);
		throw error;
	}
}

/**
 * Deactivates the extension.
 */
export async function deactivate(): Promise<void> {
	// At the moment, all cleanup is handled by VS Code disposables and MCP client teardown.
}

