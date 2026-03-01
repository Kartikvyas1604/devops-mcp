import { AwsClient } from './aws/awsClient';
import { AzureClient } from './azure/azureClient';
import { GcpClient } from './gcp/gcpClient';
import { DockerClient } from './docker/dockerClient';
import { K8sClient } from './kubernetes/k8sClient';
import { GithubClient } from './github/githubClient';
import { GitlabClient } from './gitlab/gitlabClient';
import { JenkinsClient } from './jenkins/jenkinsClient';

export const aws = new AwsClient();
export const azure = new AzureClient();
export const gcp = new GcpClient();
export const docker = new DockerClient();
export const kubernetes = new K8sClient();
export const github = new GithubClient();
export const gitlab = new GitlabClient();
export const jenkins = new JenkinsClient();