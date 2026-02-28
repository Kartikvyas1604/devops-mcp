# Changelog

All notable changes to Genie-ops will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Smart .env sync to HashiCorp Vault, AWS Secrets Manager
- Cost tracking dashboard with real-time updates
- Real-time pod logs streaming for Kubernetes
- GitOps setup automation (ArgoCD, Flux)
- Multi-workspace support
- Extension API for custom integrations
- Auto-remediation for common DevOps issues

## [1.1.0] - 2026-03-15

### Added
- 🔐 Complete OAuth integration system
  * GitHub OAuth via VS Code built-in authentication
  * AWS authentication (Access Keys, SSO, IAM Role)
  * GCP authentication (Service Account JSON, gcloud CLI)
  * Slack, Jira OAuth flows with token management
  * Kubernetes kubeconfig integration
  * Disconnect command for credential removal
- 📊 Connection Graph visualization panel
  * Visual service cards with connection status
  * Health indicators (healthy, degraded, down, unknown)
  * Interactive UI with disconnect buttons
  * Real-time refresh capability
- 🎫 Full Jira integration
  * Create issues with priority and assignee
  * Create epics with automatic child story generation
  * Transition issues through workflow
  * Add comments to issues
  * Uses Atlassian REST API with Basic Auth
- ☸️ Enhanced Kubernetes tooling
  * Generate Deployment + Service YAML with env vars
  * Generate Ingress with TLS/cert-manager support
  * Full Helm chart scaffolding with templates
  * Get pod logs (simulated, ready for k8s API)
- 🔄 Environment cloning and management
  * One-click environment duplication (staging → production)
  * Generate Terraform/Pulumi IaC from infrastructure
  * Operation history tracking with audit trail
  * Rollback system for reversible operations
- 🎨 Enhanced icon with purple gradient and genie lamp design

### Security
- OAuth manager with centralized credential handling
- Automatic auth status checks for all services
- Secure token storage in VS Code SecretStorage

## [1.0.0] - 2026-02-28

### Added
- 🎉 Initial release of Genie-ops
- Multi-AI orchestration with Claude 3.5, GPT-4o, Gemini Pro, Mistral, Perplexity
- Model race feature: parallel execution and automatic winner selection
- GitHub integration: repos, Actions CI/CD, PRs, secrets management
- Docker integration: Dockerfile generation, compose, build, container management
- AWS integration: S3, EC2, Lambda, cost estimation
- Slack integration: messaging, channels, webhooks, deployment notifications
- Vibe Coding Engine: full application generation from natural language
- Project context analyzer: auto-detects frameworks, CI/CD, cloud integrations
- Secure credential storage using VS Code SecretStorage
- WebView sidebar with chat interface
- Status bar indicator for MCP connection
- Support for macOS, Windows, Linux

### Security
- All credentials stored securely in VS Code SecretStorage
- Never stores API keys in plaintext
- OAuth2 flows for supported services

