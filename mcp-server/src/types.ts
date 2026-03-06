/**
 * MCP Server Types
 * 
 * TypeScript interfaces and types for the MCP Server.
 * Subset of types from the main extension shared types.
 */

/**
 * AI Model Provider Types
 */
export enum AIModelProvider {
    CLAUDE = 'claude',
    GPT4 = 'gpt4',
    GEMINI = 'gemini',
    GEMINI_FLASH = 'gemini-flash',
    MISTRAL = 'mistral',
    PERPLEXITY = 'perplexity'
}

export interface AIModelConfig {
    provider: AIModelProvider;
    enabled: boolean;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AIModelResponse {
    provider: AIModelProvider;
    content: string;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    finishReason: string;
    latency: number;
}

/**
 * Project Analysis Types
 */
export enum ProjectFramework {
    NEXT_JS = 'nextjs',
    REACT = 'react',
    VUE = 'vue',
    ANGULAR = 'angular',
    SVELTE = 'svelte',
    SOLID = 'solid',
    REMIX = 'remix',
    ASTRO = 'astro',
    NUXT = 'nuxt',
    EXPRESS = 'express',
    FASTIFY = 'fastify',
    NEST_JS = 'nestjs',
    DJANGO = 'django',
    FLASK = 'flask',
    FASTAPI = 'fastapi',
    SPRING_BOOT = 'spring-boot',
    LARAVEL = 'laravel',
    RAILS = 'rails',
    GO = 'go',
    RUST = 'rust',
    UNKNOWN = 'unknown'
}

export enum PackageManager {
    NPM = 'npm',
    YARN = 'yarn',
    PNPM = 'pnpm',
    BUN = 'bun',
    PIP = 'pip',
    POETRY = 'poetry',
    CARGO = 'cargo',
    GO_MOD = 'go-mod',
    MAVEN = 'maven',
    GRADLE = 'gradle',
    BUNDLE = 'bundle',
    COMPOSER = 'composer',
    UNKNOWN = 'unknown'
}

export enum RuntimeEnvironment {
    NODE = 'node',
    DENO = 'deno',
    BUN = 'bun',
    PYTHON = 'python',
    GO = 'go',
    RUST = 'rust',
    JAVA = 'java',
    DOTNET = 'dotnet',
    PHP = 'php',
    RUBY = 'ruby'
}

export enum ServiceType {
    // Cloud Providers
    AWS = 'aws',
    GCP = 'gcp',
    AZURE = 'azure',
    VERCEL = 'vercel',
    RAILWAY = 'railway',
    NETLIFY = 'netlify',
    RENDER = 'render',
    FLY_IO = 'fly-io',

    // DevOps Tools
    DOCKER = 'docker',
    KUBERNETES = 'kubernetes',
    JENKINS = 'jenkins',
    GITHUB = 'github',
    GITLAB = 'gitlab',
    BITBUCKET = 'bitbucket',
    TERRAFORM = 'terraform',
    PULUMI = 'pulumi',
    ARGOCD = 'argocd',
    FLUX = 'flux',

    // Project Management
    JIRA = 'jira',
    LINEAR = 'linear',
    TRELLO = 'trello',
    ASANA = 'asana',
    NOTION = 'notion',

    // Communication
    SLACK = 'slack',
    TEAMS = 'teams',
    DISCORD = 'discord',
    PAGERDUTY = 'pagerduty',

    // Authentication
    AUTH0 = 'auth0',
    FIREBASE_AUTH = 'firebase-auth',
    SUPABASE = 'supabase',
    CLERK = 'clerk',
    COGNITO = 'cognito',
    NEXTAUTH = 'nextauth',

    // OAuth Providers
    GOOGLE_OAUTH = 'google-oauth',
    GITHUB_OAUTH = 'github-oauth',
    FACEBOOK_OAUTH = 'facebook-oauth',
    TWITTER_OAUTH = 'twitter-oauth',
    APPLE_OAUTH = 'apple-oauth',
    LINKEDIN_OAUTH = 'linkedin-oauth',
    MICROSOFT_OAUTH = 'microsoft-oauth',
    DISCORD_OAUTH = 'discord-oauth',

    // Payments & APIs
    STRIPE = 'stripe',
    PAYPAL = 'paypal',
    TWILIO = 'twilio',
    SENDGRID = 'sendgrid',
    RESEND = 'resend',
    POSTMARK = 'postmark',

    // Databases
    POSTGRESQL = 'postgresql',
    MYSQL = 'mysql',
    MONGODB = 'mongodb',
    REDIS = 'redis',
    DYNAMODB = 'dynamodb',
    FIRESTORE = 'firestore'
}

export interface ProjectContext {
    workspacePath: string;
    framework: ProjectFramework;
    packageManager: PackageManager;
    runtime: RuntimeEnvironment;
    language: string;
    frameworks: string[];
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    gitRemote?: string;
    gitBranch?: string;
    hasDocker: boolean;
    hasKubernetes: boolean;
    hasTerraform: boolean;
    hasCI: boolean;
    ciProvider?: string;
    existingIntegrations: ServiceType[];
    envVars: string[];
}

export interface GenieOpsConfig {
    telemetryEnabled: boolean;
    autoAnalyzeProject: boolean;
    showProgressNotifications: boolean;
    models: {
        claude: AIModelConfig;
        openai: AIModelConfig;
        gemini: AIModelConfig;
        geminiFlash: AIModelConfig;
        mistral: AIModelConfig;
        perplexity: AIModelConfig;
    };
    parallelExecution: {
        enabled: boolean;
        showComparison: boolean;
    };
    costEstimation: {
        showBeforeProvisioning: boolean;
    };
    rollback: {
        enabled: boolean;
    };
    secrets: {
        syncToVault: boolean;
        vaultProvider?: 'doppler' | 'aws-secrets-manager' | 'hashicorp-vault';
    };
    docker: {
        preferredRegistry: 'dockerhub' | 'ecr' | 'gcr' | 'ghcr';
    };
    cicd: {
        preferredProvider: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'bitbucket-pipelines';
    };
    kubernetes: {
        defaultClusterType: 'eks' | 'gke' | 'aks' | 'minikube' | 'k3s' | 'kind';
    };
    packageManager: {
        autoDetect: boolean;
    };
    env: {
        autoUpdate: boolean;
        addToGitignore: boolean;
    };
    notifications: {
        slack: { enabled: boolean };
        discord: { enabled: boolean };
    };
}
