# Testing Guide for Genie-ops

This document outlines the testing strategy and procedures for Genie-ops.

## Testing Philosophy

Genie-ops follows a comprehensive testing approach:
- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test interactions between components
- **E2E Tests**: Test real user workflows from the extension UI
- **Manual Tests**: Test OAuth flows and AI model responses

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=oauth

# Watch mode for development
npm test -- --watch
```

## Test Structure

```
tests/
├── unit/
│   ├── auth/
│   │   ├── oauth.test.ts
│   │   └── secretStorage.test.ts
│   ├── tools/
│   │   ├── github.test.ts
│   │   ├── docker.test.ts
│   │   ├── aws.test.ts
│   │   ├── slack.test.ts
│   │   ├── jira.test.ts
│   │   ├── kubernetes.test.ts
│   │   └── envManagement.test.ts
│   └── orchestrator/
│       └── aiOrchestrator.test.ts
├── integration/
│   ├── mcp-client.test.ts
│   ├── end-to-end-workflow.test.ts
│   └── connection-graph.test.ts
└── e2e/
    ├── github-workflow.test.ts
    ├── vibe-code.test.ts
    └── environment-cloning.test.ts
```

## Unit Test Examples

### Testing OAuth Manager

```typescript
import { OAuthManager } from '../extension/src/auth/oauth';
import { SecretStorageFacade } from '../extension/src/auth/secretStorage';

describe('OAuthManager', () => {
  let oauthManager: OAuthManager;
  let mockSecretStorage: jest.Mocked<SecretStorageFacade>;

  beforeEach(() => {
    mockSecretStorage = {
      storeSecret: jest.fn(),
      getSecret: jest.fn(),
      deleteSecret: jest.fn(),
    } as any;
    
    oauthManager = new OAuthManager(mockSecretStorage);
  });

  test('authenticateGitHub uses VS Code auth API', async () => {
    // Mock VS Code authentication
    const mockSession = { accessToken: 'test-token' };
    jest.spyOn(vscode.authentication, 'getSession').mockResolvedValue(mockSession);

    const result = await oauthManager.authenticateGitHub();

    expect(result).toBe('test-token');
    expect(mockSecretStorage.storeSecret).toHaveBeenCalledWith(
      'github.token',
      'test-token'
    );
  });

  test('isAuthenticated returns true when token exists', async () => {
    mockSecretStorage.getSecret.mockResolvedValue('existing-token');

    const result = await oauthManager.isAuthenticated('github');

    expect(result).toBe(true);
    expect(mockSecretStorage.getSecret).toHaveBeenCalledWith('github.token');
  });

  test('disconnect removes credentials', async () => {
    await oauthManager.disconnect('GitHub');

    expect(mockSecretStorage.deleteSecret).toHaveBeenCalledWith('github.token');
  });
});
```

### Testing Jira Tool

```typescript
import { JiraTool } from '../mcp-server/src/tools/jira';
import { SecretManager } from '../mcp-server/src/secrets/secretManager';
import axios from 'axios';

jest.mock('axios');

describe('JiraTool', () => {
  let jiraTool: JiraTool;
  let mockSecretManager: jest.Mocked<SecretManager>;

  beforeEach(() => {
    mockSecretManager = {
      getSecret: jest.fn(),
    } as any;
    
    jiraTool = new JiraTool(mockSecretManager);
  });

  test('createIssue calls Jira API with correct payload', async () => {
    const credentials = JSON.stringify({
      domain: 'company.atlassian.net',
      credentials: 'base64-encoded-auth',
    });
    mockSecretManager.getSecret.mockResolvedValue(credentials);

    (axios.post as jest.Mock).mockResolvedValue({
      data: { key: 'PROJ-123' },
    });

    const result = await jiraTool.executeTool('jira_create_issue', {
      project: 'PROJ',
      summary: 'Test issue',
      issueType: 'Bug',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/rest/api/3/issue'),
      expect.objectContaining({
        fields: expect.objectContaining({
          summary: 'Test issue',
          issuetype: { name: 'Bug' },
        }),
      }),
      expect.any(Object)
    );

    const response = JSON.parse(result.content[0].text);
    expect(response.issueKey).toBe('PROJ-123');
  });

  test('createEpic creates epic with child stories', async () => {
    const credentials = JSON.stringify({
      domain: 'company.atlassian.net',
      credentials: 'base64-encoded-auth',
    });
    mockSecretManager.getSecret.mockResolvedValue(credentials);

    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: { key: 'PROJ-1' } }) // Epic
      .mockResolvedValueOnce({ data: { key: 'PROJ-2' } }) // Story 1
      .mockResolvedValueOnce({ data: { key: 'PROJ-3' } }); // Story 2

    const result = await jiraTool.executeTool('jira_create_epic', {
      project: 'PROJ',
      epicName: 'Q1 Features',
      features: ['Feature A', 'Feature B'],
    });

    expect(axios.post).toHaveBeenCalledTimes(3);
    const response = JSON.parse(result.content[0].text);
    expect(response.childIssues).toEqual(['PROJ-2', 'PROJ-3']);
  });
});
```

### Testing Environment Management

```typescript
import { EnvManagementTool } from '../mcp-server/src/tools/envManagement';

