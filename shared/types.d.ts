/**
 * OmniOps - Shared Types
 *
 * TypeScript interfaces and types shared between
 * VS Code Extension and MCP Server
 */
/**
 * AI Model Provider Types
 */
export declare enum AIModelProvider {
    CLAUDE = "claude",
    GPT4 = "gpt4",
    GEMINI = "gemini",
    GEMINI_FLASH = "gemini-flash",
    MISTRAL = "mistral",
    PERPLEXITY = "perplexity"
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
 * Service Connection Types
 */
export declare enum ServiceType {
    AWS = "aws",
    GCP = "gcp",
    AZURE = "azure",
    VERCEL = "vercel",
    RAILWAY = "railway",
    NETLIFY = "netlify",
    RENDER = "render",
    FLY_IO = "fly-io",
    DOCKER = "docker",
    KUBERNETES = "kubernetes",
    JENKINS = "jenkins",
    GITHUB = "github",
    GITLAB = "gitlab",
    BITBUCKET = "bitbucket",
    TERRAFORM = "terraform",
    PULUMI = "pulumi",
    ARGOCD = "argocd",
    FLUX = "flux",
    JIRA = "jira",
    LINEAR = "linear",
    TRELLO = "trello",
    ASANA = "asana",
    NOTION = "notion",
    SLACK = "slack",
    TEAMS = "teams",
    DISCORD = "discord",
    PAGERDUTY = "pagerduty",
    AUTH0 = "auth0",
    FIREBASE_AUTH = "firebase-auth",
    SUPABASE = "supabase",
    CLERK = "clerk",
    COGNITO = "cognito",
    NEXTAUTH = "nextauth",
    GOOGLE_OAUTH = "google-oauth",
    GITHUB_OAUTH = "github-oauth",
    FACEBOOK_OAUTH = "facebook-oauth",
    TWITTER_OAUTH = "twitter-oauth",
    APPLE_OAUTH = "apple-oauth",
    LINKEDIN_OAUTH = "linkedin-oauth",
    MICROSOFT_OAUTH = "microsoft-oauth",
    DISCORD_OAUTH = "discord-oauth",
    STRIPE = "stripe",
    PAYPAL = "paypal",
    TWILIO = "twilio",
    SENDGRID = "sendgrid",
    RESEND = "resend",
    POSTMARK = "postmark",
    POSTGRESQL = "postgresql",
    MYSQL = "mysql",
    MONGODB = "mongodb",
    REDIS = "redis",
    DYNAMODB = "dynamodb",
    FIRESTORE = "firestore"
}
export declare enum ConnectionStatus {
    CONNECTED = "connected",
    DISCONNECTED = "disconnected",
    CONNECTING = "connecting",
    ERROR = "error",
    EXPIRED = "expired"
}
export interface ServiceConnection {
    id: string;
    type: ServiceType;
    status: ConnectionStatus;
    displayName: string;
    connectedAt: Date;
    lastUsed?: Date;
    credentials?: {
        [key: string]: string;
    };
    metadata?: {
        region?: string;
        projectId?: string;
        workspace?: string;
        [key: string]: any;
    };
}
/**
 * Project Analysis Types
 */
export declare enum ProjectFramework {
    NEXT_JS = "nextjs",
    REACT = "react",
    VUE = "vue",
    ANGULAR = "angular",
    SVELTE = "svelte",
    SOLID = "solid",
    REMIX = "remix",
    ASTRO = "astro",
    NUXT = "nuxt",
    EXPRESS = "express",
    FASTIFY = "fastify",
    NEST_JS = "nestjs",
    DJANGO = "django",
    FLASK = "flask",
    FASTAPI = "fastapi",
    SPRING_BOOT = "spring-boot",
    LARAVEL = "laravel",
    RAILS = "rails",
    GO = "go",
    RUST = "rust",
    UNKNOWN = "unknown"
}
export declare enum PackageManager {
    NPM = "npm",
    YARN = "yarn",
    PNPM = "pnpm",
    BUN = "bun",
    PIP = "pip",
    POETRY = "poetry",
    CARGO = "cargo",
    GO_MOD = "go-mod",
    MAVEN = "maven",
    GRADLE = "gradle",
    BUNDLE = "bundle",
    COMPOSER = "composer",
    UNKNOWN = "unknown"
}
export declare enum RuntimeEnvironment {
    NODE = "node",
    DENO = "deno",
    BUN = "bun",
    PYTHON = "python",
    GO = "go",
    RUST = "rust",
    JAVA = "java",
    DOTNET = "dotnet",
    PHP = "php",
    RUBY = "ruby"
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
/**
 * Command & Task Types
 */
export declare enum CommandType {
    CONNECT_SERVICE = "connect-service",
    DISCONNECT_SERVICE = "disconnect-service",
    DEPLOY = "deploy",
    GENERATE = "generate",
    RUN_QUERY = "run-query",
    VIBE_CODE = "vibe-code",
    ANALYZE_PROJECT = "analyze-project",
    ROLLBACK = "rollback",
    CLONE_ENVIRONMENT = "clone-environment",
    SYNC_SECRETS = "sync-secrets",
    ESTIMATE_COST = "estimate-cost"
}
export declare enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in-progress",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export interface CommandRequest {
    id: string;
    type: CommandType;
    naturalLanguage: string;
    serviceType?: ServiceType;
    parameters?: Record<string, any>;
    context: ProjectContext;
    timestamp: Date;
}
export interface TaskStep {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    started?: Date;
    completed?: Date;
    error?: string;
    output?: string;
}
export interface Task {
    id: string;
    commandId: string;
    name: string;
    description: string;
    status: TaskStatus;
    steps: TaskStep[];
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    error?: string;
    results?: any;
    rollbackData?: any;
}
/**
 * OAuth & Authentication Types
 */
export declare enum OAuthFlowType {
    AUTHORIZATION_CODE = "authorization-code",
    AUTHORIZATION_CODE_PKCE = "pkce",
    DEVICE_CODE = "device-code",
    API_KEY = "api-key",
    TOKEN = "token"
}
export interface OAuthConfig {
    service: ServiceType;
    flowType: OAuthFlowType;
    authUrl: string;
    tokenUrl: string;
    clientId?: string;
    clientSecret?: string;
    scope: string[];
    redirectUri?: string;
    codeVerifier?: string;
    codeChallenge?: string;
}
export interface OAuthTokens {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    tokenType: string;
    scope?: string;
}
/**
 * MCP Tool Types
 */
export interface MCPToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description: string;
    required: boolean;
    default?: any;
    enum?: string[];
}
export interface MCPTool {
    name: string;
    description: string;
    serviceType: ServiceType;
    parameters: MCPToolParameter[];
    handler: (params: any, credentials: any, context: ProjectContext) => Promise<any>;
}
export interface MCPToolResult {
    success: boolean;
    data?: any;
    error?: string;
    filesCreated?: string[];
    filesModified?: string[];
    commandsRun?: string[];
    resourcesCreated?: CloudResource[];
}
/**
 * Cloud Resource Types
 */
