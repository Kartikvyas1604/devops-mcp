/**
 * Infrastructure tool implementations for MCP server
 * Generates Dockerfiles, Docker Compose, and Terraform configs
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ServiceDefinition {
  name: string;
  image?: string;
  build?: string;
  ports?: string[];
  environment?: Record<string, string>;
  volumes?: string[];
  depends_on?: string[];
}

interface TerraformResource {
  type: string;
  name: string;
  config: Record<string, unknown>;
}

export class InfrastructureTools {
  async execute(tool: string, args: Record<string, unknown>): Promise<string> {
    switch (tool) {
      case 'infra_generate_dockerfile':
        return this.generateDockerfile(args);
      case 'infra_generate_compose':
        return this.generateCompose(args);
      case 'infra_generate_terraform':
        return this.generateTerraform(args);
      default:
        throw new Error(`Unknown Infrastructure tool: ${tool}`);
    }
  }

  private async generateDockerfile(args: Record<string, unknown>): Promise<string> {
    const projectType = args.projectType as string;
    const projectPath = args.projectPath as string | undefined;
    const optimize = args.optimize as boolean ?? true;
    const multiStage = args.multiStage as boolean ?? true;

    if (!projectType) {
      throw new Error('projectType is required');
    }

    // Analyze project if path provided
    let packageInfo: Record<string, unknown> | undefined;
    if (projectPath) {
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        packageInfo = JSON.parse(content);
      } catch {
        // Not a Node.js project or no package.json
      }
    }

    const dockerfile = this.createDockerfile(projectType, multiStage, optimize, packageInfo);

    return JSON.stringify({
      projectType,
      multiStage,
      optimized: optimize,
      dockerfile
    }, null, 2);
  }

  private createDockerfile(projectType: string, multiStage: boolean, optimize: boolean, packageInfo?: Record<string, unknown>): string {
    switch (projectType.toLowerCase()) {
      case 'node':
      case 'nodejs':
      case 'javascript':
      case 'typescript':
        return this.createNodeDockerfile(multiStage, optimize, packageInfo);
      case 'python':
        return this.createPythonDockerfile(multiStage, optimize);
      case 'go':
      case 'golang':
        return this.createGoDockerfile(multiStage, optimize);
      case 'java':
      case 'maven':
        return this.createJavaDockerfile(multiStage, optimize);
      case 'rust':
        return this.createRustDockerfile(multiStage, optimize);
      case 'dotnet':
      case 'csharp':
        return this.createDotNetDockerfile(multiStage, optimize);
      default:
        return this.createGenericDockerfile(projectType);
    }
  }

  private createNodeDockerfile(multiStage: boolean, optimize: boolean, packageInfo?: Record<string, unknown>): string {
    const nodeVersion = '20-alpine';
    const hasTypescript = packageInfo?.dependencies?.['typescript'] || packageInfo?.devDependencies?.['typescript'];
    
    if (multiStage && hasTypescript) {
      return `# Build stage
FROM node:${nodeVersion} AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci${optimize ? ' --only=production=false' : ''}

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:${nodeVersion} AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
`;
    }

    return `FROM node:${nodeVersion}

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci${optimize ? ' && npm cache clean --force' : ''}

# Copy source code
COPY . .

${optimize ? `# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nodejs -u 1001

USER nodejs

` : ''}EXPOSE 3000

CMD ["npm", "start"]
`;
  }

  private createPythonDockerfile(multiStage: boolean, optimize: boolean): string {
    const pythonVersion = '3.11-slim';

    if (multiStage) {
      return `# Build stage
FROM python:${pythonVersion} AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:${pythonVersion}

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application
COPY . .

${optimize ? `# Create non-root user
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

` : ''}EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;
    }

    return `FROM python:${pythonVersion}

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

${optimize ? `# Create non-root user
RUN useradd -m -r appuser && chown -R appuser:appuser /app
USER appuser

` : ''}EXPOSE 8000

CMD ["python", "main.py"]
`;
  }

  private createGoDockerfile(multiStage: boolean, optimize: boolean): string {
    if (multiStage) {
      return `# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install ca-certificates for HTTPS
RUN apk add --no-cache ca-certificates git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/main .

# Production stage
FROM scratch

WORKDIR /app

# Copy ca-certificates
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy binary
COPY --from=builder /app/main .

EXPOSE 8080

ENTRYPOINT ["/app/main"]
`;
    }

    return `FROM golang:1.21-alpine

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main .

EXPOSE 8080

CMD ["./main"]
`;
  }

  private createJavaDockerfile(multiStage: boolean, optimize: boolean): string {
    if (multiStage) {
      return `# Build stage
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build
COPY src ./src
RUN mvn package -DskipTests -B

# Production stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy JAR file
COPY --from=builder /app/target/*.jar app.jar

${optimize ? `# Create non-root user
RUN addgroup -g 1001 -S javauser && \\
    adduser -S javauser -u 1001

USER javauser

` : ''}EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
`;
    }

    return `FROM maven:3.9-eclipse-temurin-21

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn package -DskipTests

EXPOSE 8080

CMD ["java", "-jar", "target/*.jar"]
`;
  }

  private createRustDockerfile(multiStage: boolean, optimize: boolean): string {
    if (multiStage) {
      return `# Build stage
FROM rust:1.74-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache musl-dev

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy source for caching dependencies
RUN mkdir src && \\
    echo "fn main() {}" > src/main.rs && \\
    cargo build --release && \\
    rm -rf src

# Copy actual source
COPY src ./src

# Build release binary
RUN touch src/main.rs && \\
    cargo build --release

# Production stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Copy binary
COPY --from=builder /app/target/release/app .

${optimize ? `# Create non-root user
RUN addgroup -g 1001 -S rustuser && \\
    adduser -S rustuser -u 1001

USER rustuser

` : ''}EXPOSE 8080

CMD ["./app"]
`;
    }

    return `FROM rust:1.74

WORKDIR /app

COPY . .

RUN cargo build --release

EXPOSE 8080

CMD ["./target/release/app"]
`;
  }

  private createDotNetDockerfile(multiStage: boolean, optimize: boolean): string {
    if (multiStage) {
      return `# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder

WORKDIR /app

# Copy csproj and restore
COPY *.csproj ./
RUN dotnet restore

# Copy source and publish
COPY . .
RUN dotnet publish -c Release -o out

# Production stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine

WORKDIR /app

COPY --from=builder /app/out .

${optimize ? `# Create non-root user
RUN addgroup -g 1001 -S dotnetuser && \\
    adduser -S dotnetuser -u 1001

USER dotnetuser

` : ''}EXPOSE 8080

ENTRYPOINT ["dotnet", "App.dll"]
`;
    }

    return `FROM mcr.microsoft.com/dotnet/sdk:8.0

WORKDIR /app

COPY . .

RUN dotnet publish -c Release -o out

EXPOSE 8080

CMD ["dotnet", "out/App.dll"]
`;
  }

  private createGenericDockerfile(projectType: string): string {
    return `# Generic Dockerfile for ${projectType}
FROM ubuntu:22.04

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy application
COPY . .

EXPOSE 8080

CMD ["./start.sh"]
`;
  }

  private async generateCompose(args: Record<string, unknown>): Promise<string> {
    const services = args.services as ServiceDefinition[];
    const includeDatabase = args.includeDatabase as string | undefined;
    const includeCache = args.includeCache as boolean ?? false;
    const includeProxy = args.includeProxy as boolean ?? false;

    if (!services || services.length === 0) {
      throw new Error('At least one service definition is required');
    }

    const compose: Record<string, unknown> = {
      version: '3.8',
      services: {},
      networks: {
        app: {
          driver: 'bridge'
        }
      },
      volumes: {}
    };

    const composedServices = compose.services as Record<string, unknown>;
    const volumes = compose.volumes as Record<string, unknown>;

    // Add user-defined services
    for (const service of services) {
      composedServices[service.name] = {
        image: service.image,
        build: service.build,
        ports: service.ports,
        environment: service.environment,
        volumes: service.volumes,
        depends_on: service.depends_on,
        networks: ['app'],
        restart: 'unless-stopped'
      };

      // Clean up undefined values
      Object.keys(composedServices[service.name] as Record<string, unknown>).forEach(key => {
        if ((composedServices[service.name] as Record<string, unknown>)[key] === undefined) {
          delete (composedServices[service.name] as Record<string, unknown>)[key];
        }
      });
    }

    // Add database if requested
    if (includeDatabase) {
      switch (includeDatabase.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          composedServices['postgres'] = {
            image: 'postgres:16-alpine',
            environment: {
              POSTGRES_USER: '${POSTGRES_USER:-app}',
              POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-password}',
              POSTGRES_DB: '${POSTGRES_DB:-app}'
            },
            volumes: ['postgres_data:/var/lib/postgresql/data'],
            networks: ['app'],
            restart: 'unless-stopped',
            healthcheck: {
              test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-app}'],
              interval: '10s',
              timeout: '5s',
              retries: 5
            }
          };
          volumes['postgres_data'] = {};
          break;

        case 'mysql':
          composedServices['mysql'] = {
            image: 'mysql:8.0',
            environment: {
              MYSQL_ROOT_PASSWORD: '${MYSQL_ROOT_PASSWORD:-rootpassword}',
              MYSQL_DATABASE: '${MYSQL_DATABASE:-app}',
              MYSQL_USER: '${MYSQL_USER:-app}',
              MYSQL_PASSWORD: '${MYSQL_PASSWORD:-password}'
            },
            volumes: ['mysql_data:/var/lib/mysql'],
            networks: ['app'],
            restart: 'unless-stopped'
          };
          volumes['mysql_data'] = {};
          break;

        case 'mongodb':
        case 'mongo':
          composedServices['mongodb'] = {
            image: 'mongo:7',
            environment: {
              MONGO_INITDB_ROOT_USERNAME: '${MONGO_USER:-admin}',
              MONGO_INITDB_ROOT_PASSWORD: '${MONGO_PASSWORD:-password}'
            },
            volumes: ['mongo_data:/data/db'],
            networks: ['app'],
            restart: 'unless-stopped'
          };
          volumes['mongo_data'] = {};
          break;
      }
    }

    // Add Redis cache if requested
    if (includeCache) {
      composedServices['redis'] = {
        image: 'redis:7-alpine',
        command: 'redis-server --appendonly yes',
        volumes: ['redis_data:/data'],
        networks: ['app'],
        restart: 'unless-stopped',
        healthcheck: {
          test: ['CMD', 'redis-cli', 'ping'],
          interval: '10s',
          timeout: '5s',
          retries: 5
        }
      };
      volumes['redis_data'] = {};
    }

    // Add reverse proxy if requested
    if (includeProxy) {
      composedServices['nginx'] = {
        image: 'nginx:alpine',
        ports: ['80:80', '443:443'],
        volumes: [
          './nginx.conf:/etc/nginx/nginx.conf:ro',
          './certs:/etc/nginx/certs:ro'
        ],
        networks: ['app'],
        restart: 'unless-stopped',
        depends_on: Object.keys(composedServices).filter(s => s !== 'nginx')
      };
    }

    const yaml = this.toYaml(compose);

    return JSON.stringify({
      services: Object.keys(composedServices),
      includeDatabase,
      includeCache,
      includeProxy,
      compose: yaml
    }, null, 2);
  }

  private async generateTerraform(args: Record<string, unknown>): Promise<string> {
    const provider = args.provider as 'aws' | 'gcp' | 'azure';
    const resources = args.resources as TerraformResource[];
    const modules = args.modules as string[] | undefined;

    if (!provider || !resources || resources.length === 0) {
      throw new Error('Provider and at least one resource are required');
    }

    let terraform = this.generateTerraformProvider(provider);
    terraform += '\n';

    // Add modules if specified
    if (modules && modules.length > 0) {
      for (const module of modules) {
        terraform += this.generateTerraformModule(provider, module);
        terraform += '\n';
      }
    }

    // Add resources
    for (const resource of resources) {
      terraform += this.generateTerraformResource(provider, resource);
      terraform += '\n';
    }

    return JSON.stringify({
      provider,
      resourceCount: resources.length,
      modules: modules || [],
      terraform
    }, null, 2);
  }

  private generateTerraformProvider(provider: string): string {
    switch (provider) {
      case 'aws':
        return `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
`;

      case 'gcp':
        return `terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

variable "gcp_project" {
  description = "GCP project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}
`;

      case 'azure':
        return `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "azure_location" {
  description = "Azure location"
  type        = string
  default     = "eastus"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "my-resource-group"
}
`;

      default:
        return '';
    }
  }

  private generateTerraformModule(provider: string, module: string): string {
    switch (`${provider}:${module}`.toLowerCase()) {
      case 'aws:vpc':
        return `module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["\${var.aws_region}a", "\${var.aws_region}b", "\${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = "production"
  }
}
`;

      case 'aws:eks':
        return `module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.28"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    default = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
    }
  }

  tags = {
    Environment = "production"
  }
}
`;

      case 'gcp:gke':
        return `module "gke" {
  source  = "terraform-google-modules/kubernetes-engine/google"
  version = "~> 29.0"

  project_id        = var.gcp_project
  name              = "my-cluster"
  region            = var.gcp_region
  network           = "default"
  subnetwork        = "default"
  ip_range_pods     = ""
  ip_range_services = ""

  node_pools = [
    {
      name         = "default-pool"
      machine_type = "e2-medium"
      min_count    = 1
      max_count    = 3
      disk_size_gb = 50
    }
  ]
}
`;

      default:
        return `# Module: ${module} for ${provider}\n# Add custom configuration\n`;
    }
  }

  private generateTerraformResource(provider: string, resource: TerraformResource): string {
    const { type, name, config } = resource;

    switch (`${provider}:${type}`.toLowerCase()) {
      case 'aws:s3':
        return `resource "aws_s3_bucket" "${name}" {
  bucket = "${config.bucket || name}"

  tags = {
    Name        = "${name}"
    Environment = "${config.environment || 'production'}"
  }
}

resource "aws_s3_bucket_versioning" "${name}_versioning" {
  bucket = aws_s3_bucket.${name}.id
  versioning_configuration {
    status = "Enabled"
  }
}
`;

      case 'aws:lambda':
        return `resource "aws_lambda_function" "${name}" {
  function_name = "${config.functionName || name}"
  role          = aws_iam_role.${name}_role.arn
  handler       = "${config.handler || 'index.handler'}"
  runtime       = "${config.runtime || 'nodejs20.x'}"
  memory_size   = ${config.memory || 128}
  timeout       = ${config.timeout || 30}

  filename         = "${config.filename || 'lambda.zip'}"
  source_code_hash = filebase64sha256("${config.filename || 'lambda.zip'}")

  tags = {
    Name = "${name}"
  }
}

resource "aws_iam_role" "${name}_role" {
  name = "${name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}
`;

      case 'aws:ec2':
        return `resource "aws_instance" "${name}" {
  ami           = "${config.ami || 'ami-0c55b159cbfafe1f0'}"
  instance_type = "${config.instanceType || 't3.micro'}"

  tags = {
    Name = "${name}"
  }
}
`;

      case 'gcp:clourun':
      case 'gcp:cloudrun':
        return `resource "google_cloud_run_service" "${name}" {
  name     = "${name}"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "${config.image || 'gcr.io/project/image'}"
        
        resources {
          limits = {
            cpu    = "${config.cpu || '1000m'}"
            memory = "${config.memory || '256Mi'}"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service_iam_member" "${name}_public" {
  service  = google_cloud_run_service.${name}.name
  location = google_cloud_run_service.${name}.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
`;

      case 'azure:appservice':
        return `resource "azurerm_service_plan" "${name}_plan" {
  name                = "${name}-plan"
  resource_group_name = var.resource_group_name
  location            = var.azure_location
  os_type             = "Linux"
  sku_name            = "${config.sku || 'B1'}"
}

resource "azurerm_linux_web_app" "${name}" {
  name                = "${name}"
  resource_group_name = var.resource_group_name
  location            = var.azure_location
  service_plan_id     = azurerm_service_plan.${name}_plan.id

  site_config {
    application_stack {
      node_version = "${config.nodeVersion || '20-lts'}"
    }
  }
}
`;

      default:
        return `# Resource: ${type} - ${name}\n# Add custom configuration\n${JSON.stringify(config, null, 2)}\n`;
    }
  }

  private toYaml(obj: unknown, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    if (typeof obj === 'string') {
      if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.startsWith('$')) {
        return `'${obj.replace(/'/g, "''")}'`;
      }
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        if (typeof item === 'object' && item !== null) {
          const itemYaml = this.toYaml(item, indent + 1);
          const lines = itemYaml.split('\n');
          lines[0] = `- ${lines[0].trim()}`;
          return spaces + lines.join('\n' + spaces + '  ');
        }
        return `${spaces}- ${this.toYaml(item, 0)}`;
      }).join('\n');
    }
    
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      
      return entries.map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nestedYaml = this.toYaml(value, indent + 1);
          if (Object.keys(value).length === 0) {
            return `${spaces}${key}: {}`;
          }
          return `${spaces}${key}:\n${nestedYaml}`;
        }
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return `${spaces}${key}: []`;
          }
          return `${spaces}${key}:\n${this.toYaml(value, indent + 1)}`;
        }
        return `${spaces}${key}: ${this.toYaml(value, 0)}`;
      }).join('\n');
    }
    
    return String(obj);
  }
}
