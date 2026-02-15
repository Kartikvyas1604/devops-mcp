import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('DevOps MCP Extension is now active!');

	const provider = new SidebarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("devops-mcp.mainView", provider)
	);
}

class SidebarProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		// Handle messages from the webview
		webviewView.webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case 'onInfo': {
					if (!data.value) {
						return;
					}
					vscode.window.showInformationMessage(data.value);
					break;
				}
				case 'onError': {
					if (!data.value) {
						return;
					}
					vscode.window.showErrorMessage(data.value);
					break;
				}
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>DevOps MCP</title>
				<style>
					body {
						padding: 10px;
						color: var(--vscode-foreground);
						font-family: var(--vscode-font-family);
					}
					.container {
						display: flex;
						flex-direction: column;
						gap: 10px;
					}
					.input-section {
						display: flex;
						flex-direction: column;
						gap: 8px;
					}
					input, textarea {
						width: 100%;
						padding: 8px;
						background: var(--vscode-input-background);
						color: var(--vscode-input-foreground);
						border: 1px solid var(--vscode-input-border);
						border-radius: 2px;
						font-family: var(--vscode-font-family);
						box-sizing: border-box;
					}
					textarea {
						resize: vertical;
						min-height: 60px;
					}
					button {
						padding: 8px 16px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 2px;
						cursor: pointer;
						font-family: var(--vscode-font-family);
					}
					button:hover {
						background: var(--vscode-button-hoverBackground);
					}
					.output-section {
						margin-top: 20px;
						padding-top: 20px;
						border-top: 1px solid var(--vscode-panel-border);
					}
					.output-item {
						padding: 10px;
						margin-bottom: 10px;
						background: var(--vscode-editor-background);
						border-radius: 4px;
						border-left: 3px solid var(--vscode-textLink-foreground);
						word-wrap: break-word;
					}
					.timestamp {
						font-size: 0.85em;
						color: var(--vscode-descriptionForeground);
						margin-bottom: 5px;
					}
					h3 {
						margin-top: 0;
						margin-bottom: 15px;
						font-size: 1.1em;
					}
				</style>
			</head>
			<body>
				<div class="container">
					<div class="input-section">
						<h3>Input Text</h3>
						<textarea id="textInput" placeholder="Type something here..."></textarea>
						<button onclick="addText()">Add Text</button>
						<button onclick="clearOutput()">Clear Output</button>
					</div>
					<div class="output-section">
						<h3>Output</h3>
						<div id="output"></div>
					</div>
				</div>

				<script>
					const vscode = acquireVsCodeApi();
					let outputCount = 0;

					function addText() {
						const input = document.getElementById('textInput');
						const text = input.value.trim();
						
						if (text) {
							const output = document.getElementById('output');
							const timestamp = new Date().toLocaleTimeString();
							
							const item = document.createElement('div');
							item.className = 'output-item';
							item.innerHTML = \`
								<div class="timestamp">\${timestamp}</div>
								<div>\${text}</div>
							\`;
							
							output.insertBefore(item, output.firstChild);
							input.value = '';
							outputCount++;
						}
					}

					function clearOutput() {
						const output = document.getElementById('output');
						output.innerHTML = '';
						outputCount = 0;
					}

					// Allow Enter key to submit (Shift+Enter for new line)
					document.getElementById('textInput').addEventListener('keydown', (e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							addText();
						}
					});
				</script>
			</body>
			</html>`;
	}
}

export function deactivate() {}
