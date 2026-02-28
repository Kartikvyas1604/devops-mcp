# 🧞 Genie-ops

**The World's Most Powerful DevOps Automation Platform for VS Code**

Genie-ops is a production-grade VS Code extension that transforms natural language into executed DevOps tasks. Powered by multi-AI orchestration and the Model Context Protocol (MCP), it connects your codebase to cloud providers, CI/CD systems, and SaaS tools — no manual configuration required.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

### 🤖 Multi-AI Orchestration
- **Model Race**: Run Claude 3.5, GPT-4o, Gemini Pro, and Mistral in parallel
- Automatic winner selection based on speed + confidence
- Real-time trending solutions via Perplexity web search
- See which AI answered what and pick your favorite

### 🚀 One-Command DevOps
```
> "Connect my project to AWS and set up S3 bucket"
> "Deploy this to Google Cloud Run with auto-scaling"
> "Create GitHub Actions CI/CD for this repo"
> "Set up Kubernetes deployment with 3 replicas"
> "Send deployment notifications to Slack #deployments"
```

### 🧙 Vibe Coding Engine
Describe an app in natural language → Get a complete, production-ready codebase:
- Full project structure with Next.js, TypeScript, Docker
- Database setup and ORM configuration
- CI/CD pipelines (GitHub Actions)
- Docker & Kubernetes manifests
- Integration with Stripe, Auth0, etc.
- Estimated implementation time

### 🔗 Integrations

| Service | Features |
|---------|----------|
| **GitHub** | Repos, Actions, PRs, Secrets |
| **Docker** | Dockerfile gen, Compose, Build |
| **AWS** | S3, EC2, Lambda, Cost estimates |
| **Slack** | Messages, Channels, Webhooks |
| **Jira** | Issues, Epics, Sprint planning |
| **GCP** | Cloud Run, GKE, Storage |
| **Azure** | App Service, AKS, DevOps |
| **Kubernetes** | Deployments, Helm, Services |

### 🔐 Enterprise-Grade Security
- All credentials in VS Code SecretStorage (never plaintext)
- OAuth2 flows for GitHub, Slack, Jira
- IAM role assumption for AWS
- Zero API keys in code or config files

### 📊 Smart Context Awareness
Auto-detects your stack:
- Frameworks (Next.js, Django, Spring, etc.)
- CI/CD providers (GitHub Actions, GitLab CI)
- Cloud platforms (AWS, GCP, Azure)
- Existing integrations (Stripe, Auth0)
- Package managers, Docker, Kubernetes

### 🎯 Unique Features

**Connection Graph**: Visual map of all connected services with health status and costs.

**Environment Cloning**: `"Clone this setup for staging"` → duplicates all cloud resources with new prefixes. Generates full IaC (Terraform/Pulumi).

**Smart .env Management**: Auto-inject connection strings. Sync to AWS Secrets Manager, HashiCorp Vault, or Doppler.

**Trending Tech Radar**: Uses Perplexity to check "best practices in 2026" before generating code.

**Rollback Support**: Undo last operation with change tracking.

## 🎬 Quick Start

1. **Install Extension**
   ```bash
   # From VS Code Marketplace
   code --install-extension 0xkartikvyas.genie-ops
   
   # Or from source
   npm install
   npm run compile
   ```

2. **Add Your AI API Keys**
   - Open Command Palette (`Cmd+Shift+P`)
   - Run `Genie-ops: Configure AI Models`
   - Add at least one API key (Claude, GPT-4, Gemini)

3. **Start Using**
   - Click the Genie-ops icon in the Activity Bar
   - Type any DevOps task in natural language
   - Watch the magic happen ✨

## 📖 Usage Examples

### Connect to GitHub and Set Up CI/CD
```
> Connect GitHub and create Actions workflow for this Node.js project
```
Genie-ops will:
1. Authenticate with GitHub OAuth
2. Detect your project type (Node.js)
3. Generate `.github/workflows/ci.yml`
4. Commit and push the workflow
5. Show you the Actions dashboard link

### Deploy to AWS with Complete Setup
```
> Deploy this app to AWS with S3, Lambda, and RDS in us-east-1
```
Genie-ops will:
1. Authenticate with AWS
2. Create S3 bucket for static assets
3. Deploy Lambda function
4. Set up RDS PostgreSQL instance
5. Generate connection strings and inject into `.env`
6. Estimate monthly costs

### Vibe Code a Full Application
```
> Vibe code me a task management app with Next.js, Auth0, Stripe, and PostgreSQL
```
Genie-ops will:
1. Generate complete project structure
2. Create all source files (API routes, components, DB schemas)
3. Add Dockerfile and docker-compose.yml
4. Set up GitHub Actions
5. Configure Auth0 and Stripe integrations
6. Provide deployment instructions

## 🛠️ Architecture

```
genie-ops/
├── extension/              # VS Code Extension (TypeScript)
│   ├── src/
│   │   ├── extension.ts    # Activation point
│   │   ├── sidebar/        # WebView UI with chat
│   │   ├── commands/       # All command handlers
│   │   ├── auth/           # OAuth flows
│   │   ├── context/        # Project analyzer
│   │   └── mcp/            # MCP client
│   └── package.json
│
├── mcp-server/             # MCP Backend (Node.js)
│   ├── src/
│   │   ├── server.ts       # MCP protocol handler
│   │   ├── orchestrator/   # Multi-AI routing
│   │   ├── tools/          # DevOps integrations
│   │   ├── vibe/           # Vibe coding engine
│   │   └── secrets/        # Credential management
│   └── package.json
│
└── shared/                 # Shared types
    └── types.ts
```

## 🔧 Configuration

Configure in VS Code settings (`settings.json`):

```json
{
  "genieOps.telemetry.enabled": false,
  "genieOps.models.claude.enabled": true,
  "genieOps.models.openai.enabled": true,
  "genieOps.models.gemini.enabled": true,
  "genieOps.models.mistral.enabled": true,
  "genieOps.models.perplexity.enabled": true,
  "genieOps.autoContext.enabled": true,
  "genieOps.parallelExecution.enabled": true
}
```

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
```bash
# Clone the repo
git clone https://github.com/0xkartikvyas/genie-ops.git
cd genie-ops

# Install dependencies
npm install

# Build extension
npm run compile

# Build MCP server
cd mcp-server && npm install && npm run build

# Run in development
npm run watch
```

### Running Tests
```bash
npm test
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Powered by Anthropic Claude, OpenAI GPT-4, Google Gemini, Mistral
- UI inspired by modern DevOps best practices
- Special thanks to the VS Code extension community

## 📧 Support

- **Documentation**: [https://genie-ops.dev](https://genie-ops.dev)
- **Issues**: [GitHub Issues](https://github.com/0xkartikvyas/genie-ops/issues)
- **Discussions**: [GitHub Discussions](https://github.com/0xkartikvyas/genie-ops/discussions)
- **Twitter**: [@0xkartikvyas](https://twitter.com/0xkartikvyas)

---

**Made with ❤️ by [@0xkartikvyas](https://github.com/0xkartikvyas)**

*Genie-ops is not affiliated with any cloud provider or AI company mentioned.*
