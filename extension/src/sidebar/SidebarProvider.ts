import * as vscode from 'vscode';
import { McpClient, ChatResult } from '../mcp/mcpClient';
import { ProjectContextService } from '../context/analyzer';
import { SecretKey, SecretStorageFacade } from '../auth/secretStorage';

export class SidebarProvider implements vscode.WebviewViewProvider {
	private view: vscode.WebviewView | undefined;

	public constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly mcpClient: McpClient,
		private readonly secretStorage: SecretStorageFacade,
		private readonly projectContext: ProjectContextService
	) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_webviewViewResolveContext: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri]
		};

		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (message) => {
			switch (message.type) {
				case 'chat:sendMessage': {
					const text = typeof message.text === 'string' ? message.text.trim() : '';
					if (!text) {
						return;
					}
					await this.handleChatRequest(text);
					break;
				}
				case 'settings:updateModelKey': {
					const modelId = String(message.modelId ?? '');
					const value = String(message.value ?? '');
					await this.handleUpdateModelKey(modelId, value);
					break;
				}
				case 'graph:requestState': {
					this.postMessage({
						type: 'graph:stateUpdate',
						state: this.buildConnectionGraphState()
					});
					break;
				}
				default:
					// Unknown message; ignore to keep the channel robust.
					break;
			}
		});
	}

	public reveal(): void {
		if (this.view) {
			this.view.show?.(true);
		} else {
			void vscode.commands.executeCommand('devops-omnibus.openChat');
		}
	}

	private async handleChatRequest(prompt: string): Promise<void> {
		const context = this.projectContext.getContext();
		const enrichedPrompt = `PROJECT_CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER_PROMPT:\n${prompt}`;

		this.postMessage({
			type: 'chat:status',
			status: 'running'
		});

		let result: ChatResult | undefined;

		try {
			result = await this.mcpClient.sendChat(enrichedPrompt);
		} catch (error) {
			console.error('DevOps Omnibus chat error', error);
			this.postMessage({
				type: 'chat:error',
				message:
					'DevOps Omnibus failed to process your request. Open the Output panel for more details and ensure the MCP server is running.'
			});
			return;
		}

		if (result) {
			this.postMessage({
				type: 'chat:complete',
				result
			});
		}

		this.postMessage({
			type: 'chat:status',
			status: 'idle'
		});
	}

	private async handleUpdateModelKey(modelId: string, value: string): Promise<void> {
		const key = this.modelIdToSecretKey(modelId);
		if (!key) {
			void vscode.window.showWarningMessage(
				`DevOps Omnibus: Unknown model identifier "${modelId}" – cannot store API key.`
			);
			return;
		}

		if (!value) {
			await this.secretStorage.deleteSecret(key);
			void vscode.window.showInformationMessage(
				`DevOps Omnibus: Cleared credentials for model "${modelId}".`
			);
			return;
		}

		await this.secretStorage.storeSecret(key, value);
		void vscode.window.showInformationMessage(
			`DevOps Omnibus: Updated credentials for model "${modelId}".`
		);
	}

	private modelIdToSecretKey(modelId: string): SecretKey | undefined {
		switch (modelId) {
			case 'anthropic':
				return 'models.anthropic.apiKey';
			case 'openai':
				return 'models.openai.apiKey';
			case 'gemini':
				return 'models.gemini.apiKey';
			case 'mistral':
				return 'models.mistral.apiKey';
			case 'perplexity':
				return 'models.perplexity.apiKey';
			default:
				return undefined;
		}
	}

	private buildConnectionGraphState(): unknown {
		// Initial stub that will be replaced with real integration status.
		const context = this.projectContext.getContext();

		return {
			nodes: [
				{ id: 'repo', label: 'Repository', type: 'codebase' },
				...context.ciProviders.map((provider) => ({ id: `ci:${provider}`, label: provider, type: 'ci' })),
				...context.cloudProviders.map((provider) => ({
					id: `cloud:${provider}`,
					label: provider,
					type: 'cloud'
				}))
			],
			edges: [] as Array<{ from: string; to: string; label?: string }>
		};
	}

	private postMessage(message: unknown): void {
		this.view?.webview.postMessage(message);
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = this.getNonce();
		const cspSource = webview.cspSource;

		return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https:; style-src ${
			cspSource
		} 'unsafe-inline'; script-src 'nonce-${nonce}';">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>DevOps Omnibus</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		.app {
			display: flex;
			flex-direction: column;
			height: 100vh;
		}
		.header {
			padding: 8px 12px;
			border-bottom: 1px solid var(--vscode-panel-border);
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
		}
		.header-title {
			font-weight: 600;
			font-size: 0.9rem;
		}
		.header-badge {
			font-size: 0.75rem;
			padding: 2px 6px;
			border-radius: 999px;
			background-color: var(--vscode-badge-background);
			color: var(--vscode-badge-foreground);
		}
		.main {
			flex: 1;
			display: flex;
			flex-direction: column;
			overflow: hidden;
		}
		.messages {
			flex: 1;
			overflow-y: auto;
			padding: 8px 12px;
			display: flex;
			flex-direction: column-reverse;
			gap: 8px;
		}
		.message {
			border-radius: 4px;
			padding: 8px 10px;
			background-color: var(--vscode-editorWidget-background);
			border-left: 3px solid var(--vscode-textLink-foreground);
		}
		.message-header {
			display: flex;
			justify-content: space-between;
			font-size: 0.75rem;
			margin-bottom: 4px;
			opacity: 0.8;
		}
		.message-models {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
			gap: 6px;
			margin-top: 6px;
		}
		.message-model {
			padding: 6px 8px;
			border-radius: 3px;
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
		}
		.message-model-header {
			display: flex;
			justify-content: space-between;
			font-size: 0.7rem;
			margin-bottom: 4px;
		}
		.message-model-winner {
			color: var(--vscode-notificationsInfoIcon-foreground);
			font-weight: 600;
		}
		.message-model-body {
			font-size: 0.75rem;
			white-space: pre-wrap;
		}
		.footer {
			border-top: 1px solid var(--vscode-panel-border);
			padding: 8px 10px;
			display: flex;
			flex-direction: column;
			gap: 6px;
		}
		.input-row {
			display: flex;
			gap: 6px;
		}
		textarea {
			flex: 1;
			resize: vertical;
			min-height: 44px;
			max-height: 120px;
			padding: 6px 8px;
			border-radius: 3px;
			border: 1px solid var(--vscode-input-border);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			font-family: var(--vscode-font-family);
			font-size: 0.85rem;
		}
		button {
			border: none;
			border-radius: 3px;
			padding: 6px 12px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			font-size: 0.8rem;
			cursor: pointer;
			white-space: nowrap;
		}
		button[disabled] {
			opacity: 0.6;
			cursor: default;
		}
		button:hover:not([disabled]) {
			background-color: var(--vscode-button-hoverBackground);
		}
		footer .meta-row {
			display: flex;
			justify-content: space-between;
			align-items: center;
			font-size: 0.7rem;
			opacity: 0.8;
		}
		.models-toggle {
			display: flex;
			gap: 4px;
			flex-wrap: wrap;
		}
		.models-toggle span {
			padding: 2px 6px;
			border-radius: 999px;
			border: 1px solid var(--vscode-panel-border);
			font-size: 0.7rem;
		}
	</style>
