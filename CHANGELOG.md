# Changelog

All notable changes to Genie-ops will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Planned
- Full OAuth implementations for all services
- Connection graph visualization
- Environment cloning feature
- Smart .env sync to HashiCorp Vault, AWS Secrets Manager
- Rollback/undo functionality
- Cost tracking dashboard
- Real-time pod logs for Kubernetes
- Terraform/Pulumi IaC generation
- GitOps setup automation
- Multi-workspace support
- Extension API for custom integrations
