/**
 * AI Orchestrator Tests
 * Tests for multi-model AI execution and tool calling
 */

import * as assert from 'assert';

suite('AI Orchestrator Tests', () => {
  suite('AIOrchestrator Class', () => {
    test('should create orchestrator instance', () => {
      const { AIOrchestrator } = require('../../src/ai/orchestrator');
      
      const orchestrator = new AIOrchestrator({
        defaultProvider: 'anthropic',
        anthropic: { apiKey: 'test-key' },
      });
      
      assert.ok(orchestrator);
    });

    test('should support multiple providers', () => {
      const { AIOrchestrator } = require('../../src/ai/orchestrator');
      
      const orchestrator = new AIOrchestrator({
        defaultProvider: 'anthropic',
        anthropic: { apiKey: 'test-key' },
        openai: { apiKey: 'test-key' },
        google: { apiKey: 'test-key' },
      });
      
      assert.strictEqual(typeof orchestrator.execute, 'function');
      assert.strictEqual(typeof orchestrator.executeWithTools, 'function');
      assert.strictEqual(typeof orchestrator.stream, 'function');
    });

    test('should have required methods', () => {
      const { AIOrchestrator } = require('../../src/ai/orchestrator');
      
      const orchestrator = new AIOrchestrator({
        defaultProvider: 'anthropic',
        anthropic: { apiKey: 'test-key' },
      });

      const requiredMethods = [
        'execute',
        'executeWithTools',
        'stream',
        'countTokens',
        'dispose',
      ];

      requiredMethods.forEach(method => {
        assert.strictEqual(typeof orchestrator[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  suite('ToolExecutor Class', () => {
    test('should create tool executor instance', () => {
      const { ToolExecutor } = require('../../src/ai/toolExecutor');
      
      const executor = new ToolExecutor({} as any);
      assert.ok(executor);
    });

    test('should have DevOps tools defined', () => {
      const { DEVOPS_TOOLS } = require('../../src/ai/toolExecutor');
      
      assert.ok(Array.isArray(DEVOPS_TOOLS));
      assert.ok(DEVOPS_TOOLS.length > 0);
      
      // Check structure of a tool
      const tool = DEVOPS_TOOLS[0];
      assert.ok(tool.name);
      assert.ok(tool.description);
      assert.ok(tool.inputSchema);
    });

    test('should have tools for all DevOps categories', () => {
      const { DEVOPS_TOOLS } = require('../../src/ai/toolExecutor');
      
      const toolNames = DEVOPS_TOOLS.map((t: any) => t.name);
      
      // Check for Docker tools
      assert.ok(toolNames.some((n: string) => n.includes('docker') || n.includes('container')));
      
      // Check for Git tools
      assert.ok(toolNames.some((n: string) => n.includes('git')));
      
      // Check for K8s tools
      assert.ok(toolNames.some((n: string) => n.includes('kubernetes') || n.includes('k8s') || n.includes('pod')));
      
      // Check for Cloud tools
      assert.ok(toolNames.some((n: string) => n.includes('deploy') || n.includes('cloud')));
    });
  });
});

suite('NLP Tests', () => {
  suite('Intent Parser', () => {
    test('should parse deploy intent', () => {
      const { IntentParser } = require('../../src/nlp/intentParser');
      
      const parser = new IntentParser();
      const result = parser.parse('deploy my app to production');
      
      assert.ok(result);
      assert.strictEqual(result.intent, 'deploy');
    });

    test('should parse container intents', () => {
      const { IntentParser } = require('../../src/nlp/intentParser');
      
      const parser = new IntentParser();
      
      const listResult = parser.parse('list all running containers');
      assert.strictEqual(listResult.intent, 'container_list');
      
      const runResult = parser.parse('run nginx container');
      assert.strictEqual(runResult.intent, 'container_run');
    });

    test('should parse git intents', () => {
      const { IntentParser } = require('../../src/nlp/intentParser');
      
      const parser = new IntentParser();
      
      const commitResult = parser.parse('commit changes with message fix bug');
      assert.strictEqual(commitResult.intent, 'git_commit');
      
      const pushResult = parser.parse('push to origin main');
      assert.strictEqual(pushResult.intent, 'git_push');
    });

    test('should extract confidence scores', () => {
      const { IntentParser } = require('../../src/nlp/intentParser');
      
      const parser = new IntentParser();
      const result = parser.parse('deploy to kubernetes');
      
      assert.ok(typeof result.confidence === 'number');
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });
  });

  suite('Entity Extractor', () => {
    test('should extract service names', () => {
      const { EntityExtractor } = require('../../src/nlp/entityExtractor');
      
      const extractor = new EntityExtractor();
      const entities = extractor.extract('deploy user-service to production');
      
      assert.ok(entities.service);
      assert.strictEqual(entities.service, 'user-service');
    });

    test('should extract environment names', () => {
      const { EntityExtractor } = require('../../src/nlp/entityExtractor');
      
      const extractor = new EntityExtractor();
      
      const prodEntities = extractor.extract('deploy to production');
      assert.strictEqual(prodEntities.environment, 'production');
      
      const stagingEntities = extractor.extract('deploy to staging');
      assert.strictEqual(stagingEntities.environment, 'staging');
    });

    test('should extract container names', () => {
      const { EntityExtractor } = require('../../src/nlp/entityExtractor');
      
      const extractor = new EntityExtractor();
      const entities = extractor.extract('stop container nginx-proxy');
      
      assert.ok(entities.container);
    });

    test('should extract branch names', () => {
      const { EntityExtractor } = require('../../src/nlp/entityExtractor');
      
      const extractor = new EntityExtractor();
      const entities = extractor.extract('checkout branch feature/new-login');
      
      assert.ok(entities.branch);
      assert.strictEqual(entities.branch, 'feature/new-login');
    });
  });

  suite('Command Mapper', () => {
    test('should map intent to command', () => {
      const { CommandMapper } = require('../../src/nlp/commandMapper');
      
      const mapper = new CommandMapper();
      const command = mapper.map({
        intent: 'deploy',
        confidence: 0.9,
        entities: {
          service: 'my-app',
          environment: 'production',
        },
      });
      
      assert.ok(command);
      assert.ok(command.action);
    });

    test('should generate correct Docker commands', () => {
      const { CommandMapper } = require('../../src/nlp/commandMapper');
      
      const mapper = new CommandMapper();
      const command = mapper.map({
        intent: 'container_run',
        confidence: 0.9,
        entities: {
          image: 'nginx:latest',
          port: '8080:80',
        },
      });
      
      assert.ok(command.action.includes('docker') || command.type === 'docker');
    });

    test('should handle unknown intents gracefully', () => {
      const { CommandMapper } = require('../../src/nlp/commandMapper');
      
      const mapper = new CommandMapper();
      const command = mapper.map({
        intent: 'unknown_intent_xyz',
        confidence: 0.1,
        entities: {},
      });
      
      assert.ok(command);
      assert.ok(command.fallback || command.type === 'unknown');
    });
  });
});

suite('MCP Server Tools Tests', () => {
  suite('Docker Tools', () => {
    test('should export docker tool handlers', () => {
      const dockerTools = require('../../mcp-server/src/tools/docker');
      
      assert.ok(dockerTools.listContainers);
      assert.ok(dockerTools.runContainer);
      assert.ok(dockerTools.stopContainer);
      assert.ok(dockerTools.buildImage);
    });
  });

  suite('Git Tools', () => {
    test('should export git tool handlers', () => {
      const gitTools = require('../../mcp-server/src/tools/git');
      
      assert.ok(gitTools.gitStatus);
      assert.ok(gitTools.gitCommit);
      assert.ok(gitTools.gitPush);
      assert.ok(gitTools.gitPull);
    });
  });

  suite('CI/CD Tools', () => {
    test('should export cicd tool handlers', () => {
      const cicdTools = require('../../mcp-server/src/tools/cicd');
      
      assert.ok(cicdTools.generatePipeline);
      assert.ok(cicdTools.triggerPipeline);
      assert.ok(cicdTools.getPipelineStatus);
    });
  });

  suite('Cloud Tools', () => {
    test('should export cloud tool handlers', () => {
      const cloudTools = require('../../mcp-server/src/tools/cloud');
      
      assert.ok(cloudTools.deployToAWS);
      assert.ok(cloudTools.deployToGCP);
      assert.ok(cloudTools.deployToAzure);
    });
  });

  suite('Kubernetes Tools', () => {
    test('should export kubernetes tool handlers', () => {
      const k8sTools = require('../../mcp-server/src/tools/kubernetes');
      
      assert.ok(k8sTools.listPods);
      assert.ok(k8sTools.applyManifest);
      assert.ok(k8sTools.deleteResource);
      assert.ok(k8sTools.scalePods);
    });
  });

  suite('Infrastructure Tools', () => {
    test('should export infrastructure tool handlers', () => {
      const infraTools = require('../../mcp-server/src/tools/infrastructure');
      
      assert.ok(infraTools.generateDockerfile);
      assert.ok(infraTools.generateDockerCompose);
      assert.ok(infraTools.generateTerraform);
    });
  });
});

suite('Utility Tests', () => {
  suite('Error Handler', () => {
    test('should have error handling utilities', () => {
      const errorHandler = require('../../src/utils/errorHandler');
      
      assert.ok(errorHandler);
    });
  });

  suite('Validator', () => {
    test('should have validation utilities', () => {
      const validator = require('../../src/utils/validator');
      
      assert.ok(validator);
    });
  });

  suite('Rate Limiter', () => {
    test('should have rate limiting utilities', () => {
      const rateLimiter = require('../../src/utils/rateLimiter');
      
      assert.ok(rateLimiter);
    });
  });
});
