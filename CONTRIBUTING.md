# Contributing to Genie-ops

Thank you for your interest in contributing to Genie-ops! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions.

## How to Contribute

### Reporting Bugs
- Use GitHub Issues
- Include system info (OS, VS Code version, Node version)
- Provide steps to reproduce
- Include error messages and logs

### Suggesting Features
- Check existing issues first
- Clearly describe the use case
- Explain why it would benefit users

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/0xkartikvyas/genie-ops.git
   cd genie-ops
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow TypeScript strict mode
   - Add JSDoc comments
   - Write tests for new features
   - Update documentation

4. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run compile
   ```

5. **Commit with Conventional Commits**
   ```bash
   git commit -m "feat: add new integration"
   git commit -m "fix: resolve connection issue"
   git commit -m "docs: update setup guide"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Development Setup

### Prerequisites
- Node.js 20+
- VS Code latest stable
- Git

### Installation
```bash
npm install
cd extension && npm install
cd ../mcp-server && npm install
```

### Running Locally
```bash
# Terminal 1: Watch extension
npm run watch

# Terminal 2: Watch MCP server
cd mcp-server && npm run dev

# Press F5 in VS Code to launch Extension Development Host
```

### Project Structure
```
extension/    - VS Code extension code
mcp-server/   - MCP backend server
shared/       - Shared types
```

### Code Style
- Use TypeScript strict mode
- 2-space indentation (tabs for markdown)
- Prettier for formatting
- ESLint for linting

### Adding New Integrations

1. Create tool file: `mcp-server/src/tools/yourservice.ts`
2. Implement `getTools()` and `executeTool()` methods
3. Register in `mcp-server/src/server.ts`
4. Add command in `extension/package.json`
5. Add handler in `extension/src/commands/index.ts`
6. Update documentation

### Testing
- All tools must have unit tests
- Integration tests for OAuth flows
- E2E tests for critical paths

## Questions?

Open a Discussion on GitHub or reach out to [@0xkartikvyas](https://twitter.com/0xkartikvyas).

Thank you for contributing! 🎉