</head>
<body>
	<div class="app">
		<header class="header">
			<div class="header-title">DevOps Omnibus</div>
			<div class="header-badge" id="status-badge">Idle</div>
		</header>
		<main class="main">
			<div id="messages" class="messages"></div>
		</main>
		<footer class="footer">
			<div class="input-row">
				<textarea id="prompt" placeholder="Describe the DevOps or integration task you want to run…"></textarea>
				<button id="send">Run</button>
			</div>
			<div class="meta-row">
				<div class="models-toggle">
					<span>Claude</span>
					<span>GPT-4o</span>
					<span>Gemini</span>
					<span>Mistral</span>
					<span>Perplexity</span>
				</div>
				<div>Enter to send • Shift+Enter for newline</div>
			</div>
		</footer>
	</div>

	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();

		const promptEl = document.getElementById('prompt');
		const sendBtn = document.getElementById('send');
		const messagesEl = document.getElementById('messages');
		const statusBadge = document.getElementById('status-badge');

		let isRunning = false;
		let history = [];

		function setStatus(status) {
			isRunning = status === 'running';
			statusBadge.textContent = isRunning ? 'Running…' : 'Idle';
			sendBtn.disabled = isRunning;
		}

		function render() {
			messagesEl.innerHTML = '';
			for (const item of history) {
				const wrapper = document.createElement('div');
				wrapper.className = 'message';

				const header = document.createElement('div');
				header.className = 'message-header';
				const left = document.createElement('span');
				left.textContent = item.prompt;
				const right = document.createElement('span');
				right.textContent = new Date(item.timestamp).toLocaleTimeString();
				header.appendChild(left);
				header.appendChild(right);

				wrapper.appendChild(header);

				const modelsGrid = document.createElement('div');
				modelsGrid.className = 'message-models';

				for (const model of item.modelResponses) {
					const modelEl = document.createElement('div');
					modelEl.className = 'message-model';

					const modelHeader = document.createElement('div');
					modelHeader.className = 'message-model-header';

					const nameSpan = document.createElement('span');
					nameSpan.textContent = model.displayName;
					if (model.isWinner) {
						nameSpan.className = 'message-model-winner';
					}

					const metaSpan = document.createElement('span');
					metaSpan.textContent = model.durationMs
						? model.durationMs.toString() + 'ms'
						: '';

					modelHeader.appendChild(nameSpan);
					modelHeader.appendChild(metaSpan);

					const body = document.createElement('div');
					body.className = 'message-model-body';
					body.textContent = model.content;

					modelEl.appendChild(modelHeader);
					modelEl.appendChild(body);
					modelsGrid.appendChild(modelEl);
				}

				wrapper.appendChild(modelsGrid);
				messagesEl.appendChild(wrapper);
			}
		}

		function sendPrompt() {
			const text = promptEl.value.trim();
			if (!text || isRunning) {
				return;
			}

			vscode.postMessage({
				type: 'chat:sendMessage',
				text
			});
			setStatus('running');
		}

		sendBtn.addEventListener('click', () => {
			sendPrompt();
		});

		promptEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault();
				sendPrompt();
			}
		});

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (!message || typeof message !== 'object') {
				return;
			}

			switch (message.type) {
				case 'chat:status':
					setStatus(message.status);
					break;
				case 'chat:complete':
					if (message.result) {
						history.unshift({
							prompt: message.result.prompt,
							modelResponses: message.result.modelResponses || [],
							timestamp: Date.now()
						});
						render();
					}
					setStatus('idle');
					break;
				case 'chat:error':
					setStatus('idle');
					if (message.message) {
						vscode.postMessage({
							type: 'onError',
							value: message.message
						});
					}
					break;
				default:
					break;
			}
		});

		setStatus('idle');
		render();
	</script>
</body>
</html>`;
	}

	private getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}
}

