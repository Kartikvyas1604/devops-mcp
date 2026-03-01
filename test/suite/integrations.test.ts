/**
 * Integration Tests for DevOps Omnibus
 * Comprehensive test suite for all integrations
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Integration Tests', () => {
  // ============================================
  // GitHub Integration Tests
  // ============================================
  suite('GitHub Integration', () => {
    test('should create GitHub client instance', () => {
      // Import dynamically to avoid activation issues
      const { GitHubClient } = require('../../src/integrations/github');
      
      const client = new GitHubClient({ token: 'test-token' });
      assert.ok(client);
      assert.strictEqual(typeof client.listRepos, 'function');
      assert.strictEqual(typeof client.createIssue, 'function');
      assert.strictEqual(typeof client.createPullRequest, 'function');
    });

    test('should have all required methods', () => {
      const { GitHubClient } = require('../../src/integrations/github');
      const client = new GitHubClient({ token: 'test-token' });
      
      const requiredMethods = [
        'listRepos',
        'getRepo',
        'createRepo',
        'listIssues',
        'createIssue',
        'updateIssue',
        'listPullRequests',
        'createPullRequest',
        'mergePullRequest',
        'listWorkflowRuns',
        'triggerWorkflow',
        'listReleases',
        'createRelease',
      ];

      requiredMethods.forEach(method => {
        assert.strictEqual(typeof client[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  // ============================================
  // Docker Integration Tests
  // ============================================
  suite('Docker Integration', () => {
    test('should create Docker integration instance', () => {
      const { DockerIntegration } = require('../../src/integrations/docker');
      
      const docker = new DockerIntegration();
      assert.ok(docker);
      assert.strictEqual(typeof docker.listContainers, 'function');
      assert.strictEqual(typeof docker.runContainer, 'function');
    });

    test('should have container management methods', () => {
      const { DockerIntegration } = require('../../src/integrations/docker');
      const docker = new DockerIntegration();

      const containerMethods = [
        'listContainers',
        'getContainer',
        'runContainer',
        'stopContainer',
        'startContainer',
        'removeContainer',
        'getContainerLogs',
        'execInContainer',
      ];

      containerMethods.forEach(method => {
        assert.strictEqual(typeof docker[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have image management methods', () => {
      const { DockerIntegration } = require('../../src/integrations/docker');
      const docker = new DockerIntegration();

      const imageMethods = [
        'listImages',
        'pullImage',
        'buildImage',
        'removeImage',
        'tagImage',
        'pushImage',
      ];

      imageMethods.forEach(method => {
        assert.strictEqual(typeof docker[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  // ============================================
  // AWS Integration Tests
  // ============================================
  suite('AWS Integration', () => {
    test('should create AWS integration instance', () => {
      const { AWSIntegration } = require('../../src/integrations/aws');
      
      const aws = new AWSIntegration({ region: 'us-east-1' });
      assert.ok(aws);
    });

    test('should have Lambda methods', () => {
      const { AWSIntegration } = require('../../src/integrations/aws');
      const aws = new AWSIntegration({ region: 'us-east-1' });

      const lambdaMethods = [
        'listFunctions',
        'getFunction',
        'invokeFunction',
        'updateFunctionCode',
        'deleteFunction',
      ];

      lambdaMethods.forEach(method => {
        assert.strictEqual(typeof aws[method], 'function', `Missing Lambda method: ${method}`);
      });
    });

    test('should have S3 methods', () => {
      const { AWSIntegration } = require('../../src/integrations/aws');
      const aws = new AWSIntegration({ region: 'us-east-1' });

      const s3Methods = [
        'listBuckets',
        'createBucket',
        'deleteBucket',
        'listObjects',
        'uploadObject',
        'downloadObject',
        'deleteObject',
      ];

      s3Methods.forEach(method => {
        assert.strictEqual(typeof aws[method], 'function', `Missing S3 method: ${method}`);
      });
    });

    test('should have EC2 methods', () => {
      const { AWSIntegration } = require('../../src/integrations/aws');
      const aws = new AWSIntegration({ region: 'us-east-1' });

      const ec2Methods = [
        'listInstances',
        'startInstance',
        'stopInstance',
        'terminateInstance',
        'getInstanceStatus',
      ];

      ec2Methods.forEach(method => {
        assert.strictEqual(typeof aws[method], 'function', `Missing EC2 method: ${method}`);
      });
    });
  });

  // ============================================
  // GCP Integration Tests
  // ============================================
  suite('GCP Integration', () => {
    test('should create GCP integration instance', () => {
      const { GCPIntegration } = require('../../src/integrations/gcp');
      
      const gcp = new GCPIntegration({ projectId: 'test-project', region: 'us-central1' });
      assert.ok(gcp);
    });

    test('should have Cloud Functions methods', () => {
      const { GCPIntegration } = require('../../src/integrations/gcp');
      const gcp = new GCPIntegration({ projectId: 'test-project', region: 'us-central1' });

      const methods = [
        'listFunctions',
        'getFunction',
        'deployFunction',
        'invokeFunction',
        'deleteFunction',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof gcp[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have Cloud Run methods', () => {
      const { GCPIntegration } = require('../../src/integrations/gcp');
      const gcp = new GCPIntegration({ projectId: 'test-project', region: 'us-central1' });

      const methods = [
        'listServices',
        'getService',
        'deployService',
        'deleteService',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof gcp[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  // ============================================
  // Azure Integration Tests
  // ============================================
  suite('Azure Integration', () => {
    test('should create Azure integration instance', () => {
      const { AzureIntegration } = require('../../src/integrations/azure');
      
      const azure = new AzureIntegration({ 
        subscriptionId: 'test-sub',
        location: 'eastus'
      });
      assert.ok(azure);
    });

    test('should have App Service methods', () => {
      const { AzureIntegration } = require('../../src/integrations/azure');
      const azure = new AzureIntegration({ subscriptionId: 'test-sub', location: 'eastus' });

      const methods = [
        'listWebApps',
        'createWebApp',
        'restartWebApp',
        'stopWebApp',
        'startWebApp',
        'deleteWebApp',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof azure[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have AKS methods', () => {
      const { AzureIntegration } = require('../../src/integrations/azure');
      const azure = new AzureIntegration({ subscriptionId: 'test-sub', location: 'eastus' });

      const methods = [
        'listAKSClusters',
        'createAKSCluster',
        'getAKSCredentials',
        'scaleAKSNodePool',
        'deleteAKSCluster',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof azure[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  // ============================================
  // Kubernetes Integration Tests
  // ============================================
  suite('Kubernetes Integration', () => {
    test('should create Kubernetes integration instance', () => {
      const { KubernetesIntegration } = require('../../src/integrations/kubernetes');
      
      const k8s = new KubernetesIntegration();
      assert.ok(k8s);
    });

    test('should have pod management methods', () => {
      const { KubernetesIntegration } = require('../../src/integrations/kubernetes');
      const k8s = new KubernetesIntegration();

      const methods = [
        'listPods',
        'getPod',
        'deletePod',
        'getPodLogs',
        'execInPod',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof k8s[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have deployment methods', () => {
      const { KubernetesIntegration } = require('../../src/integrations/kubernetes');
      const k8s = new KubernetesIntegration();

      const methods = [
        'listDeployments',
        'scaleDeployment',
        'restartDeployment',
        'rollbackDeployment',
        'deleteDeployment',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof k8s[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have Helm methods', () => {
      const { KubernetesIntegration } = require('../../src/integrations/kubernetes');
      const k8s = new KubernetesIntegration();

      const methods = [
        'listHelmReleases',
        'installHelmChart',
        'upgradeHelmRelease',
        'uninstallHelmRelease',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof k8s[method], 'function', `Missing method: ${method}`);
      });
    });
  });

  // ============================================
  // Slack Integration Tests
  // ============================================
  suite('Slack Integration', () => {
    test('should create Slack integration instance', () => {
      const { SlackIntegration } = require('../../src/integrations/slack');
      
      const slack = new SlackIntegration({ token: 'test-token' });
      assert.ok(slack);
    });

    test('should have messaging methods', () => {
      const { SlackIntegration } = require('../../src/integrations/slack');
      const slack = new SlackIntegration({ token: 'test-token' });

      const methods = [
        'sendMessage',
        'notify',
        'notifyDeployment',
        'notifyPipeline',
        'updateMessage',
        'deleteMessage',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof slack[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have Block Kit builder', () => {
      const { SlackIntegration, BlockKitBuilder } = require('../../src/integrations/slack');
      
      const builder = new BlockKitBuilder();
      assert.ok(builder);
      assert.strictEqual(typeof builder.header, 'function');
      assert.strictEqual(typeof builder.section, 'function');
      assert.strictEqual(typeof builder.divider, 'function');
      assert.strictEqual(typeof builder.actions, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });

    test('Block Kit builder should chain methods', () => {
      const { BlockKitBuilder } = require('../../src/integrations/slack');
      
      const blocks = new BlockKitBuilder()
        .header('Test Header')
        .section('Test section text')
        .divider()
        .fields([
          { title: 'Field 1', value: 'Value 1' },
          { title: 'Field 2', value: 'Value 2' },
        ])
        .actions([{ text: 'Click me', url: 'https://example.com' }])
        .build();

      assert.ok(Array.isArray(blocks));
      assert.strictEqual(blocks.length, 5);
      assert.strictEqual(blocks[0].type, 'header');
      assert.strictEqual(blocks[1].type, 'section');
      assert.strictEqual(blocks[2].type, 'divider');
    });
  });

  // ============================================
  // Jira Integration Tests
  // ============================================
  suite('Jira Integration', () => {
    test('should create Jira integration instance', () => {
      const { JiraIntegration } = require('../../src/integrations/jira');
      
      const jira = new JiraIntegration({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });
      assert.ok(jira);
    });

    test('should have issue methods', () => {
      const { JiraIntegration } = require('../../src/integrations/jira');
      const jira = new JiraIntegration({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });

      const methods = [
        'searchIssues',
        'getIssue',
        'createIssue',
        'updateIssue',
        'deleteIssue',
        'transitionIssue',
        'addComment',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof jira[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have sprint methods', () => {
      const { JiraIntegration } = require('../../src/integrations/jira');
      const jira = new JiraIntegration({
        baseUrl: 'https://test.atlassian.net',
        email: 'test@example.com',
        apiToken: 'test-token',
      });

      const methods = [
        'listBoards',
        'listSprints',
        'getSprint',
        'getSprintIssues',
        'startSprint',
        'completeSprint',
      ];

      methods.forEach(method => {
        assert.strictEqual(typeof jira[method], 'function', `Missing method: ${method}`);
      });
    });

    test('should have JQL builder', () => {
      const { JQLBuilder } = require('../../src/integrations/jira');
      
      const builder = new JQLBuilder();
      assert.ok(builder);
      assert.strictEqual(typeof builder.project, 'function');
      assert.strictEqual(typeof builder.status, 'function');
      assert.strictEqual(typeof builder.assignee, 'function');
      assert.strictEqual(typeof builder.build, 'function');
    });

    test('JQL builder should generate correct query', () => {
      const { JQLBuilder } = require('../../src/integrations/jira');
      
      const jql = new JQLBuilder()
        .project('PROJ')
        .status(['To Do', 'In Progress'])
        .assignee('currentUser()')
        .unresolved()
        .order('priority', 'DESC')
        .build();

      assert.ok(jql.includes('project = PROJ'));
      assert.ok(jql.includes('status IN'));
      assert.ok(jql.includes('assignee = currentUser()'));
      assert.ok(jql.includes('resolution is EMPTY'));
      assert.ok(jql.includes('ORDER BY priority DESC'));
    });
  });
});
