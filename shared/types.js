"use strict";
/**
 * GenieOps - Shared Types
 *
 * TypeScript interfaces and types shared between
 * VS Code Extension and MCP Server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCode = exports.GenieOpsError = exports.NotificationType = exports.ResourceType = exports.OAuthFlowType = exports.TaskStatus = exports.CommandType = exports.RuntimeEnvironment = exports.PackageManager = exports.ProjectFramework = exports.ConnectionStatus = exports.ServiceType = exports.AIModelProvider = void 0;
/**
 * AI Model Provider Types
 */
var AIModelProvider;
(function (AIModelProvider) {
    AIModelProvider["CLAUDE"] = "claude";
    AIModelProvider["GPT4"] = "gpt4";
    AIModelProvider["GEMINI"] = "gemini";
    AIModelProvider["GEMINI_FLASH"] = "gemini-flash";
    AIModelProvider["MISTRAL"] = "mistral";
    AIModelProvider["PERPLEXITY"] = "perplexity";
})(AIModelProvider || (exports.AIModelProvider = AIModelProvider = {}));
/**
 * Service Connection Types
 */
var ServiceType;
(function (ServiceType) {
    // Cloud Providers
    ServiceType["AWS"] = "aws";
    ServiceType["GCP"] = "gcp";
    ServiceType["AZURE"] = "azure";
    ServiceType["VERCEL"] = "vercel";
    ServiceType["RAILWAY"] = "railway";
    ServiceType["NETLIFY"] = "netlify";
    ServiceType["RENDER"] = "render";
    ServiceType["FLY_IO"] = "fly-io";
    // DevOps Tools
    ServiceType["DOCKER"] = "docker";
    ServiceType["KUBERNETES"] = "kubernetes";
    ServiceType["JENKINS"] = "jenkins";
    ServiceType["GITHUB"] = "github";
    ServiceType["GITLAB"] = "gitlab";
    ServiceType["BITBUCKET"] = "bitbucket";
    ServiceType["TERRAFORM"] = "terraform";
    ServiceType["PULUMI"] = "pulumi";
    ServiceType["ARGOCD"] = "argocd";
    ServiceType["FLUX"] = "flux";
    // Project Management
    ServiceType["JIRA"] = "jira";
    ServiceType["LINEAR"] = "linear";
    ServiceType["TRELLO"] = "trello";
    ServiceType["ASANA"] = "asana";
    ServiceType["NOTION"] = "notion";
    // Communication
    ServiceType["SLACK"] = "slack";
    ServiceType["TEAMS"] = "teams";
    ServiceType["DISCORD"] = "discord";
    ServiceType["PAGERDUTY"] = "pagerduty";
    // Authentication
    ServiceType["AUTH0"] = "auth0";
    ServiceType["FIREBASE_AUTH"] = "firebase-auth";
    ServiceType["SUPABASE"] = "supabase";
    ServiceType["CLERK"] = "clerk";
    ServiceType["COGNITO"] = "cognito";
    ServiceType["NEXTAUTH"] = "nextauth";
    // OAuth Providers
    ServiceType["GOOGLE_OAUTH"] = "google-oauth";
    ServiceType["GITHUB_OAUTH"] = "github-oauth";
    ServiceType["FACEBOOK_OAUTH"] = "facebook-oauth";
    ServiceType["TWITTER_OAUTH"] = "twitter-oauth";
    ServiceType["APPLE_OAUTH"] = "apple-oauth";
    ServiceType["LINKEDIN_OAUTH"] = "linkedin-oauth";
    ServiceType["MICROSOFT_OAUTH"] = "microsoft-oauth";
    ServiceType["DISCORD_OAUTH"] = "discord-oauth";
    // Payments & APIs
    ServiceType["STRIPE"] = "stripe";
    ServiceType["PAYPAL"] = "paypal";
    ServiceType["TWILIO"] = "twilio";
    ServiceType["SENDGRID"] = "sendgrid";
    ServiceType["RESEND"] = "resend";
    ServiceType["POSTMARK"] = "postmark";
    // Databases
    ServiceType["POSTGRESQL"] = "postgresql";
    ServiceType["MYSQL"] = "mysql";
    ServiceType["MONGODB"] = "mongodb";
    ServiceType["REDIS"] = "redis";
    ServiceType["DYNAMODB"] = "dynamodb";
    ServiceType["FIRESTORE"] = "firestore";
})(ServiceType || (exports.ServiceType = ServiceType = {}));
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "connected";
    ConnectionStatus["DISCONNECTED"] = "disconnected";
    ConnectionStatus["CONNECTING"] = "connecting";
    ConnectionStatus["ERROR"] = "error";
    ConnectionStatus["EXPIRED"] = "expired";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
