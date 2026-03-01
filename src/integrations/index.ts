/**
 * Integrations barrel export
 */

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

export { DockerIntegration } from './docker';
export type {
  ContainerInfo,
  ImageInfo,
  ContainerStats,
  RunContainerOptions,
  BuildImageOptions
} from './docker';

export { AWSIntegration } from './aws';
export type {
  AWSCredentials,
  LambdaFunction,
  S3Bucket,
  EC2Instance,
  ECSCluster,
  ECSService
} from './aws';
