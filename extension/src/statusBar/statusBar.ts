import * as vscode from 'vscode';
import { McpClient, McpStatus } from '../mcp/mcpClient';

/**
 * Creates a status bar item that reflects the MCP connection status
 * and currently running tasks.
 */
export function createStatusBarItem(mcpClient: McpClient): vscode.StatusBarItem {
	const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	item.text = 'Genie-ops: Initializing…';
	item.command = 'genie-ops.openChat';

	const update = (status: McpStatus): void => {
		const prefix = status.connected ? '$(check) Genie-ops' : '$(warning) Genie-ops';
		const suffix =
			status.activeTasks > 0 ? ` – Running ${status.activeTasks} task(s)…` : status.connected ? '' : ' – Offline';
		item.text = `${prefix}${suffix}`;
		item.tooltip = status.connected
			? 'Genie-ops MCP backend is connected.'
			: 'Genie-ops MCP backend is not connected. Open the Output panel for details.';
	};

	update({ connected: false, activeTasks: 0 });

	mcpClient.onStatusChanged((status) => update(status));

	return item;
}

