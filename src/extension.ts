import * as vscode from 'vscode';
import { registerCommands } from './commands/index';
import { activateSidebar } from './ui/index';
import { connectToMCPServer } from './services/authService';

export function activate(context: vscode.ExtensionContext) {
    // Register commands
    registerCommands(context);

    // Activate the sidebar
    activateSidebar(context);

    // Connect to the MCP server
    connectToMCPServer();
}

export function deactivate() {
    // Clean up resources if necessary
}