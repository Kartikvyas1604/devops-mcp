/**
 * Tool Executor - Bridges AI orchestrator with MCP tools
 * 
 * Converts AI tool calls into MCP tool invocations and returns results
 */

import * as vscode from 'vscode';
import { AITool, AIToolCall } from '../ai/orchestrator';
import { MCPClient } from '../mcp/client';
import { LoggingService } from '../services/loggingService';

export interface ToolResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result: string;
  error?: string;
}

// DevOps Omnibus tool definitions for AI
export const DEVOPS_TOOLS: AITool[] = [
  // Docker Tools
  {
    name: 'docker_list_containers',
    description: 'List all Docker containers. Use this to see running containers, their status, ports, and names.',
    input_schema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'Show all containers including stopped ones' }
      }
    }
  },
  {
    name: 'docker_run_container',
    description: 'Run a new Docker container from an image. Specify the image, ports, environment variables, and volumes.',
    input_schema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Docker image name (e.g., nginx:latest, postgres:16)' },
        name: { type: 'string', description: 'Container name' },
        ports: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Port mappings in format "host:container" (e.g., ["8080:80", "5432:5432"])' 
        },
        env: { 
          type: 'object', 
          description: 'Environment variables as key-value pairs' 
        },
        detach: { type: 'boolean', description: 'Run in background (default: true)' }
      },
      required: ['image']
    }
  },
  {
    name: 'docker_stop_container',
    description: 'Stop a running Docker container by name or ID.',
    input_schema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'Container name or ID' }
      },
      required: ['container']
    }
  },
  {
    name: 'docker_container_logs',
    description: 'Get logs from a Docker container to debug issues or monitor output.',
    input_schema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'Container name or ID' },
        tail: { type: 'number', description: 'Number of lines to show (default: 100)' }
      },
      required: ['container']
    }
  },
  {
    name: 'docker_build_image',
    description: 'Build a Docker image from a Dockerfile in the specified directory.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to build context (directory with Dockerfile)' },
        tag: { type: 'string', description: 'Image tag (e.g., myapp:latest)' },
        dockerfile: { type: 'string', description: 'Dockerfile path relative to context' }
      },
      required: ['path', 'tag']
    }
  },

  // Git Tools
  {
    name: 'git_status',
    description: 'Get the current git repository status including staged, modified, and untracked files.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repository path (default: current workspace)' }
      }
    }
  },
  {
    name: 'git_commit',
    description: 'Create a git commit with a message. Can optionally stage all changes first.',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        all: { type: 'boolean', description: 'Stage all changes before committing' }
      },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push commits to the remote repository.',
    input_schema: {
      type: 'object',
      properties: {
        remote: { type: 'string', description: 'Remote name (default: origin)' },
        branch: { type: 'string', description: 'Branch name' },
        force: { type: 'boolean', description: 'Force push' }
      }
    }
  },
  {
    name: 'git_branch',
    description: 'List, create, or delete git branches.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'create', 'delete'], description: 'Action to perform' },
        name: { type: 'string', description: 'Branch name for create/delete' },
        checkout: { type: 'boolean', description: 'Checkout after creating' }
      }
    }
  },

  // CI/CD Tools
  {
    name: 'cicd_generate_pipeline',
    description: 'Generate a CI/CD pipeline configuration file for GitHub Actions, GitLab CI, Jenkins, or Azure Pipelines.',
    input_schema: {
      type: 'object',
      properties: {
        platform: { 
          type: 'string', 
          enum: ['github', 'gitlab', 'jenkins', 'azure'],
          description: 'CI/CD platform' 
        },
        projectType: { 
          type: 'string', 
          description: 'Project type (node, python, go, java, rust, etc.)' 
        },
        stages: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Pipeline stages (e.g., ["build", "test", "deploy"])' 
        },
        deployTarget: { 
          type: 'string', 
          description: 'Deployment target (aws, gcp, azure, k8s)' 
        }
      },
      required: ['platform', 'projectType']
    }
  },
  {
    name: 'cicd_trigger_pipeline',
    description: 'Trigger a CI/CD pipeline run on GitHub, GitLab, or Jenkins.',
    input_schema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['github', 'gitlab', 'jenkins'], description: 'CI/CD platform' },
        repo: { type: 'string', description: 'Repository (owner/repo)' },
        workflow: { type: 'string', description: 'Workflow or pipeline name' },
        branch: { type: 'string', description: 'Branch to run on' }
      },
      required: ['platform', 'repo', 'workflow']
    }
  },

  // Cloud Tools
  {
    name: 'cloud_deploy',
    description: 'Deploy an application to cloud infrastructure (AWS Lambda, ECS, GCP Cloud Run, Azure App Service, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        service: { 
          type: 'string', 
          description: 'Service type (lambda, ecs, cloudrun, appservice, etc.)' 
        },
        config: { 
          type: 'object', 
          description: 'Deployment configuration (varies by service)' 
        },
        region: { type: 'string', description: 'Deployment region' }
      },
      required: ['provider', 'service', 'config']
    }
  },
  {
    name: 'cloud_list_resources',
    description: 'List cloud resources (EC2 instances, S3 buckets, Lambda functions, etc.)',
    input_schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        resourceType: { type: 'string', description: 'Resource type (ec2, s3, lambda, etc.)' },
        region: { type: 'string', description: 'Region filter' }
      },
      required: ['provider', 'resourceType']
    }
  },

  // Kubernetes Tools
  {
    name: 'k8s_get_pods',
    description: 'List Kubernetes pods with their status, restarts, and age.',
    input_schema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', description: 'Namespace (default: default)' },
        selector: { type: 'string', description: 'Label selector (e.g., app=nginx)' },
        allNamespaces: { type: 'boolean', description: 'List from all namespaces' }
      }
    }
  },
  {
    name: 'k8s_apply',
    description: 'Apply a Kubernetes manifest (YAML) to create or update resources.',
    input_schema: {
      type: 'object',
      properties: {
        manifest: { type: 'string', description: 'YAML manifest content or file path' },
        namespace: { type: 'string', description: 'Namespace' }
      },
      required: ['manifest']
    }
  },
  {
    name: 'k8s_scale',
    description: 'Scale a Kubernetes deployment to a specific number of replicas.',
    input_schema: {
      type: 'object',
      properties: {
        deployment: { type: 'string', description: 'Deployment name' },
        replicas: { type: 'number', description: 'Number of replicas' },
        namespace: { type: 'string', description: 'Namespace' }
      },
      required: ['deployment', 'replicas']
    }
  },
  {
    name: 'k8s_logs',
    description: 'Get logs from a Kubernetes pod.',
    input_schema: {
      type: 'object',
      properties: {
        pod: { type: 'string', description: 'Pod name' },
        namespace: { type: 'string', description: 'Namespace' },
        container: { type: 'string', description: 'Container name (if multiple)' },
        tail: { type: 'number', description: 'Number of lines' }
      },
      required: ['pod']
    }
  },

  // Infrastructure Tools
  {
    name: 'infra_generate_dockerfile',
    description: 'Generate an optimized Dockerfile for a project based on its type.',
    input_schema: {
      type: 'object',
      properties: {
        projectType: { 
          type: 'string', 
          description: 'Project type (node, python, go, java, rust, dotnet)' 
        },
        projectPath: { type: 'string', description: 'Path to analyze project structure' },
        multiStage: { type: 'boolean', description: 'Use multi-stage build (default: true)' },
        optimize: { type: 'boolean', description: 'Apply optimizations (default: true)' }
      },
      required: ['projectType']
    }
  },
  {
    name: 'infra_generate_compose',
    description: 'Generate a Docker Compose configuration with optional database, cache, and proxy services.',
    input_schema: {
      type: 'object',
      properties: {
        services: { 
          type: 'array',
          items: { 
            type: 'object',
            properties: {
              name: { type: 'string' },
              image: { type: 'string' },
              ports: { type: 'array', items: { type: 'string' } }
            }
          },
          description: 'Service definitions' 
        },
        includeDatabase: { 
          type: 'string', 
          description: 'Database to include (postgres, mysql, mongodb)' 
        },
        includeCache: { type: 'boolean', description: 'Include Redis cache' },
        includeProxy: { type: 'boolean', description: 'Include nginx proxy' }
      },
      required: ['services']
    }
  },
  {
    name: 'infra_generate_terraform',
    description: 'Generate Terraform infrastructure code for AWS, GCP, or Azure.',
    input_schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        resources: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', description: 'Resource type (s3, lambda, ec2, etc.)' },
              name: { type: 'string', description: 'Resource name' },
              config: { type: 'object', description: 'Resource configuration' }
            }
          },
          description: 'Resources to create' 
        },
        modules: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Terraform modules to use (vpc, eks, gke)' 
        }
      },
      required: ['provider', 'resources']
    }
  }
];

export class ToolExecutor {
  private mcpClient: MCPClient;
  private logger: LoggingService;

  constructor(mcpClient: MCPClient, logger: LoggingService) {
    this.mcpClient = mcpClient;
    this.logger = logger;
  }

  async executeToolCalls(toolCalls: AIToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      this.logger.info(`Executing tool: ${toolCall.name}`, toolCall.input);
      
      try {
        const result = await this.mcpClient.executeTool(toolCall.name, toolCall.input);
        
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          success: result.success,
          result: JSON.stringify(result.data ?? result)
        });

        this.logger.debug(`Tool ${toolCall.name} completed successfully`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          success: false,
          result: '',
          error: errorMessage
        });

        this.logger.error(`Tool ${toolCall.name} failed`, error);
      }
    }

    return results;
  }

  async executeSingleTool(name: string, input: Record<string, unknown>): Promise<string> {
    this.logger.info(`Executing single tool: ${name}`, input);
    const result = await this.mcpClient.executeTool(name, input);
    return JSON.stringify(result.data ?? result);
  }

  getToolDefinitions(): AITool[] {
    return DEVOPS_TOOLS;
  }

  getToolByName(name: string): AITool | undefined {
    return DEVOPS_TOOLS.find(t => t.name === name);
  }
}