export declare enum ResourceType {
    S3_BUCKET = "s3-bucket",
    EC2_INSTANCE = "ec2-instance",
    RDS_INSTANCE = "rds-instance",
    LAMBDA_FUNCTION = "lambda-function",
    ECS_SERVICE = "ecs-service",
    EKS_CLUSTER = "eks-cluster",
    CLOUD_RUN_SERVICE = "cloud-run-service",
    GKE_CLUSTER = "gke-cluster",
    CLOUD_SQL_INSTANCE = "cloud-sql-instance",
    GCS_BUCKET = "gcs-bucket",
    APP_SERVICE = "app-service",
    AKS_CLUSTER = "aks-cluster",
    COSMOS_DB = "cosmos-db",
    K8S_DEPLOYMENT = "k8s-deployment",
    K8S_SERVICE = "k8s-service",
    K8S_INGRESS = "k8s-ingress",
    K8S_POD = "k8s-pod",
    GITHUB_ACTION = "github-action",
    GITLAB_PIPELINE = "gitlab-pipeline",
    JENKINS_JOB = "jenkins-job",
    DOCKER_IMAGE = "docker-image",
    HELM_CHART = "helm-chart",
    TERRAFORM_STATE = "terraform-state"
}
export interface CloudResource {
    id: string;
    type: ResourceType;
    name: string;
    provider: ServiceType;
    region?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    url?: string;
    arn?: string;
    metadata?: Record<string, any>;
    monthlyCost?: number;
}
/**
 * Vibe Coding Types
 */
export interface VibeProjectSpec {
    description: string;
    type: 'saas' | 'api' | 'webapp' | 'mobile' | 'cli' | 'library';
    features: string[];
    techStack?: {
        frontend?: string;
        backend?: string;
        database?: string;
        auth?: string;
        hosting?: string;
    };
    integrations?: ServiceType[];
}
export interface VibeProjectOutput {
    projectPath: string;
    framework: ProjectFramework;
    filesCreated: string[];
    servicesConnected: ServiceType[];
    deployedUrl?: string;
    credentials: Record<string, string>;
    nextSteps: string[];
}
/**
 * Cost Estimation Types
 */
export interface CostEstimate {
    service: ServiceType;
    resourceType: ResourceType;
    estimatedMonthlyCost: number;
    breakdown: {
        [component: string]: number;
    };
    currency: string;
    confidenceLevel: 'low' | 'medium' | 'high';
    notes?: string;
}
/**
 * Notification Types
 */
export declare enum NotificationType {
    INFO = "info",
    SUCCESS = "success",
    WARNING = "warning",
    ERROR = "error",
    PROGRESS = "progress"
}
export interface Notification {
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    actions?: {
        label: string;
        command: string;
    }[];
}
/**
 * Progress Streaming Types
 */
export interface ProgressUpdate {
    taskId: string;
    step: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    message: string;
    progress: number;
    timestamp: Date;
}
/**
 * Configuration Types
 */
export interface OmniOpsConfig {
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
        slack: {
            enabled: boolean;
        };
        discord: {
            enabled: boolean;
        };
    };
}
/**
 * Error Types
 */
export declare class OmniOpsError extends Error {
    code: string;
    service?: ServiceType;
    retryable: boolean;
    details?: any;
    constructor(message: string, code: string, service?: ServiceType, retryable?: boolean, details?: any);
}
export declare enum ErrorCode {
    AUTH_FAILED = "AUTH_FAILED",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    RATE_LIMIT = "RATE_LIMIT",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
    NETWORK_ERROR = "NETWORK_ERROR",
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
}
