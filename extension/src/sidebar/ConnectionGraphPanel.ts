/**
 * Connection Graph WebView Panel
 * 
 * Displays a visual graph of all connected services with health status,
 * cost information, and credential status.
 */

import * as vscode from 'vscode';
import { OAuthManager } from '../auth/oauth';

export class ConnectionGraphPanel {
	public static currentPanel: ConnectionGraphPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		private oauthManager: OAuthManager
	) {
		this._panel = panel;
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
		this._panel.webview.html = this._getHtmlContent(extensionUri);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				switch (message.type) {
					case 'disconnect':
						await this.oauthManager.disconnect(message.service);
						// Refresh the graph
						await this.refresh();
						break;
					case 'refresh':
						await this.refresh();
						break;
				}
			},
			null,
			this._disposables
		);

		// Initial refresh
		void this.refresh();
	}

	public static createOrShow(extensionUri: vscode.Uri, oauthManager: OAuthManager) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (ConnectionGraphPanel.currentPanel) {
			ConnectionGraphPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			'genieOpsConnectionGraph',
			'Genie-ops: Connection Graph',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		ConnectionGraphPanel.currentPanel = new ConnectionGraphPanel(
			panel,
			extensionUri,
			oauthManager
		);
	}

	private async refresh() {
		const services = ['github', 'docker', 'aws', 'slack', 'jira', 'gcp', 'azure', 'kubernetes'];
		
		const connections = await Promise.all(
			services.map(async (service) => ({
				name: service,
				connected: await this.oauthManager.isAuthenticated(service),
				health: await this.checkServiceHealth(service),
			}))
		);

		this._panel.webview.postMessage({
			type: 'updateGraph',
			connections,
		});
	}

	private async checkServiceHealth(service: string): Promise<'healthy' | 'degraded' | 'down' | 'unknown'> {
		// In production, would ping each service API
		const isAuthenticated = await this.oauthManager.isAuthenticated(service);
		if (!isAuthenticated) {
			return 'unknown';
		}
		// Placeholder: all authenticated services are healthy
		return 'healthy';
	}

	private _getHtmlContent(extensionUri: vscode.Uri): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Genie-ops Connection Graph</title>
	<style>
		body {
			padding: 20px;
			font-family: var(--vscode-font-family);
			background: var(--vscode-editor-background);
			color: var(--vscode-editor-foreground);
		}
		
		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 30px;
		}
		
		h1 {
			margin: 0;
			font-size: 24px;
		}
		
		.refresh-btn {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			padding: 8px 16px;
			cursor: pointer;
			border-radius: 4px;
		}
		
		.refresh-btn:hover {
			background: var(--vscode-button-hoverBackground);
		}
		
		.graph-container {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
			gap: 20px;
			margin-top: 20px;
		}
		
		.service-card {
			border: 1px solid var(--vscode-panel-border);
			border-radius: 8px;
			padding: 20px;
			transition: transform 0.2s, box-shadow 0.2s;
			position: relative;
		}
		
		.service-card:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}
		
		.service-card.connected {
			border-color: #4caf50;
			background: rgba(76, 175, 80, 0.05);
		}
		
		.service-card.disconnected {
			border-color: #ff9800;
			opacity: 0.6;
		}
		
		.service-name {
			font-size: 18px;
			font-weight: 600;
			margin-bottom: 10px;
			text-transform: capitalize;
		}
		
		.status-badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 500;
			margin-bottom: 10px;
		}
		
		.status-connected {
			background: #4caf50;
			color: white;
		}
		
		.status-disconnected {
			background: #ff9800;
			color: white;
		}
		
		.health-indicator {
			display: flex;
			align-items: center;
			gap: 8px;
			margin: 8px 0;
			font-size: 14px;
		}
		
		.health-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
		}
		
		.health-healthy { background: #4caf50; }
		.health-degraded { background: #ff9800; }
		.health-down { background: #f44336; }
		.health-unknown { background: #9e9e9e; }
		
		.disconnect-btn {
			margin-top: 12px;
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			border: none;
			padding: 6px 12px;
			cursor: pointer;
			border-radius: 4px;
			width: 100%;
		}
		
		.disconnect-btn:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}
		
		.empty-state {
			text-align: center;
			padding: 40px;
			color: var(--vscode-descriptionForeground);
		}
		
		.legend {
			margin-top: 30px;
			padding: 16px;
			border: 1px solid var(--vscode-panel-border);
			border-radius: 8px;
		}
		
		.legend-title {
			font-weight: 600;
			margin-bottom: 12px;
		}
		
		.legend-items {
			display: flex;
			gap: 20px;
			flex-wrap: wrap;
		}
		
		.legend-item {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="header">
		<h1>🔗 Connection Graph</h1>
		<button class="refresh-btn" onclick="refresh()">↻ Refresh</button>
	</div>
	
	<div id="graph" class="graph-container"></div>
	
	<div class="legend">
		<div class="legend-title">Health Status</div>
		<div class="legend-items">
			<div class="legend-item">
				<div class="health-dot health-healthy"></div>
				<span>Healthy</span>
			</div>
			<div class="legend-item">
				<div class="health-dot health-degraded"></div>
				<span>Degraded</span>
			</div>
			<div class="legend-item">
				<div class="health-dot health-down"></div>
				<span>Down</span>
			</div>
			<div class="legend-item">
				<div class="health-dot health-unknown"></div>
				<span>Unknown</span>
			</div>
		</div>
	</div>
	
	<script>
		const vscode = acquireVsCodeApi();
		
		function refresh() {
			vscode.postMessage({ type: 'refresh' });
		}
		
		function disconnect(service) {
			vscode.postMessage({ type: 'disconnect', service });
		}
		
		window.addEventListener('message', event => {
			const message = event.data;
			
			if (message.type === 'updateGraph') {
				renderGraph(message.connections);
			}
		});
		
		function renderGraph(connections) {
			const graph = document.getElementById('graph');
			
			const connectedServices = connections.filter(c => c.connected);
			
			if (connectedServices.length === 0) {
				graph.innerHTML = '<div class="empty-state">No services connected yet. Use the Connect Service commands to get started.</div>';
				return;
			}
			
			graph.innerHTML = connections.map(service => {
				const healthLabel = service.health.charAt(0).toUpperCase() + service.health.slice(1);
				
				return \`
					<div class="service-card \${service.connected ? 'connected' : 'disconnected'}">
						<div class="service-name">\${service.name}</div>
						<div class="status-badge status-\${service.connected ? 'connected' : 'disconnected'}">
							\${service.connected ? '✓ Connected' : '○ Not Connected'}
						</div>
						
						\${service.connected ? \`
							<div class="health-indicator">
								<div class="health-dot health-\${service.health}"></div>
								<span>\${healthLabel}</span>
							</div>
							<button class="disconnect-btn" onclick="disconnect('\${service.name}')">
								Disconnect
							</button>
						\` : ''}
					</div>
				\`;
			}).join('');
		}
	</script>
</body>
</html>`;
	}

	public dispose() {
		ConnectionGraphPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
