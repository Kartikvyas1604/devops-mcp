/**
 * Chat Panel - Interactive AI chat for DevOps automation
 */

import * as vscode from 'vscode';
import { CredentialManager } from '../auth/CredentialManager';
import { ProjectScanner } from '../scanner/ProjectScanner';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private credentialManager: CredentialManager,
        private projectScanner: ProjectScanner
    ) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getHtmlContent(extensionUri);

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'sendMessage':
                        await this.handleUserMessage(message.text);
                        break;
                    case 'analyzeProject':
                        await this.analyzeCurrentProject();
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        credentialManager: CredentialManager,
        projectScanner: ProjectScanner
    ): ChatPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel._panel.reveal(column);
            return ChatPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'genieopsChat',
            '🧞 GenieOps Chat',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, credentialManager, projectScanner);
        return ChatPanel.currentPanel;
    }

    public show(): void {
        this._panel.reveal();
    }

    public sendMessage(message: string): void {
        this._panel.webview.postMessage({
            type: 'userMessage',
            text: message
        });
    }

    private async handleUserMessage(text: string): Promise<void> {
        // Show loading state
        this._panel.webview.postMessage({
            type: 'aiThinking',
            text: 'GenieOps is thinking...'
        });

        try {
            // TODO: Send to AI orchestrator (Gemini)
            // For now, send a mock response
            const response = `I understand you want to: "${text}"\n\nThis feature is coming soon! GenieOps will use Gemini AI to:\n1. Analyze your request\n2. Scan your project\n3. Execute the necessary DevOps tasks\n4. Provide real-time updates`;

            this._panel.webview.postMessage({
                type: 'aiResponse',
                text: response,
                model: 'gemini-pro'
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'error',
                text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private async analyzeCurrentProject(): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            this._panel.webview.postMessage({
                type: 'error',
                text: 'No workspace folder open'
            });
            return;
        }

        try {
            const analysis = await this.projectScanner.analyze(workspaceFolder.uri.fsPath);

            this._panel.webview.postMessage({
                type: 'projectAnalysis',
                data: {
                    framework: analysis.framework,
                    language: analysis.language,
                    packageManager: analysis.packageManager,
                    runtime: analysis.runtime,
                    hasDocker: analysis.hasDocker,
                    hasKubernetes: analysis.hasKubernetes,
                    hasCI: analysis.hasCI
                }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'error',
                text: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    private _getHtmlContent(extensionUri: vscode.Uri): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenieOps Chat</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 16px;
            background: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            max-width: 85%;
            word-wrap: break-word;
        }
        .message.user {
            align-self: flex-end;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .message.ai {
            align-self: flex-start;
            background: var(--vscode-editor-inactiveSelectionBackground);
        }
        .message.thinking {
            align-self: flex-start;
            background: var(--vscode-inputValidation-infoBackground);
            font-style: italic;
            opacity: 0.8;
        }
        .message.error {
            align-self: center;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
        .model-badge {
            display: inline-block;
            padding: 2px 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
        }
        .input-container {
            padding: 16px;
            background: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        .input-box {
            flex: 1;
            padding: 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
        }
        .input-box:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        .send-button {
            padding: 12px 24px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
        }
        .send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .send-button:active {
            transform: scale(0.98);
        }
        .quick-actions {
            padding: 8px 16px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .quick-action {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .quick-action:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🧞 GenieOps Assistant</h2>
        <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">Powered by Gemini AI</p>
    </div>
    
    <div class="quick-actions">
        <button class="quick-action" onclick="sendQuickMessage('Analyze my project')">🔍 Analyze Project</button>
        <button class="quick-action" onclick="sendQuickMessage('Deploy to Vercel')">🚀 Deploy to Vercel</button>
        <button class="quick-action" onclick="sendQuickMessage('Create Dockerfile')">🐳 Create Dockerfile</button>
        <button class="quick-action" onclick="sendQuickMessage('Setup GitHub Actions')">⚙️ Setup CI/CD</button>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message ai">
            👋 Hi! I'm GenieOps, your AI DevOps assistant. Tell me what you want to do, and I'll handle everything automatically.
            <br><br>
            Try: "Deploy my Next.js app to Vercel" or "Create a Dockerfile for this project"
        </div>
    </div>
    
    <div class="input-container">
        <input 
            type="text" 
            class="input-box" 
            id="messageInput" 
            placeholder="What do you want to do? (Type ONE sentence)"
            onkeypress="handleKeyPress(event)"
        />
        <button class="send-button" onclick="sendMessage()">Send</button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            
            // Add user message to chat
            addMessage(text, 'user');
            
            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
            
            // Clear input
            messageInput.value = '';
        }
        
        function sendQuickMessage(text) {
            messageInput.value = text;
            sendMessage();
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') {
                sendMessage();
            }
        }
        
        function addMessage(text, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = text;
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'userMessage':
                    addMessage(message.text, 'user');
                    break;
                    
                case 'aiThinking':
                    addMessage(message.text, 'thinking');
                    break;
                    
                case 'aiResponse':
                    const aiMsg = document.createElement('div');
                    aiMsg.className = 'message ai';
                    aiMsg.textContent = message.text;
                    if (message.model) {
                        const badge = document.createElement('span');
                        badge.className = 'model-badge';
                        badge.textContent = message.model;
                        aiMsg.appendChild(badge);
                    }
                    chatContainer.appendChild(aiMsg);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
                    
                case 'error':
                    addMessage(message.text, 'error');
                    break;
                    
                case 'projectAnalysis':
                    const analysis = message.data;
                    const analysisText = \`📊 Project Analysis:\\n
                    Framework: \${analysis.framework}\\n
                    Language: \${analysis.language}\\n
                    Package Manager: \${analysis.packageManager}\\n
                    Runtime: \${analysis.runtime}\\n
                    Docker: \${analysis.hasDocker ? '✅' : '❌'}\\n
                    Kubernetes: \${analysis.hasKubernetes ? '✅' : '❌'}\\n
                    CI/CD: \${analysis.hasCI ? '✅' : '❌'}\`;
                    addMessage(analysisText, 'ai');
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        ChatPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
