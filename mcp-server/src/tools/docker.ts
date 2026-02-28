/**
 * Docker Integration Tool
 * 
 * Provides Docker operations:
 * - Generate Dockerfile from project
 * - Build and push images
 * - Docker Compose generation
 * - Container management
 */

import Docker from 'dockerode';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';

export class DockerTool {
  private docker: Docker;
  private secretManager: SecretManager;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
    this.docker = new Docker();
  }

  getTools(): Tool[] {
    return [
      {
        name: 'docker_generate_dockerfile',
        description: 'Generate a Dockerfile based on project type',
        inputSchema: {
          type: 'object',
          properties: {
            framework: { type: 'string', description: 'Framework (nodejs, python, java, go, etc.)' },
            addons: { type: 'array', items: { type: 'string' }, description: 'Additional tools to include' },
          },
          required: ['framework'],
        },
      },
      {
        name: 'docker_generate_compose',
        description: 'Generate docker-compose.yml for multi-service app',
        inputSchema: {
          type: 'object',
          properties: {
            services: {
              type: 'array',
              items: { type: 'string' },
              description: 'Services to include (app, postgres, redis, nginx, etc.)',
            },
          },
          required: ['services'],
        },
      },
      {
        name: 'docker_build_image',
        description: 'Build a Docker image',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Build context path' },
            tag: { type: 'string', description: 'Image tag' },
          },
          required: ['path', 'tag'],
        },
      },
      {
        name: 'docker_list_containers',
        description: 'List running Docker containers',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'Show all containers (not just running)', default: false },
          },
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'docker_generate_dockerfile':
        return this.generateDockerfile(args);
      case 'docker_generate_compose':
        return this.generateCompose(args);
      case 'docker_build_image':
        return this.buildImage(args);
      case 'docker_list_containers':
        return this.listContainers(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async generateDockerfile(args: any): Promise<any> {
    const templates: Record<string, string> = {
      nodejs: `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]`,

      python: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "app.py"]`,

      go: `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o main .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]`,

      java: `FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY . .
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]`,
    };

    const dockerfile = templates[args.framework] || templates.nodejs;

    return {
      success: true,
      dockerfile,
      message: `Dockerfile generated for ${args.framework}`,
      nextSteps: [
        'Save as Dockerfile in project root',
        'Run: docker build -t myapp .',
        'Run: docker run -p 3000:3000 myapp',
      ],
    };
  }

  private async generateCompose(args: any): Promise<any> {
    const services = args.services || ['app'];
    const serviceConfigs: Record<string, string> = {
      app: `  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production`,
      
      postgres: `  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=changeme
      - POSTGRES_DB=mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data`,
      
      redis: `  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"`,
      
      nginx: `  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro`,
    };

    const selectedServices = services
      .filter((s: string) => serviceConfigs[s])
      .map((s: string) => serviceConfigs[s])
      .join('\n\n');

    const compose = `version: '3.8'

services:
${selectedServices}

volumes:
  postgres_data:
`;

    return {
      success: true,
      compose,
      message: `docker-compose.yml generated with ${services.length} services`,
      nextSteps: [
        'Save as docker-compose.yml',
        'Run: docker-compose up -d',
      ],
    };
  }

  private async buildImage(args: any): Promise<any> {
    const stream = await this.docker.buildImage(
      {
        context: args.path,
        src: ['Dockerfile'],
      },
      { t: args.tag }
    );

    return new Promise((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            success: true,
            message: `Image built successfully: ${args.tag}`,
            tag: args.tag,
          });
        }
      });
    });
  }

  private async listContainers(args: any): Promise<any> {
    const containers = await this.docker.listContainers({ all: args.all || false });

    return {
      success: true,
      count: containers.length,
      containers: containers.map(c => ({
        id: c.Id.substring(0, 12),
        name: c.Names[0],
        image: c.Image,
        status: c.Status,
        ports: c.Ports.map(p => p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : p.PrivatePort),
      })),
    };
  }
}
