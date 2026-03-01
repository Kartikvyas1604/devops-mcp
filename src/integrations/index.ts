/**
 * Integrations barrel export
 * Comprehensive DevOps service integrations
 */

// GitHub Integration
export { GitHubClient } from './github';
export type {
  GitHubUser,
  GitHubRepo,
  GitHubIssue,
  GitHubPullRequest,
  GitHubWorkflowRun,
  GitHubRelease,
  CreateIssueOptions,
  CreatePROptions,
  CreateReleaseOptions
} from './github';

// Docker Integration
export { DockerIntegration } from './docker';
export type {
  ContainerInfo,
  ImageInfo,
  ContainerStats,
  RunContainerOptions,
  BuildImageOptions
} from './docker';

// AWS Integration
export { AWSIntegration } from './aws';
export type {
  AWSCredentials,
  LambdaFunction,
  S3Bucket,
  EC2Instance,
  ECSCluster,
  ECSService
} from './aws';

// GCP Integration
export { GCPIntegration } from './gcp';
export type {
  GCPCredentials,
  CloudFunction,
  CloudRunService,
  GCEInstance,
  GCSBucket,
  GKECluster,
  PubSubTopic,
  PubSubSubscription
} from './gcp';

// Azure Integration
export { AzureIntegration } from './azure';
export type {
  AzureCredentials,
  AzureFunction,
  WebApp,
  AppServicePlan,
  AKSCluster,
  StorageAccount,
  ContainerRegistry,
  VirtualMachine,
  ResourceGroup
} from './azure';

// Kubernetes Integration
export { KubernetesIntegration } from './kubernetes';
export type {
  KubernetesContext,
  KubernetesNamespace,
  KubernetesPod,
  KubernetesDeployment,
  KubernetesService,
  KubernetesConfigMap,
  KubernetesSecret,
  KubernetesIngress,
  KubernetesNode,
  KubernetesEvent,
  HelmRelease
} from './kubernetes';

// Slack Integration
export { SlackIntegration, BlockKitBuilder } from './slack';
export type {
  SlackChannel,
  SlackUser,
  SlackMessage,
  SlackAttachment,
  SlackBlock,
  SlackMessageOptions
} from './slack';

// Jira Integration
export { JiraIntegration, JQLBuilder } from './jira';
export type {
  JiraProject,
  JiraIssue,
  JiraComment,
  JiraTransition,
  JiraSprint,
  JiraBoard,
  JiraVersion,
  JiraWorklog,
  CreateIssueInput,
  UpdateIssueInput
} from './jira';
