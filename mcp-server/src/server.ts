/**
 * DevOps Omnibus MCP Server
 * 
 * Model Context Protocol server implementing DevOps tools for:
 * - Docker container management
 * - CI/CD pipeline operations
 * - Cloud deployments (AWS, GCP, Azure)
 * - Git operations
 * - Infrastructure automation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { DockerTools } from './tools/docker.js';
import { GitTools } from './tools/git.js';
import { CICDTools } from './tools/cicd.js';
import { CloudTools } from './tools/cloud.js';
import { KubernetesTools } from './tools/kubernetes.js';
import { InfrastructureTools } from './tools/infrastructure.js';

// Tool definitions
const TOOLS: Tool[] = [
  // Docker Tools
  {
    name: 'docker_list_containers',
    description: 'List all Docker containers (running and stopped)',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'Show all containers (default shows just running)' },
        filters: { type: 'object', description: 'Filter containers by labels, status, etc.' }
      }
    }
  },
  {
    name: 'docker_run_container',
    description: 'Run a new Docker container from an image',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Docker image name' },
        name: { type: 'string', description: 'Container name' },
        ports: { type: 'array', items: { type: 'string' }, description: 'Port mappings (e.g., "8080:80")' },
        env: { type: 'object', description: 'Environment variables' },
        volumes: { type: 'array', items: { type: 'string' }, description: 'Volume mounts' },
        detach: { type: 'boolean', description: 'Run in background' }
      },
      required: ['image']
    }
  },
  {
    name: 'docker_stop_container',
    description: 'Stop a running Docker container',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'Container ID or name' },
        timeout: { type: 'number', description: 'Seconds to wait before killing' }
      },
      required: ['container']
    }
  },
  {
    name: 'docker_remove_container',
    description: 'Remove a Docker container',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'Container ID or name' },
        force: { type: 'boolean', description: 'Force removal of running container' },
        volumes: { type: 'boolean', description: 'Remove associated volumes' }
      },
      required: ['container']
    }
  },
  {
    name: 'docker_container_logs',
    description: 'Get logs from a Docker container',
    inputSchema: {
      type: 'object',
      properties: {
        container: { type: 'string', description: 'Container ID or name' },
        tail: { type: 'number', description: 'Number of lines to show from end' },
        since: { type: 'string', description: 'Show logs since timestamp' }
      },
      required: ['container']
    }
  },
  {
    name: 'docker_build_image',
    description: 'Build a Docker image from a Dockerfile',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to build context' },
        dockerfile: { type: 'string', description: 'Dockerfile path (relative to context)' },
        tag: { type: 'string', description: 'Image tag (e.g., "myapp:latest")' },
        buildArgs: { type: 'object', description: 'Build arguments' },
        noCache: { type: 'boolean', description: 'Do not use cache' }
      },
      required: ['path', 'tag']
    }
  },
  {
    name: 'docker_list_images',
    description: 'List Docker images',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', description: 'Show all images (including intermediates)' },
        filters: { type: 'object', description: 'Filter images' }
      }
    }
  },
  {
    name: 'docker_push_image',
    description: 'Push a Docker image to a registry',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Image name with tag' },
        registry: { type: 'string', description: 'Registry URL (default: Docker Hub)' }
      },
      required: ['image']
    }
  },

  // Git Tools  
  {
    name: 'git_status',
    description: 'Get the current git repository status',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repository path' }
      }
    }
  },
  {
    name: 'git_commit',
    description: 'Create a git commit with staged changes',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        path: { type: 'string', description: 'Repository path' },
        all: { type: 'boolean', description: 'Stage all changes before commit' }
      },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push commits to remote repository',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repository path' },
        remote: { type: 'string', description: 'Remote name (default: origin)' },
        branch: { type: 'string', description: 'Branch name' },
        force: { type: 'boolean', description: 'Force push' }
      }
    }
  },
  {
    name: 'git_pull',
    description: 'Pull changes from remote repository',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repository path' },
        remote: { type: 'string', description: 'Remote name' },
        branch: { type: 'string', description: 'Branch name' },
        rebase: { type: 'boolean', description: 'Use rebase instead of merge' }
      }
    }
  },
  {
    name: 'git_branch',
    description: 'Create, list, or delete git branches',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Repository path' },
        name: { type: 'string', description: 'Branch name (for create/delete)' },
        action: { type: 'string', enum: ['list', 'create', 'delete'], description: 'Action to perform' },
        checkout: { type: 'boolean', description: 'Checkout after creating' }
      }
    }
  },

  // CI/CD Tools
  {
    name: 'cicd_generate_pipeline',
    description: 'Generate a CI/CD pipeline configuration',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['github', 'gitlab', 'jenkins', 'azure'], description: 'CI/CD platform' },
        projectType: { type: 'string', description: 'Project type (node, python, go, java, etc.)' },
        stages: { type: 'array', items: { type: 'string' }, description: 'Pipeline stages' },
        deployTarget: { type: 'string', description: 'Deployment target (aws, gcp, azure, k8s)' },
        outputPath: { type: 'string', description: 'Where to save the config file' }
      },
      required: ['platform', 'projectType']
    }
  },
  {
    name: 'cicd_trigger_pipeline',
    description: 'Trigger a CI/CD pipeline run',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['github', 'gitlab', 'jenkins'], description: 'CI/CD platform' },
        repo: { type: 'string', description: 'Repository (owner/repo)' },
        workflow: { type: 'string', description: 'Workflow/pipeline name' },
        branch: { type: 'string', description: 'Branch to run on' },
        inputs: { type: 'object', description: 'Workflow inputs' }
      },
      required: ['platform', 'repo', 'workflow']
    }
  },
  {
    name: 'cicd_get_pipeline_status',
    description: 'Get the status of a CI/CD pipeline run',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['github', 'gitlab', 'jenkins'], description: 'CI/CD platform' },
        repo: { type: 'string', description: 'Repository' },
        runId: { type: 'string', description: 'Pipeline run ID' }
      },
      required: ['platform', 'repo', 'runId']
    }
  },

  // Cloud Tools
  {
    name: 'cloud_deploy',
    description: 'Deploy an application to cloud infrastructure',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        service: { type: 'string', description: 'Service type (lambda, ecs, cloudrun, appservice, etc.)' },
        config: { type: 'object', description: 'Deployment configuration' },
        region: { type: 'string', description: 'Deployment region' }
      },
      required: ['provider', 'service', 'config']
    }
  },
  {
    name: 'cloud_list_resources',
    description: 'List cloud resources',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        resourceType: { type: 'string', description: 'Resource type (ec2, s3, lambda, etc.)' },
        region: { type: 'string', description: 'Region filter' },
        filters: { type: 'object', description: 'Additional filters' }
      },
      required: ['provider', 'resourceType']
    }
  },
  {
    name: 'cloud_create_resource',
    description: 'Create a cloud resource',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        resourceType: { type: 'string', description: 'Resource type' },
        name: { type: 'string', description: 'Resource name' },
        config: { type: 'object', description: 'Resource configuration' },
        region: { type: 'string', description: 'Region' }
      },
      required: ['provider', 'resourceType', 'name', 'config']
    }
  },

  // Kubernetes Tools
  {
    name: 'k8s_get_pods',
    description: 'List Kubernetes pods',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: { type: 'string', description: 'Namespace (default: default)' },
        selector: { type: 'string', description: 'Label selector' },
        allNamespaces: { type: 'boolean', description: 'List from all namespaces' }
      }
    }
  },
  {
    name: 'k8s_apply',
    description: 'Apply a Kubernetes manifest',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: { type: 'string', description: 'YAML manifest content or file path' },
        namespace: { type: 'string', description: 'Namespace' }
      },
      required: ['manifest']
    }
  },
  {
    name: 'k8s_delete',
    description: 'Delete a Kubernetes resource',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', description: 'Resource kind (pod, deployment, service, etc.)' },
        name: { type: 'string', description: 'Resource name' },
        namespace: { type: 'string', description: 'Namespace' }
      },
      required: ['kind', 'name']
    }
  },
  {
    name: 'k8s_logs',
    description: 'Get logs from a Kubernetes pod',
    inputSchema: {
      type: 'object',
      properties: {
        pod: { type: 'string', description: 'Pod name' },
        namespace: { type: 'string', description: 'Namespace' },
        container: { type: 'string', description: 'Container name' },
        tail: { type: 'number', description: 'Number of lines' },
        follow: { type: 'boolean', description: 'Stream logs' }
      },
      required: ['pod']
    }
  },
  {
    name: 'k8s_scale',
    description: 'Scale a Kubernetes deployment',
    inputSchema: {
      type: 'object',
      properties: {
        deployment: { type: 'string', description: 'Deployment name' },
        replicas: { type: 'number', description: 'Number of replicas' },
        namespace: { type: 'string', description: 'Namespace' }
      },
      required: ['deployment', 'replicas']
    }
  },

  // Infrastructure Tools
  {
    name: 'infra_generate_dockerfile',
    description: 'Generate a Dockerfile for a project',
    inputSchema: {
      type: 'object',
      properties: {
        projectType: { type: 'string', description: 'Project type (node, python, go, java, rust, etc.)' },
        projectPath: { type: 'string', description: 'Path to analyze project structure' },
        optimize: { type: 'boolean', description: 'Apply optimization best practices' },
        multiStage: { type: 'boolean', description: 'Use multi-stage build' }
      },
      required: ['projectType']
    }
  },
  {
    name: 'infra_generate_compose',
    description: 'Generate a Docker Compose configuration',
    inputSchema: {
      type: 'object',
      properties: {
        services: { type: 'array', items: { type: 'object' }, description: 'Service definitions' },
        includeDatabase: { type: 'string', description: 'Database to include (postgres, mysql, mongodb, redis)' },
        includeCache: { type: 'boolean', description: 'Include Redis cache' },
        includeProxy: { type: 'boolean', description: 'Include nginx/traefik proxy' }
      },
      required: ['services']
    }
  },
  {
    name: 'infra_generate_terraform',
    description: 'Generate Terraform infrastructure code',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['aws', 'gcp', 'azure'], description: 'Cloud provider' },
        resources: { type: 'array', items: { type: 'object' }, description: 'Resources to create' },
        modules: { type: 'array', items: { type: 'string' }, description: 'Terraform modules to use' }
      },
      required: ['provider', 'resources']
    }
  }
];

// Initialize tool handlers
const dockerTools = new DockerTools();
const gitTools = new GitTools();
const cicdTools = new CICDTools();
const cloudTools = new CloudTools();
const kubernetesTools = new KubernetesTools();
const infrastructureTools = new InfrastructureTools();

// Create server instance
const server = new Server(
  {
    name: 'devops-omnibus-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    let result: string;

    // Route to appropriate handler
    if (name.startsWith('docker_')) {
      result = await dockerTools.execute(name, args || {});
    } else if (name.startsWith('git_')) {
      result = await gitTools.execute(name, args || {});
    } else if (name.startsWith('cicd_')) {
      result = await cicdTools.execute(name, args || {});
    } else if (name.startsWith('cloud_')) {
      result = await cloudTools.execute(name, args || {});
    } else if (name.startsWith('k8s_')) {
      result = await kubernetesTools.execute(name, args || {});
    } else if (name.startsWith('infra_')) {
      result = await infrastructureTools.execute(name, args || {});
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: result } as TextContent],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` } as TextContent],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('DevOps Omnibus MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
