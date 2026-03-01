import { expect } from 'chai';
import { AWSClient } from '../../src/providers/aws/awsClient';
import { AzureClient } from '../../src/providers/azure/azureClient';
import { GCPClient } from '../../src/providers/gcp/gcpClient';
import { DockerClient } from '../../src/providers/docker/dockerClient';
import { K8SClient } from '../../src/providers/kubernetes/k8sClient';
import { GitHubClient } from '../../src/providers/github/githubClient';
import { GitLabClient } from '../../src/providers/gitlab/gitlabClient';
import { JenkinsClient } from '../../src/providers/jenkins/jenkinsClient';

describe('Provider Integrations', () => {
    let awsClient: AWSClient;
    let azureClient: AzureClient;
    let gcpClient: GCPClient;
    let dockerClient: DockerClient;
    let k8sClient: K8SClient;
    let githubClient: GitHubClient;
    let gitlabClient: GitLabClient;
    let jenkinsClient: JenkinsClient;

    beforeEach(() => {
        awsClient = new AWSClient();
        azureClient = new AzureClient();
        gcpClient = new GCPClient();
        dockerClient = new DockerClient();
        k8sClient = new K8SClient();
        githubClient = new GitHubClient();
        gitlabClient = new GitLabClient();
        jenkinsClient = new JenkinsClient();
    });

    it('should initialize AWS client', () => {
        expect(awsClient).to.be.an('object');
    });

    it('should initialize Azure client', () => {
        expect(azureClient).to.be.an('object');
    });

    it('should initialize GCP client', () => {
        expect(gcpClient).to.be.an('object');
    });

    it('should initialize Docker client', () => {
        expect(dockerClient).to.be.an('object');
    });

    it('should initialize Kubernetes client', () => {
        expect(k8sClient).to.be.an('object');
    });

    it('should initialize GitHub client', () => {
        expect(githubClient).to.be.an('object');
    });

    it('should initialize GitLab client', () => {
        expect(gitlabClient).to.be.an('object');
    });

    it('should initialize Jenkins client', () => {
        expect(jenkinsClient).to.be.an('object');
    });
});