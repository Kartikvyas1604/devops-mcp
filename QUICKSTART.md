# 🚀 Genie-ops Quickstart Guide

## Prerequisites

- **Node.js 18+** (check with `node --version`)
- **VS Code 1.85.0+**
- **Git** for cloning or managing the repository

## 🎯 How to Run the Extension

### Option 1: Development Mode (Recommended for Testing)

1. **Open the Project in VS Code**
   ```bash
   cd /Users/0xkartikvyas/Projects/devops-mcp
   code .
   ```

2. **Install All Dependencies** (if not already done)
   ```bash
   # From project root
   npm install
   
   # Install extension dependencies
   cd extension && npm install && cd ..
   
   # Install MCP server dependencies
   cd mcp-server && npm install && cd ..
   ```

3. **Build the Project**
   ```bash
   # Build MCP server
   cd mcp-server && npm run build && cd ..
   
   # Build extension
   cd extension && npm run compile && cd ..
   ```

4. **Launch Extension in VS Code**
   - Press **F5** (or Run → Start Debugging)
   - OR click the green "Run and Debug" icon in the sidebar → select "Run Extension"
   - This opens a new **Extension Development Host** window with Genie-ops loaded

5. **Verify Installation**
   - In the Extension Development Host window, look for the **Genie-ops icon** (purple genie lamp) in the Activity Bar (left sidebar)
   - Open Command Palette: **Cmd+Shift+P** (Mac) / **Ctrl+Shift+P** (Windows/Linux)
   - Type "Genie-ops" to see all available commands

### Option 2: Watch Mode (Auto-rebuild on Changes)

For active development with auto-compilation:

```bash
# Terminal 1: Watch MCP server
cd mcp-server && npm run watch

# Terminal 2: Watch extension
cd extension && npm run watch
```

Then press **F5** to launch. Changes will auto-compile.

### Option 3: Package as VSIX (Production Install)

To install as a regular VS Code extension:

1. **Package the Extension**
   ```bash
   cd extension
   npm install -g @vscode/vsce
   vsce package
   ```

2. **Install the VSIX**
   ```bash
   code --install-extension genie-ops-1.0.0.vsix
   ```

3. **Restart VS Code** and the extension will be active in all windows

## 🧪 Testing the Extension

### 1. Connect to Services

Open Command Palette (**Cmd+Shift+P**) and try these commands:

```
Genie-ops: Connect GitHub
Genie-ops: Connect AWS
Genie-ops: Connect Docker (local)
Genie-ops: Connect Slack
Genie-ops: Connect Jira
Genie-ops: Connect GCP
Genie-ops: Connect Kubernetes
```

### 2. Use Natural Language Commands

After connecting services, try natural language automation:

```
Genie-ops: Ask Genie-ops
```

Example prompts:
- "Deploy my app to AWS Lambda with API Gateway"
- "Create a GitHub workflow for Node.js"
- "Generate a Kubernetes deployment for my Express app"
- "Create a Jira epic for Q2 planning with 5 stories"
- "Build a Docker image and push to Docker Hub"

### 3. View Service Connections

```
Genie-ops: Show Connection Graph
```

This opens a visual panel showing all connected services with health status.

### 4. Clone Environments

```
Genie-ops: Clone Environment
```

Prompts for source and target environments, generates Terraform/Pulumi IaC.

### 5. Rollback Last Action

```
Genie-ops: Rollback Last Action
```

Reverts the last operation with automatic cleanup.

## 🔑 API Keys Required

Configure these API keys for full functionality:

### In VS Code (stored securely via SecretStorage):

1. **Anthropic Claude** - Get from: https://console.anthropic.com/
2. **OpenAI GPT-4** - Get from: https://platform.openai.com/
3. **Google Gemini** - Get from: https://makersuite.google.com/
4. **Mistral AI** - Get from: https://console.mistral.ai/
5. **Perplexity** - Get from: https://www.perplexity.ai/

### Service Credentials:

- **GitHub**: Uses VS Code's built-in authentication (OAuth)
- **AWS**: Access Key ID + Secret Access Key (or SSO/IAM)
- **Docker**: Local Docker daemon (no auth needed)
- **Slack**: Workspace Bot Token
- **Jira**: Email + API Token from Atlassian
- **GCP**: Service Account JSON key file or gcloud CLI
- **Kubernetes**: Kubeconfig file path

## 🐛 Troubleshooting

### Extension Not Loading

1. **Check VS Code version**: Must be 1.85.0+
   ```bash
   code --version
   ```

2. **View Output Panel**: 
   - View → Output → Select "Genie-ops" from dropdown
   - Check for error messages

3. **Rebuild Everything**:
   ```bash
   cd mcp-server && npm run build
   cd ../extension && npm run compile
   ```

4. **Reload Window**: 
   - Command Palette → "Developer: Reload Window"

### MCP Server Connection Issues

1. **Check server logs**: Output panel → "Genie-ops MCP Server"

2. **Verify Node.js version**: Must be 18+
   ```bash
   node --version
   ```

3. **Reinstall dependencies**:
   ```bash
   cd mcp-server
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### Commands Not Showing

1. **Reload VS Code**: Cmd+Shift+P → "Developer: Reload Window"

2. **Check activation**: Extension should auto-activate on VS Code startup

3. **Manual activation**: Run any Genie-ops command to trigger activation

### Service Connection Failures

1. **Verify credentials**: Use "Disconnect" command then reconnect

2. **Check network**: Some services require internet connectivity

3. **Review permissions**: Ensure API keys have required scopes

## 📊 Performance Tips

- **First run**: Initial AI model calls may take 5-10 seconds
- **Caching**: Subsequent similar prompts are faster
- **Parallel execution**: Multiple AI models run simultaneously
- **Memory**: Extension uses ~50-100 MB RAM with MCP server

## 🔗 Quick Links

- **Full Documentation**: [README.md](./README.md)
- **Testing Guide**: [TESTING.md](./TESTING.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)
- **Project Status**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## 💡 Pro Tips

1. **Use the sidebar**: Click the Genie-ops icon for quick access to chat and connected services
2. **Keyboard shortcuts**: Set custom keybindings for frequently used commands
3. **Context awareness**: The extension analyzes your workspace for better suggestions
4. **Multi-model consensus**: Complex tasks get routed to multiple AI models for best results
5. **Operation history**: View past actions via "Show History" command

## 🆘 Need Help?

- Check [TESTING.md](./TESTING.md) for test examples
- Review [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for architecture overview
- Open an issue on GitHub
- Email: support@genie-ops.dev (if configured)

---

**Happy DevOps Automation! 🧞‍♂️⚡**