/**
 * Project Analysis Types
 */
var ProjectFramework;
(function (ProjectFramework) {
    ProjectFramework["NEXT_JS"] = "nextjs";
    ProjectFramework["REACT"] = "react";
    ProjectFramework["VUE"] = "vue";
    ProjectFramework["ANGULAR"] = "angular";
    ProjectFramework["SVELTE"] = "svelte";
    ProjectFramework["SOLID"] = "solid";
    ProjectFramework["REMIX"] = "remix";
    ProjectFramework["ASTRO"] = "astro";
    ProjectFramework["NUXT"] = "nuxt";
    ProjectFramework["EXPRESS"] = "express";
    ProjectFramework["FASTIFY"] = "fastify";
    ProjectFramework["NEST_JS"] = "nestjs";
    ProjectFramework["DJANGO"] = "django";
    ProjectFramework["FLASK"] = "flask";
    ProjectFramework["FASTAPI"] = "fastapi";
    ProjectFramework["SPRING_BOOT"] = "spring-boot";
    ProjectFramework["LARAVEL"] = "laravel";
    ProjectFramework["RAILS"] = "rails";
    ProjectFramework["GO"] = "go";
    ProjectFramework["RUST"] = "rust";
    ProjectFramework["UNKNOWN"] = "unknown";
})(ProjectFramework || (exports.ProjectFramework = ProjectFramework = {}));
var PackageManager;
(function (PackageManager) {
    PackageManager["NPM"] = "npm";
    PackageManager["YARN"] = "yarn";
    PackageManager["PNPM"] = "pnpm";
    PackageManager["BUN"] = "bun";
    PackageManager["PIP"] = "pip";
    PackageManager["POETRY"] = "poetry";
    PackageManager["CARGO"] = "cargo";
    PackageManager["GO_MOD"] = "go-mod";
    PackageManager["MAVEN"] = "maven";
    PackageManager["GRADLE"] = "gradle";
    PackageManager["BUNDLE"] = "bundle";
    PackageManager["COMPOSER"] = "composer";
    PackageManager["UNKNOWN"] = "unknown";
})(PackageManager || (exports.PackageManager = PackageManager = {}));
var RuntimeEnvironment;
(function (RuntimeEnvironment) {
    RuntimeEnvironment["NODE"] = "node";
    RuntimeEnvironment["DENO"] = "deno";
    RuntimeEnvironment["BUN"] = "bun";
    RuntimeEnvironment["PYTHON"] = "python";
    RuntimeEnvironment["GO"] = "go";
    RuntimeEnvironment["RUST"] = "rust";
    RuntimeEnvironment["JAVA"] = "java";
    RuntimeEnvironment["DOTNET"] = "dotnet";
    RuntimeEnvironment["PHP"] = "php";
    RuntimeEnvironment["RUBY"] = "ruby";
})(RuntimeEnvironment || (exports.RuntimeEnvironment = RuntimeEnvironment = {}));
/**
 * Command & Task Types
 */
