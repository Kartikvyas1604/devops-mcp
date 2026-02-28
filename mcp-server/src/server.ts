#!/usr/bin/env node

/**
 * Genie-ops MCP Server
 * 
 * Main entry point for the Model Context Protocol server.
 * Implements the MCP spec and coordinates multi-AI model orchestration
 * with DevOps tool integrations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { AIOrchestrator } from './orchestrator/aiOrchestrator.js';
import { GitHubTool } from './tools/github.js';
import { DockerTool } from './tools/docker.js';
import { AWSTool } from './tools/aws.js';
import { SlackTool } from './tools/slack.js';
import { JiraTool } from './tools/jira.js';
import { GCPTool } from './tools/gcp.js';
import { AzureTool } from './tools/azure.js';
import { KubernetesTool } from './tools/kubernetes.js';
import { VibeCodingEngine } from './vibe/vibeEngine.js';
import { SecretManager } from './secrets/secretManager.js';

/**
 * Main server class implementing MCP protocol.
 */
class GenieOpsMCPServer {
  private server: Server;
  private orchestrator: AIOrchestrator;
  private tools: Map<string, any>;
  private secretManager: SecretManager;
  private vibeEngine: VibeCodingEngine;

  constructor() {
    this.server = new Server(
      {
        name: 'genie-ops-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.secretManager = new SecretManager();
    this.orchestrator = new AIOrchestrator(this.secretManager);
    this.vibeEngine = new VibeCodingEngine(this.orchestrator);
    this.tools = new Map();

    this.initializeTools();
    this.setupHandlers();
  }

  private initializeTools(): void {
    // Initialize all tool integrations
    const toolInstances = [
      new GitHubTool(this.secretManager),
      new DockerTool(this.secretManager),
      new AWSTool(this.secretManager),
      new SlackTool(this.secretManager),
      new JiraTool(this.secretManager),
      new GCPTool(this.secretManager),
      new AzureTool(this.secretManager),
      new KubernetesTool(this.secretManager),
    ];

    for (const tool of toolInstances) {
      for (const toolDef of tool.getTools()) {
        this.tools.set(toolDef.name, {
          definition: toolDef,
          handler: tool,
        });
      }
    }

    console.error(`Genie-ops MCP Server initialized with ${this.tools.size} tools`);
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolList: Tool[] = [];
      for (const [_, toolData] of this.tools) {
        toolList.push(toolData.definition);
      }
      return { tools: toolList };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const toolData = this.tools.get(toolName);

      if (!toolData) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      try {
        const result = await toolData.handler.executeTool(
          toolName,
          request.params.arguments || {}
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Genie-ops MCP Server running on stdio');
  }
}

// Start the server
const server = new GenieOpsMCPServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
