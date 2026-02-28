import * as vscode from 'vscode';
import { McpClient, McpStatus } from '../mcp/mcpClient';

/**
 * Creates a status bar item that reflects the MCP connection status
 * and currently running tasks.
 */
export function createStatusBarItem(mcpClient: McpClient): vscode.StatusBarItem {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	item.text = 'DevOps Omnibus: Initializing…';
	item.command = 'devops-omnibus.openChat';

	const update = (status: McpStatus): void => {
		const prefix = status.connected ? '$(check) DevOps Omnibus' : '$(warning) DevOps Omnibus';
		const suffix =
			status.activeTasks > 0 ? ` – Running ${status.activeTasks} task(s)…` : status.connected ? '' : ' – Offline';
		item.text = `${prefix}${suffix}`;
		item.tooltip = status.connected
			? 'DevOps Omnibus MCP backend is connected.'
			: 'DevOps Omnibus MCP backend is not connected. Open the Output panel for details.';
	};

	update({ connected: false, activeTasks: 0 });

	mcpClient.onStatusChanged((status) => update(status));

	return item;
}

