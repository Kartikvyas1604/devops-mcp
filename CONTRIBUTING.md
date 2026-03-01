# Contributing to DevOps Omnibus

First off, thank you for considering contributing to DevOps Omnibus! It's people like you that make this tool such a great resource for the DevOps community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that the bug has already been reported. When you create a bug report, please include as many details as possible:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Execute command '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. macOS 14.0, Windows 11, Ubuntu 22.04]
 - VS Code Version: [e.g. 1.85.0]
 - Extension Version: [e.g. 1.0.0]
 - Node.js Version: [e.g. 18.17.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When you create an enhancement suggestion, please include:

- A clear and descriptive title
- A detailed description of the proposed functionality
- Examples of how the feature would be used
- Why this enhancement would be useful to most users

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Issue your pull request!

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm 9+
- VS Code 1.85+
- Docker (for container integration testing)
- kubectl (for Kubernetes integration testing)

### Getting Started

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/devops-omnibus.git
cd devops-omnibus

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/devops-omnibus.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development
code .
```

### Running the Extension Locally

1. Open the project in VS Code
2. Press `F5` to open a new Extension Development Host window
3. The extension will be active in the new window

### Project Structure

```
src/
├── extension.ts       # Entry point - activate/deactivate
├── ai/               # AI orchestration
├── integrations/     # Cloud and service integrations  
├── nlp/              # Natural language processing
├── services/         # Core services
├── ui/               # UI components
├── utils/            # Utilities
└── workflow/         # Workflow automation

mcp-server/
├── src/
│   ├── server.ts     # MCP server entry
│   └── tools/        # Tool implementations
```

## Coding Guidelines

### TypeScript Style

- Use TypeScript strict mode
- Prefer `async/await` over raw Promises
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

```typescript
/**
 * Execute a DevOps command
 * @param command - The command to execute
 * @param options - Optional execution options
 * @returns The command result
 */
export async function executeCommand(
    command: string,
    options?: ExecuteOptions
): Promise<CommandResult> {
    // Implementation
}
```

### File Naming

- Use camelCase for files: `myService.ts`
- Use PascalCase for classes: `MyService`
- Use camelCase for functions: `executeCommand`
- Use UPPER_SNAKE_CASE for constants: `MAX_RETRIES`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(docker): add support for Docker Compose
fix(aws): resolve Lambda invocation timeout
docs: update README with new examples
test(github): add PR creation tests
```

### Testing

- Write tests for new features
- Maintain existing test coverage
- Use descriptive test names
- Include both positive and negative test cases

```typescript
describe('GitHubIntegration', () => {
    describe('createPullRequest', () => {
        it('should create a pull request with valid parameters', async () => {
            // Test implementation
        });

        it('should throw error when repository not found', async () => {
            // Test implementation
        });
    });
});
```

## Adding New Integrations

### 1. Create Integration File

```typescript
// src/integrations/newService.ts
import * as vscode from 'vscode';

export interface NewServiceConfig {
    apiKey: string;
    region?: string;
}

export class NewServiceClient {
    private config: NewServiceConfig;

    constructor(config: NewServiceConfig) {
        this.config = config;
    }

    async listResources(): Promise<Resource[]> {
        // Implementation
    }
}
```

### 2. Export from Index

```typescript
// src/integrations/index.ts
export * from './newService';
```

### 3. Add MCP Tools

```typescript
// mcp-server/src/tools/newService.ts
export const newServiceTools = [
    {
        name: 'new_service_list',
        description: 'List resources from New Service',
        inputSchema: {
            type: 'object',
            properties: {
                filter: { type: 'string' }
            }
        },
        handler: async (args) => {
            // Implementation
        }
    }
];
```

### 4. Add Tests

```typescript
// test/suite/newService.test.ts
describe('NewServiceClient', () => {
    // Tests
});
```

### 5. Update Documentation

- Add to README.md feature list
- Add usage examples
- Update API documentation

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a release branch
4. Create PR and get approval
5. Merge to main
6. Create GitHub release with tag
7. Publish to VS Code Marketplace

## Getting Help

- Join our Discord server
- Check the documentation
- Open a GitHub issue
- Ask in GitHub Discussions

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README

Thank you for contributing to DevOps Omnibus! 🚀
