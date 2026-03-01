// Re-export all provider classes
export { default as AwsClient } from './aws/awsClient';
export { AzureClient } from './azure/azureClient';
export { GCPClient } from './gcp/gcpClient';
export { DockerClient } from './docker/dockerClient';
export { K8sClient } from './kubernetes/k8sClient';
export { GitHubClient } from './github/githubClient';
export { GitLabClient } from './gitlab/gitlabClient';
export { JenkinsClient } from './jenkins/jenkinsClient';

// Type aliases for backward compatibility
export type GcpClient = import('./gcp/gcpClient').GCPClient;
export type GithubClient = import('./github/githubClient').GitHubClient;
export type GitlabClient = import('./gitlab/gitlabClient').GitLabClient;