describe('EnvManagementTool', () => {
  let envTool: EnvManagementTool;

  beforeEach(() => {
    envTool = new EnvManagementTool({} as any);
  });

  test('cloneEnvironment generates Terraform code', async () => {
    const result = await envTool.executeTool('env_clone', {
      sourceEnv: 'staging',
      targetEnv: 'production',
      cloud: 'aws',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
    expect(response.terraform).toContain('resource "aws_vpc"');
    expect(response.terraform).toContain('production-vpc');
  });

  test('rollback fails without force for irreversible operations', async () => {
    // Track an irreversible operation
    envTool.trackOperation('destructive_op', {}, {}, false);

    const result = await envTool.executeTool('env_rollback', {
      steps: 1,
      force: false,
    });

    expect(result.isError).toBe(true);
    const response = JSON.parse(result.content[0].text);
    expect(response.error).toContain('irreversible');
  });

  test('rollback succeeds with force flag', async () => {
    envTool.trackOperation('some_op', {}, {}, false);

    const result = await envTool.executeTool('env_rollback', {
      steps: 1,
      force: true,
    });

    expect(result.isError).toBeFalsy();
    const response = JSON.parse(result.content[0].text);
    expect(response.success).toBe(true);
  });
});
```

## Integration Tests

### Testing MCP Client Communication

```typescript
describe('MCP Client Integration', () => {
  test('sendChat forwards request to MCP server', async () => {
    const mcpClient = new McpClient({ ... });
    await mcpClient.start();

    const result = await mcpClient.sendChat('Deploy to AWS');

    expect(result.modelResponses.length).toBeGreaterThan(0);
    expect(result.modelResponses[0].modelName).toBeDefined();
  });
});
```

### Testing Connection Graph

```typescript
describe('ConnectionGraphPanel', () => {
  test('displays connected services', async () => {
    const panel = ConnectionGraphPanel.createOrShow(extensionUri, oauthManager);
    await panel.refresh();

    // Verify WebView content includes service cards
    const html = await getWebViewHTML(panel);
    expect(html).toContain('service-card');
    expect(html).toContain('GitHub');
  });
});
```

## E2E Tests

### Testing GitHub Workflow

```typescript
describe('GitHub Workflow E2E', () => {
  test('complete GitHub setup workflow', async () => {
    // 1. Connect GitHub
    await vscode.commands.executeCommand('genie-ops.connectService.github');
    
    // 2. Create repo
    const chatPrompt = 'Create a new GitHub repo called test-repo';
    await vscode.commands.executeCommand('genie-ops.runTask');
    
    // 3. Verify repo created (mock Octokit)
    expect(mockOctokit.repos.create).toHaveBeenCalled();
    
    // 4. Setup GitHub Actions
    // 5. Verify workflow file generated
  });
});
```

## Manual Testing Checklist

### OAuth Flows
- [ ] GitHub OAuth redirects to VS Code auth
- [ ] AWS credentials prompt appears
- [ ] GCP service account upload works
- [ ] Slack token input validates
- [ ] Jira domain + API token stores correctly
- [ ] Kubernetes kubeconfig path saves

### AI Orchestration
- [ ] Multiple models respond in parallel
- [ ] Winner selection picks fastest/best
- [ ] Perplexity triggers for "trending" queries
- [ ] Context enrichment includes project details

### Tool Integrations
- [ ] GitHub: Create repo, setup Actions, create PR
- [ ] Docker: Generate Dockerfile, compose, build image
- [ ] AWS: Create S3 bucket, deploy Lambda
- [ ] Slack: Send message, create channel
- [ ] Jira: Create issue, create epic with stories
- [ ] Kubernetes: Generate deployment, Helm chart
- [ ] Environment: Clone env, generate IaC, rollback

### Vibe Code Engine
- [ ] Next.js app scaffold generates
- [ ] Files structure includes all required files
- [ ] Conditional dependencies (Stripe, Auth0) work
- [ ] Dockerfile uses multi-stage build

### Connection Graph
- [ ] All connected services display with green status
- [ ] Unconnected services show as disconnected
- [ ] Disconnect button removes credentials
- [ ] Refresh updates service status
- [ ] Health indicators update correctly

## Mocking Strategies

### Mocking Cloud SDKs

```typescript
// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ /* mock response */ }),
  })),
  CreateBucketCommand: jest.fn(),
}));

// Mock Octokit
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    repos: {
      create: jest.fn().mockResolvedValue({ data: { name: 'test-repo' } }),
    },
  })),
}));
```

### Mocking VS Code API

```typescript
const mockVSCode = {
  window: {
    showInputBox: jest.fn().mockResolvedValue('user-input'),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  authentication: {
    getSession: jest.fn().mockResolvedValue({ accessToken: 'token' }),
  },
};

jest.mock('vscode', () => mockVSCode, { virtual: true });
```

## Coverage Requirements

- **Minimum Coverage**: 70%
- **Critical Paths**: 90% (OAuth, MCP client, tool handlers)
- **UI Components**: 50% (WebView panels)

## CI/CD Integration

Tests run automatically on:
- Every commit (via pre-commit hook)
- Pull requests (GitHub Actions)
- Before release (manual trigger)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Debugging Tests

```bash
# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand oauth.test.ts

# Verbose output
npm test -- --verbose

# Show console logs
npm test -- --silent=false
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [MCP SDK Testing Patterns](https://github.com/modelcontextprotocol/sdk)
