import * as vscode from 'vscode';
import { CommandExecutor } from '../../commands/executor';
import { LoggingService } from '../../services/loggingService';

/**
 * ChatViewProvider - Provides the WebView for the chat interface
 * Handles message display and command input
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devops-omnibus.chatView';
    
    private _view?: vscode.WebviewView;
    private commandExecutor: CommandExecutor;
    private logger: LoggingService;
    private messageHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }> = [];

    constructor(
        private readonly extensionUri: vscode.Uri,
        commandExecutor: CommandExecutor,
        logger: LoggingService
    ) {
        this.commandExecutor = commandExecutor;
        this.logger = logger;
    }

    /**
     * Resolve the webview view
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };

        webviewView.webview.html = this.getHtmlContent(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this.handleUserMessage(message.text);
                    break;
                case 'clearHistory':
                    this.messageHistory = [];
                    this.updateMessages();
                    break;
            }
        });

        // Send initial state
        this.updateMessages();
    }

    /**
     * Handle user message
     */
    private async handleUserMessage(text: string): Promise<void> {
        if (!text.trim()) return;

        // Add user message to history
        this.messageHistory.push({
            role: 'user',
            content: text,
            timestamp: new Date()
        });
        this.updateMessages();

        // Show typing indicator
        this.sendToWebview({ type: 'setTyping', isTyping: true });

        try {
            // Execute the command
            const result = await this.commandExecutor.execute(text);

            // Add assistant response
            this.messageHistory.push({
                role: 'assistant',
                content: result.success 
                    ? `✅ ${result.message}` 
                    : `❌ ${result.message}`,
                timestamp: new Date()
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.messageHistory.push({
                role: 'assistant',
                content: `❌ Error: ${errorMessage}`,
                timestamp: new Date()
            });
        } finally {
            this.sendToWebview({ type: 'setTyping', isTyping: false });
            this.updateMessages();
        }
    }

    /**
     * Update messages in webview
     */
    private updateMessages(): void {
        this.sendToWebview({
            type: 'updateMessages',
            messages: this.messageHistory
        });
    }

    /**
     * Send message to webview
     */
    private sendToWebview(message: unknown): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    /**
     * Get the HTML content for the webview
     */
    private getHtmlContent(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>DevOps Omnibus Chat</title>
    <style>
        :root {
            --vscode-font-family: var(--vscode-editor-font-family, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif);
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h3 {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header-icon {
            font-size: 16px;
        }
        
        .clear-btn {
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .clear-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .message {
            padding: 10px 12px;
            border-radius: 8px;
            max-width: 90%;
            word-wrap: break-word;
            line-height: 1.4;
        }
        
        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }
        
        .message.assistant {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            align-self: flex-start;
            border-bottom-left-radius: 2px;
        }
        
        .message-time {
            font-size: 10px;
            opacity: 0.6;
            margin-top: 4px;
        }
        
        .typing-indicator {
            display: none;
            padding: 10px;
            align-self: flex-start;
        }
        
        .typing-indicator.active {
            display: flex;
            gap: 4px;
        }
        
        .typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-foreground);
            opacity: 0.4;
            animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
            30% { transform: translateY(-8px); opacity: 1; }
        }
        
        .input-container {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        
        .input-wrapper {
            flex: 1;
            position: relative;
        }
        
        #messageInput {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: none;
            min-height: 40px;
            max-height: 120px;
        }
        
        #messageInput:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        #messageInput::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .send-btn {
            padding: 10px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .send-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .welcome-message {
            text-align: center;
            padding: 20px;
            opacity: 0.8;
        }
        
        .welcome-message h4 {
            margin-bottom: 8px;
        }
        
        .examples {
            margin-top: 16px;
            text-align: left;
        }
        
        .example {
            padding: 8px 12px;
            margin: 4px 0;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            opacity: 0.8;
        }
        
        .example:hover {
            opacity: 1;
            background-color: var(--vscode-list-hoverBackground);
        }

        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            margin-top: 8px;
        }

        code {
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div class="header">
        <h3><span class="header-icon">🚀</span> DevOps Chat</h3>
        <button class="clear-btn" onclick="clearHistory()">Clear</button>
    </div>
    
    <div class="messages-container" id="messagesContainer">
        <div class="welcome-message" id="welcomeMessage">
            <h4>Welcome to DevOps Omnibus!</h4>
            <p>Type a command in natural language:</p>
            <div class="examples">
                <div class="example" onclick="sendExample('Generate a Dockerfile for this project')">
                    Generate a Dockerfile for this project
                </div>
                <div class="example" onclick="sendExample('Set up GitHub Actions CI/CD')">
                    Set up GitHub Actions CI/CD
                </div>
                <div class="example" onclick="sendExample('Deploy to AWS Lambda')">
                    Deploy to AWS Lambda
                </div>
                <div class="example" onclick="sendExample('Create a Jira task for code review')">
                    Create a Jira task for code review
                </div>
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <textarea 
                id="messageInput" 
                placeholder="Type a DevOps command..."
                rows="1"
                onkeydown="handleKeyDown(event)"
            ></textarea>
        </div>
        <button class="send-btn" onclick="sendMessage()" id="sendBtn">
            Send
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput = document.getElementById('messageInput');
        const typingIndicator = document.getElementById('typingIndicator');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const sendBtn = document.getElementById('sendBtn');
        
        let isTyping = false;
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        function handleKeyDown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isTyping) return;
            
            vscode.postMessage({ type: 'sendMessage', text });
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        
        function sendExample(text) {
            messageInput.value = text;
            sendMessage();
        }
        
        function clearHistory() {
            vscode.postMessage({ type: 'clearHistory' });
        }
        
        function formatTime(date) {
            return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateMessages':
                    renderMessages(message.messages);
                    break;
                case 'setTyping':
                    isTyping = message.isTyping;
                    typingIndicator.classList.toggle('active', message.isTyping);
                    sendBtn.disabled = message.isTyping;
                    if (message.isTyping) {
                        scrollToBottom();
                    }
                    break;
            }
        });
        
        function renderMessages(messages) {
            // Remove welcome message if there are messages
            if (messages.length > 0) {
                welcomeMessage.style.display = 'none';
            } else {
                welcomeMessage.style.display = 'block';
            }
            
            // Clear existing messages (except welcome and typing indicator)
            const existingMessages = messagesContainer.querySelectorAll('.message');
            existingMessages.forEach(msg => msg.remove());
            
            // Add messages
            messages.forEach(msg => {
                const messageEl = document.createElement('div');
                messageEl.className = 'message ' + msg.role;
                
                // Format content (basic markdown support)
                let content = escapeHtml(msg.content);
                // Convert code blocks
                content = content.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');
                content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                // Convert newlines
                content = content.replace(/\\n/g, '<br>');
                
                messageEl.innerHTML = content + '<div class="message-time">' + formatTime(msg.timestamp) + '</div>';
                
                // Insert before typing indicator
                messagesContainer.insertBefore(messageEl, typingIndicator);
            });
            
            scrollToBottom();
        }
        
        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
