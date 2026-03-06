/**
 * Chat Panel - Interactive AI chat for DevOps automation
 */

import * as vscode from 'vscode';
import { CredentialManager } from '../auth/CredentialManager';
import { ProjectScanner } from '../scanner/ProjectScanner';
import { GeminiClient } from '../ai/geminiClient';

export class ChatPanel {
    public static currentPanel: ChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private geminiClient: GeminiClient;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private credentialManager: CredentialManager,
        private projectScanner: ProjectScanner
    ) {
        this._panel = panel;
        this.geminiClient = new GeminiClient();
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
            // Get workspace context
            const workspaceContext = await this.getWorkspaceContext();

            // Create enhanced prompt with context
            const systemPrompt = `You are GenieOps, an expert AI DevOps assistant powered by Gemini 1.5 Pro. You help developers with:
- Cloud deployments (AWS, GCP, Azure)
- Docker and Kubernetes
- CI/CD pipelines
- Infrastructure as code
- DevOps automation

Current workspace context:
${workspaceContext}

Provide practical, actionable responses. When suggesting commands or configurations, use code blocks. Be concise but thorough.`;

            // Send to Gemini API
            const response = await this.geminiClient.sendMessage(text, systemPrompt);

            this._panel.webview.postMessage({
                type: 'aiResponse',
                text: response,
                model: 'gemini-1.5-pro'
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check if it's an API key error
            if (errorMessage.includes('API key')) {
                this._panel.webview.postMessage({
                    type: 'error',
                    text: '❌ Gemini API key not configured or invalid. Click "Open Settings" button to configure your API key.'
                });

                // Prompt user to configure API key
                const action = await vscode.window.showErrorMessage(
                    'Gemini API key not configured',
                    'Open Settings',
                    'Get API Key'
                );

                if (action === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'genieops.googleApiKey');
                } else if (action === 'Get API Key') {
                    vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
                }
            } else {
                this._panel.webview.postMessage({
                    type: 'error',
                    text: `Error: ${errorMessage}`
                });
            }
        }
    }

    private async getWorkspaceContext(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            return 'No workspace folder open.';
        }

        try {
            const analysis = await this.projectScanner.analyze(workspaceFolders[0].uri.fsPath);

            return `- Framework: ${analysis.framework || 'Unknown'}
- Language: ${analysis.language || 'Unknown'}
- Package Manager: ${analysis.packageManager || 'Unknown'}
- Runtime: ${analysis.runtime || 'Unknown'}
- Docker: ${analysis.hasDocker ? 'Yes' : 'No'}
- Kubernetes: ${analysis.hasKubernetes ? 'Yes' : 'No'}
- CI/CD: ${analysis.hasCI ? 'Yes' : 'No'}`;
        } catch (error) {
            return 'Unable to analyze workspace.';
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
            padding: 12px 16px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header h2 {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .controls {
            padding: 12px 16px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
        }
        .control-group {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .control-label {
            font-size: 11px;
            text-transform: uppercase;
            opacity: 0.7;
            font-weight: 600;
        }
        select {
            background: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            font-family: inherit;
        }
        select:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        .mode-badge {
            padding: 4px 10px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .message-group {
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }
        .message-group.user {
            flex-direction: row-reverse;
        }
        .avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            flex-shrink: 0;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .avatar.ai {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .message-content {
            flex: 1;
            max-width: 80%;
        }
        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
        }
        .sender-name {
            font-size: 12px;
            font-weight: 600;
            opacity: 0.9;
        }
        .timestamp {
            font-size: 10px;
            opacity: 0.5;
        }
        .message {
            padding: 12px 16px;
            border-radius: 12px;
            word-wrap: break-word;
            line-height: 1.5;
            font-size: 13px;
        }
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-bottom-right-radius: 4px;
        }
        .message.ai {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-bottom-left-radius: 4px;
        }
        .message.thinking {
            background: var(--vscode-inputValidation-infoBackground);
            font-style: italic;
            opacity: 0.9;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .message.error {
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
            border-left: 3px solid var(--vscode-errorForeground);
        }
        .typing-indicator {
            display: inline-flex;
            gap: 4px;
        }
        .typing-indicator span {
            width: 6px;
            height: 6px;
            background: currentColor;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes typing {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
        }
            align-self: center;
            background: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
        .model-badge {
            display: inline-block;
            padding: 2px 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .quick-actions {
            padding: 8px 16px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .quick-action {
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 11px;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .quick-action:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            transform: translateY(-1px);
        }
        .input-container {
            padding: 16px;
            background: var(--vscode-sideBar-background);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        .input-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .input-box {
            width: 100%;
            padding: 10px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            font-family: inherit;
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
        }
        .input-box:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 0 0 1px var(--vscode-focusBorder);
        }
        .input-hint {
            font-size: 10px;
            opacity: 0.5;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .send-button {
            padding: 10px 20px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .send-button:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }
        .send-button:active {
            transform: scale(0.98);
        }
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .code-block {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 6px;
            padding: 8px 12px;
            margin: 8px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            overflow-x: auto;
        }
        .suggestions {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 8px;
        }
        .suggestion {
            padding: 8px 12px;
            background: var(--vscode-list-hoverBackground);
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s;
        }
        .suggestion:hover {
            background: var(--vscode-list-activeSelectionBackground);
            transform: translateX(4px);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h2>🧞 GenieOps</h2>
            <span class="mode-badge" id="modeBadge">Agent Mode</span>
        </div>
    </div>
    
    <div class="controls">
        <div class="control-group">
            <span class="control-label">Model</span>
            <select id="modelSelect" onchange="handleModelChange()">
                <option value="gemini-1.5-pro" selected>Gemini 1.5 Pro ⭐</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast)</option>
                <option value="claude-3.5">Claude 3.5 Sonnet</option>
                <option value="gpt-4">GPT-4 Turbo</option>
                <option value="perplexity">Perplexity (Search)</option>
            </select>
        </div>
        <div class="control-group">
            <span class="control-label">Mode</span>
            <select id="agentMode" onchange="handleModeChange()">
                <option value="agent" selected>🤖 Agent (Auto-execute)</option>
                <option value="assistant">💬 Assistant (Suggest only)</option>
                <option value="code">💻 Code Generation</option>
                <option value="devops">⚙️ DevOps Tasks</option>
            </select>
        </div>
    </div>
    
    <div class="quick-actions">
        <button class="quick-action" onclick="sendQuickMessage('Analyze my project structure and dependencies')">
            <span>🔍</span> Analyze Project
        </button>
        <button class="quick-action" onclick="sendQuickMessage('Deploy this application to Vercel')">
            <span>🚀</span> Deploy to Vercel
        </button>
        <button class="quick-action" onclick="sendQuickMessage('Create an optimized Dockerfile for this project')">
            <span>🐳</span> Generate Dockerfile
        </button>
        <button class="quick-action" onclick="sendQuickMessage('Setup GitHub Actions CI/CD pipeline')">
            <span>⚙️</span> Setup CI/CD
        </button>
        <button class="quick-action" onclick="sendQuickMessage('Connect to AWS and list my resources')">
            <span>☁️</span> Connect AWS
        </button>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message-group">
            <div class="avatar ai">🧞</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">GenieOps Agent</span>
                    <span class="timestamp">${new Date().toLocaleTimeString()}</span>
                </div>
                <div class="message ai">
                    👋 <strong>Welcome to GenieOps!</strong><br><br>
                    I'm your AI DevOps assistant powered by <span class="model-badge">Gemini Pro</span>.<br><br>
                    <strong>I can help you:</strong><br>
                    • Deploy applications to any cloud platform<br>
                    • Generate Dockerfiles and Kubernetes manifests<br>
                    • Setup CI/CD pipelines<br>
                    • Connect and manage cloud resources<br>
                    • Execute DevOps tasks automatically<br><br>
                    Try a quick action above or type what you want to do!
                </div>
            </div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <textarea
                class="input-box" 
                id="messageInput" 
                placeholder="Type your request... (Shift+Enter for new line, Enter to send)"
                onkeydown="handleKeyPress(event)"
                rows="1"
            ></textarea>
            <div class="input-hint">
                <span>💡 Tip: Be specific about what you want to achieve</span>
            </div>
        </div>
        <button class="send-button" onclick="sendMessage()" id="sendButton">
            <span>▲</span> Send
        </button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const modelSelect = document.getElementById('modelSelect');
        const agentMode = document.getElementById('agentMode');
        const modeBadge = document.getElementById('modeBadge');
        
        let currentModel = 'gemini-1.5-pro';
        let currentMode = 'agent';
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        function handleModelChange() {
            currentModel = modelSelect.value;
            addSystemMessage(\`Switched to \${modelSelect.options[modelSelect.selectedIndex].text}\`);
        }
        
        function handleModeChange() {
            currentMode = agentMode.value;
            const modeText = agentMode.options[agentMode.selectedIndex].text;
            modeBadge.textContent = modeText.split(' ')[1] || modeText;
            addSystemMessage(\`Mode changed to \${modeText}\`);
        }
        
        function addSystemMessage(text) {
            const messageGroup = document.createElement('div');
            messageGroup.className = 'message-group';
            messageGroup.innerHTML = \`
                <div class="avatar" style="background: var(--vscode-badge-background);">ℹ️</div>
                <div class="message-content">
                    <div class="message" style="background: var(--vscode-badge-background); font-size: 11px; padding: 8px 12px;">
                        \${text}
                    </div>
                </div>
            \`;
            chatContainer.appendChild(messageGroup);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            
            // Add user message to chat
            addMessage(text, 'user');
            
            // Send to extension with model and mode
            vscode.postMessage({
                type: 'sendMessage',
                text: text,
                model: currentModel,
                mode: currentMode
            });
            
            // Clear input
            messageInput.value = '';
            messageInput.style.height = 'auto';
            messageInput.focus();
        }
        
        function sendQuickMessage(text) {
            messageInput.value = text;
            sendMessage();
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        function addMessage(text, type, model, suggestions) {
            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const messageGroup = document.createElement('div');
            messageGroup.className = \`message-group \${type}\`;
            
            const avatar = type === 'user' 
                ? '<div class="avatar">👤</div>' 
                : '<div class="avatar ai">🧞</div>';
            
            const sender = type === 'user' ? 'You' : 'GenieOps Agent';
            const modelBadge = model ? \`<span class="model-badge">\${model}</span>\` : '';
            
            let suggestionsHtml = '';
            if (suggestions && suggestions.length > 0) {
                suggestionsHtml = '<div class="suggestions">';
                suggestions.forEach(s => {
                    suggestionsHtml += \`<div class="suggestion" onclick="sendQuickMessage('\${s}')">\${s}</div>\`;
                });
                suggestionsHtml += '</div>';
            }
            
            messageGroup.innerHTML = \`
                \${avatar}
                <div class="message-content">
                    <div class="message-header">
                        <span class="sender-name">\${sender}</span>
                        <span class="timestamp">\${time}</span>
                        \${modelBadge}
                    </div>
                    <div class="message \${type}">
                        \${text.replace(/\\n/g, '<br>')}
                    </div>
                    \${suggestionsHtml}
                </div>
            \`;
            
            chatContainer.appendChild(messageGroup);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function showThinking() {
            const thinkingGroup = document.createElement('div');
            thinkingGroup.className = 'message-group';
            thinkingGroup.id = 'thinking';
            thinkingGroup.innerHTML = \`
                <div class="avatar ai">🧞</div>
                <div class="message-content">
                    <div class="message thinking">
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                        <span>Thinking...</span>
                    </div>
                </div>
            \`;
            chatContainer.appendChild(thinkingGroup);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        
        function removeThinking() {
            const thinking = document.getElementById('thinking');
            if (thinking) {
                thinking.remove();
            }
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'userMessage':
                    addMessage(message.text, 'user');
                    break;
                    
                case 'aiThinking':
                    showThinking();
                    break;
                    
                case 'aiResponse':
                    removeThinking();
                    addMessage(message.text, 'ai', message.model, message.suggestions);
                    break;
                    
                case 'error':
                    removeThinking();
                    addMessage('❌ ' + message.text, 'error');
                    break;
                    
                case 'projectAnalysis':
                    const analysis = message.data;
                    const analysisText = '📊 <strong>Project Analysis Complete</strong><br><br>' +
                    '<strong>Framework:</strong> ' + analysis.framework + '<br>' +
                    '<strong>Language:</strong> ' + analysis.language + '<br>' +
                    '<strong>Package Manager:</strong> ' + analysis.packageManager + '<br>' +
                    '<strong>Runtime:</strong> ' + analysis.runtime + '<br>' +
                    '<strong>Docker:</strong> ' + (analysis.hasDocker ? '✅ Configured' : '❌ Not configured') + '<br>' +
                    '<strong>Kubernetes:</strong> ' + (analysis.hasKubernetes ? '✅ Configured' : '❌ Not configured') + '<br>' +
                    '<strong>CI/CD:</strong> ' + (analysis.hasCI ? '✅ Configured' : '❌ Not configured');
                    addMessage(analysisText, 'ai');
                    break;
            }
        });
        
        // Focus input on load
        messageInput.focus();
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
