# DevOps Omnibus 🚀

<div align="center">

**The World's Most Powerful Developer Automation Platform**

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Compatible-purple.svg)](https://modelcontextprotocol.io/)

*Your AI-powered command center for DevOps, Cloud, and Infrastructure automation*

</div>

---

## ✨ Features

### 🤖 AI-Powered Natural Language Interface
Execute complex DevOps operations using simple natural language commands:
- "Deploy the main branch to production on AWS"
- "Show me all running containers and their resource usage"
- "Scale the web service to 5 replicas in Kubernetes"
- "Create a new feature branch and set up CI/CD pipeline"

### ☁️ Multi-Cloud Provider Support

| Provider | Services |
|----------|----------|
| **AWS** | Lambda, S3, EC2, ECS, ECR, CloudWatch, STS |
| **Google Cloud** | Cloud Functions, Cloud Run, GKE, GCS, Compute Engine, Pub/Sub |
| **Azure** | Functions, App Service, AKS, Storage, ACR, VMs |

### 🐳 Container & Orchestration
- **Docker**: Full container lifecycle management, image operations, networks, volumes
- **Kubernetes**: Pods, Deployments, Services, ConfigMaps, Secrets, Helm charts

### 🔄 CI/CD & Version Control
- **GitHub**: Repositories, Issues, PRs, Actions workflows, Releases
- **GitLab**: Repositories, Pipelines, Merge Requests
- **Jenkins**: Jobs, Builds, Pipelines

### 💬 Collaboration Integrations
- **Slack**: Messages, Channels, Block Kit notifications, Deployment alerts
- **Jira**: Issues, Sprints, Boards, JQL queries

### 🔧 Workflow Automation Engine
Pre-built workflow templates:
- CI/CD Pipeline
- Kubernetes Blue-Green Deployment
- Canary Release with Metrics Evaluation
- Database Migration with Rollback
- Infrastructure Provisioning (Terraform)
- Disaster Recovery Failover

---

## 🏗️ Architecture

```
devops-omnibus/
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   ├── ai/                   # AI orchestration layer
│   │   ├── orchestrator.ts   # Multi-provider AI (Claude, GPT-4, Gemini, Mistral)
│   │   └── toolExecutor.ts   # MCP tool execution bridge
│   ├── integrations/         # Service integrations
│   │   ├── aws.ts            # AWS SDK v3 integration
│   │   ├── gcp.ts            # Google Cloud integration
│   │   ├── azure.ts          # Azure Management integration
│   │   ├── docker.ts         # Dockerode container client
│   │   ├── kubernetes.ts     # kubectl + Helm wrapper
│   │   ├── github.ts         # GitHub API integration
│   │   ├── slack.ts          # Slack Block Kit client
│   │   └── jira.ts           # Jira REST API client
│   ├── nlp/                  # Natural language processing
│   │   ├── intentParser.ts   # Intent classification
│   │   ├── entityExtractor.ts # Named entity extraction
│   │   └── commandMapper.ts  # NL to command mapping
│   ├── workflow/             # Workflow automation
│   │   ├── engine.ts         # Workflow execution engine
│   │   └── templates.ts      # Pre-built workflow templates
│   ├── services/             # Core services
│   │   ├── authService.ts    # Authentication management
│   │   ├── configService.ts  # Configuration management
│   │   ├── secretsService.ts # Secure credential storage
│   │   └── loggingService.ts # Structured logging
│   ├── utils/                # Utility modules
│   │   ├── cache.ts          # Advanced caching (LRU/LFU/TTL)
│   │   ├── metrics.ts        # Observability metrics
│   │   └── resilience.ts     # Circuit breaker, retry, bulkhead
│   └── ui/                   # UI components
│       ├── commandPalette.ts
│       ├── statusBar.ts
│       └── treeViews/
└── mcp-server/               # MCP tool server
    └── src/
        ├── server.ts         # MCP server entry
        └── tools/            # 35+ DevOps tools
```

---

## 🚀 Quick Start

### Prerequisites
- VS Code 1.85+
- Node.js 18+
- Docker (for container features)
- kubectl (for Kubernetes features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/devops-omnibus.git
cd devops-omnibus

# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test
```

### Configuration

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "DevOps Omnibus"
3. Configure your providers:

```json
{
  "devopsOmnibus.aws.region": "us-west-2",
  "devopsOmnibus.aws.profile": "default",
  "devopsOmnibus.gcp.projectId": "my-project",
  "devopsOmnibus.azure.subscriptionId": "xxx-xxx-xxx",
  "devopsOmnibus.ai.provider": "anthropic",
  "devopsOmnibus.ai.model": "claude-sonnet-4-20250514"
}
```

---

## 📖 Usage Examples

### Natural Language Commands

```
# Container Operations
"List all running Docker containers"
"Build and push the web-app image to ECR"
"Show container logs for nginx"

# Kubernetes Operations
"Deploy the staging manifests to the dev cluster"
"Scale the api-service deployment to 3 replicas"
"Get all pods in the production namespace"

# Cloud Operations
"Invoke the process-orders Lambda function"
"List all S3 buckets with versioning enabled"
"Create a new Cloud Run service from the latest image"

# CI/CD Operations
"Trigger the deploy workflow on main branch"
"Show the status of all GitHub Actions running"
"Create a release for version 2.1.0"

# Collaboration
"Send deployment notification to #devops Slack channel"
"Create a bug issue in Jira for the login service"
"Add a comment to PR #123"
```

### Workflow Execution

```typescript
import { createCICDWorkflow, WorkflowEngine } from './workflow';

// Use pre-built template
const workflow = createCICDWorkflow({
  repository: 'my-app',
  branch: 'main',
  environment: 'production'
});

// Execute workflow
const engine = new WorkflowEngine();
await engine.execute(workflow);
```

### Custom Workflow Builder

```typescript
import { WorkflowBuilder } from './workflow';

const workflow = new WorkflowBuilder('custom-deploy')
  .addTask('checkout', { action: 'git.clone', repo: 'my-app' })
  .addTask('test', { action: 'shell.exec', command: 'npm test' })
  .addParallel('build', [
    { action: 'docker.build', dockerfile: './Dockerfile' },
    { action: 'shell.exec', command: 'npm run lint' }
  ])
  .addApproval('prod-approval', { approvers: ['team-lead'] })
  .addTask('deploy', { action: 'kubernetes.apply', manifests: './k8s/' })
  .build();
```

---

## 🔌 MCP Server Tools

The extension exposes 35+ tools via Model Context Protocol:

### Docker Tools
- `docker_list_containers` - List all containers
- `docker_run_container` - Run a new container
- `docker_stop_container` - Stop running container
- `docker_build_image` - Build Docker image
- `docker_push_image` - Push image to registry

### Kubernetes Tools
- `k8s_get_pods` - List pods in namespace
- `k8s_apply_manifest` - Apply YAML manifest
- `k8s_scale_deployment` - Scale deployment replicas
- `k8s_rollout_status` - Check rollout status
- `helm_install` - Install Helm chart

### Cloud Tools
- `aws_lambda_invoke` - Invoke Lambda function
- `aws_s3_list_buckets` - List S3 buckets
- `gcp_run_deploy` - Deploy to Cloud Run
- `azure_function_invoke` - Invoke Azure Function

### Git Tools
- `git_clone` - Clone repository
- `git_create_branch` - Create new branch
- `git_create_pr` - Create pull request
- `github_trigger_workflow` - Trigger GitHub Action

---

## 🛡️ Resilience & Reliability

Built-in patterns for production reliability:

```typescript
import { resilience, CircuitBreaker, RetryManager } from './utils';

// Combined resilience policy
const policy = resilience()
  .withCircuitBreaker({ failureThreshold: 5 })
  .withRetry({ maxAttempts: 3, backoffMultiplier: 2 })
  .withBulkhead({ maxConcurrent: 10 })
  .withTimeout(30000);

const result = await policy.execute(() => apiCall());
```

### Features
- **Circuit Breaker**: Prevents cascading failures
- **Retry with Backoff**: Exponential backoff with jitter
- **Bulkhead**: Concurrency isolation
- **Rate Limiting**: Token bucket & sliding window
- **Timeout Control**: Configurable operation timeouts

---

## 📊 Observability

Comprehensive metrics collection:

```typescript
import { metrics, commandMetrics } from './utils';

// Track command execution
commandMetrics.executed.inc();
commandMetrics.duration.time(async () => {
  await executeCommand();
});

// Export Prometheus metrics
const prometheusOutput = metrics.exportPrometheus();
```

### Metrics Types
- **Counter**: Monotonically increasing values
- **Gauge**: Values that can go up/down
- **Histogram**: Distribution of values
- **Timer**: Duration measurements with percentiles

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "GitHub"

# Run with coverage
npm run test:coverage
```

Test coverage includes:
- Unit tests for all integrations
- AI orchestrator tests
- NLP parsing tests
- Workflow engine tests
- MCP tool tests

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP specification
- [Anthropic](https://anthropic.com/) for Claude AI
- [VS Code](https://code.visualstudio.com/) for the extension API

---

<div align="center">

**Built with ❤️ for the DevOps community**

[Documentation](docs/) · [Report Bug](issues) · [Request Feature](issues)

</div>