var CommandType;
(function (CommandType) {
    CommandType["CONNECT_SERVICE"] = "connect-service";
    CommandType["DISCONNECT_SERVICE"] = "disconnect-service";
    CommandType["DEPLOY"] = "deploy";
    CommandType["GENERATE"] = "generate";
    CommandType["RUN_QUERY"] = "run-query";
    CommandType["VIBE_CODE"] = "vibe-code";
    CommandType["ANALYZE_PROJECT"] = "analyze-project";
    CommandType["ROLLBACK"] = "rollback";
    CommandType["CLONE_ENVIRONMENT"] = "clone-environment";
    CommandType["SYNC_SECRETS"] = "sync-secrets";
    CommandType["ESTIMATE_COST"] = "estimate-cost";
})(CommandType || (exports.CommandType = CommandType = {}));
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in-progress";
    TaskStatus["SUCCESS"] = "success";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
/**
 * OAuth & Authentication Types
 */
var OAuthFlowType;
(function (OAuthFlowType) {
    OAuthFlowType["AUTHORIZATION_CODE"] = "authorization-code";
    OAuthFlowType["AUTHORIZATION_CODE_PKCE"] = "pkce";
    OAuthFlowType["DEVICE_CODE"] = "device-code";
    OAuthFlowType["API_KEY"] = "api-key";
    OAuthFlowType["TOKEN"] = "token";
})(OAuthFlowType || (exports.OAuthFlowType = OAuthFlowType = {}));
/**
 * Cloud Resource Types
 */
var ResourceType;
(function (ResourceType) {
    // AWS
    ResourceType["S3_BUCKET"] = "s3-bucket";
    ResourceType["EC2_INSTANCE"] = "ec2-instance";
    ResourceType["RDS_INSTANCE"] = "rds-instance";
    ResourceType["LAMBDA_FUNCTION"] = "lambda-function";
    ResourceType["ECS_SERVICE"] = "ecs-service";
    ResourceType["EKS_CLUSTER"] = "eks-cluster";
    // GCP
    ResourceType["CLOUD_RUN_SERVICE"] = "cloud-run-service";
    ResourceType["GKE_CLUSTER"] = "gke-cluster";
    ResourceType["CLOUD_SQL_INSTANCE"] = "cloud-sql-instance";
    ResourceType["GCS_BUCKET"] = "gcs-bucket";
    // Azure
    ResourceType["APP_SERVICE"] = "app-service";
    ResourceType["AKS_CLUSTER"] = "aks-cluster";
    ResourceType["COSMOS_DB"] = "cosmos-db";
    // Kubernetes
    ResourceType["K8S_DEPLOYMENT"] = "k8s-deployment";
    ResourceType["K8S_SERVICE"] = "k8s-service";
    ResourceType["K8S_INGRESS"] = "k8s-ingress";
    ResourceType["K8S_POD"] = "k8s-pod";
    // CI/CD
    ResourceType["GITHUB_ACTION"] = "github-action";
    ResourceType["GITLAB_PIPELINE"] = "gitlab-pipeline";
    ResourceType["JENKINS_JOB"] = "jenkins-job";
    // Other
    ResourceType["DOCKER_IMAGE"] = "docker-image";
    ResourceType["HELM_CHART"] = "helm-chart";
    ResourceType["TERRAFORM_STATE"] = "terraform-state";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
/**
 * Notification Types
 */
var NotificationType;
(function (NotificationType) {
    NotificationType["INFO"] = "info";
    NotificationType["SUCCESS"] = "success";
    NotificationType["WARNING"] = "warning";
    NotificationType["ERROR"] = "error";
    NotificationType["PROGRESS"] = "progress";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
/**
 * Error Types
 */
class GenieOpsError extends Error {
    constructor(message, code, service, retryable = false, details) {
        super(message);
        this.code = code;
        this.service = service;
        this.retryable = retryable;
        this.details = details;
        this.name = 'GenieOpsError';
    }
}
exports.GenieOpsError = GenieOpsError;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_FAILED"] = "AUTH_FAILED";
    ErrorCode["SERVICE_UNAVAILABLE"] = "SERVICE_UNAVAILABLE";
    ErrorCode["RATE_LIMIT"] = "RATE_LIMIT";
    ErrorCode["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    ErrorCode["RESOURCE_NOT_FOUND"] = "RESOURCE_NOT_FOUND";
    ErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    ErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
//# sourceMappingURL=types.js.map