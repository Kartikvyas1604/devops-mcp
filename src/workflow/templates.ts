/**
 * Pre-built Workflow Templates
 * Common DevOps workflows ready to use
 */

import { Workflow, WorkflowBuilder, WorkflowStep } from './engine';

/**
 * CI/CD Pipeline - Build, Test, Deploy
 */
export function createCICDWorkflow(options: {
  projectName: string;
  language: 'node' | 'python' | 'go' | 'java';
  deployTarget: 'kubernetes' | 'aws-lambda' | 'gcp-cloudrun' | 'azure-webapp';
  environments: string[];
}): Workflow {
  const { projectName, language, deployTarget, environments } = options;

  const builder = new WorkflowBuilder(`cicd-${projectName}`, `CI/CD Pipeline: ${projectName}`)
    .description(`Automated CI/CD pipeline for ${projectName}`)
    .version('1.0.0')
    .env({
      PROJECT_NAME: projectName,
      LANGUAGE: language,
    })
    .trigger('git', { events: ['push', 'pull_request'], branches: ['main', 'develop'] });

  // Build step
  builder.task('build', 'Build Application', 'docker.build', {
    context: '.',
    tag: `\${{env.PROJECT_NAME}}:\${{env.GIT_SHA}}`,
    dockerfile: 'Dockerfile',
  });

  // Test step
  builder.task('test', 'Run Tests', 'test.run', {
    suite: 'all',
    coverage: true,
  });
  builder.dependsOn('test', ['build']);

  // Security scan
  builder.task('security-scan', 'Security Scan', 'shell.exec', {
    command: 'trivy image \${{outputs.build.tag}}',
  });
  builder.dependsOn('security-scan', ['build']);
  builder.continueOnError('security-scan');

  // Push to registry
  builder.task('push', 'Push to Registry', 'docker.push', {
    image: `\${{outputs.build.tag}}`,
    registry: '\${{env.REGISTRY}}',
  });
  builder.dependsOn('push', ['test', 'security-scan']);

  // Deploy to each environment
  environments.forEach((env, index) => {
    const deployId = `deploy-${env}`;
    const deployAction = getDeployAction(deployTarget);

    // Approval for production
    if (env === 'production') {
      builder.approval(`approval-${env}`, `Approve ${env} Deployment`, 
        `Deploy ${projectName} to ${env}?`, ['team-leads']);
      builder.dependsOn(`approval-${env}`, index === 0 ? ['push'] : [`deploy-${environments[index - 1]}`]);

      builder.task(deployId, `Deploy to ${env}`, deployAction, {
        image: '\${{outputs.build.tag}}',
        environment: env,
        service: projectName,
      });
      builder.dependsOn(deployId, [`approval-${env}`]);
    } else {
      builder.task(deployId, `Deploy to ${env}`, deployAction, {
        image: '\${{outputs.build.tag}}',
        environment: env,
        service: projectName,
      });
      builder.dependsOn(deployId, index === 0 ? ['push'] : [`deploy-${environments[index - 1]}`]);
    }

    // Notification after deploy
    builder.notify(`notify-${env}`, `Notify ${env} Deploy`, 'slack', 
      `Deployed {{outputs.build.tag}} to ${env}`);
    builder.dependsOn(`notify-${env}`, [deployId]);
  });

  // Success notification
  builder.onSuccess([{
    id: 'on-success',
    name: 'Pipeline Success',
    type: 'notification',
    config: {
      channel: 'slack',
      template: ':white_check_mark: Pipeline completed successfully for {{env.PROJECT_NAME}}',
    },
  }]);

  // Failure notification
  builder.onFailure([{
    id: 'on-failure',
    name: 'Pipeline Failed',
    type: 'notification',
    config: {
      channel: 'slack',
      template: ':x: Pipeline failed for {{env.PROJECT_NAME}}',
    },
  }]);

  return builder.build();
}

/**
 * Kubernetes Deployment Workflow
 */
export function createK8sDeployWorkflow(options: {
  clusterName: string;
  namespace: string;
  deploymentName: string;
  image: string;
  replicas?: number;
}): Workflow {
  const { clusterName, namespace, deploymentName, image, replicas = 3 } = options;

  return new WorkflowBuilder(`k8s-deploy-${deploymentName}`, `K8s Deploy: ${deploymentName}`)
    .description(`Deploy ${deploymentName} to Kubernetes cluster ${clusterName}`)
    .env({
      CLUSTER: clusterName,
      NAMESPACE: namespace,
      DEPLOYMENT: deploymentName,
      IMAGE: image,
      REPLICAS: String(replicas),
    })
    .task('update-image', 'Update Deployment Image', 'kubernetes.apply', {
      manifest: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: \${{env.DEPLOYMENT}}
  namespace: \${{env.NAMESPACE}}
spec:
  replicas: \${{env.REPLICAS}}
  selector:
    matchLabels:
      app: \${{env.DEPLOYMENT}}
  template:
    metadata:
      labels:
        app: \${{env.DEPLOYMENT}}
    spec:
      containers:
      - name: \${{env.DEPLOYMENT}}
        image: \${{env.IMAGE}}
        ports:
        - containerPort: 8080
`,
    })
    .task('wait-rollout', 'Wait for Rollout', 'kubernetes.rollout', {
      deployment: '\${{env.DEPLOYMENT}}',
      namespace: '\${{env.NAMESPACE}}',
      timeout: 300,
    })
    .dependsOn('wait-rollout', ['update-image'])
    .task('verify', 'Verify Deployment', 'http.request', {
      url: 'http://\${{env.DEPLOYMENT}}.\${{env.NAMESPACE}}.svc.cluster.local/health',
      method: 'GET',
      expectedStatus: 200,
    })
    .dependsOn('verify', ['wait-rollout'])
    .retries('verify', 3)
    .onFailure([{
      id: 'rollback',
      name: 'Rollback Deployment',
      type: 'task',
      config: {
        action: 'shell.exec',
        params: { command: 'kubectl rollout undo deployment/\${{env.DEPLOYMENT}} -n \${{env.NAMESPACE}}' },
      },
    }])
    .build();
}

/**
 * Database Migration Workflow
 */
export function createDbMigrationWorkflow(options: {
  databaseName: string;
  migrationTool: 'flyway' | 'liquibase' | 'alembic' | 'prisma';
}): Workflow {
  const { databaseName, migrationTool } = options;

  const migrationCommands: Record<string, string> = {
    flyway: 'flyway migrate',
    liquibase: 'liquibase update',
    alembic: 'alembic upgrade head',
    prisma: 'npx prisma migrate deploy',
  };

  return new WorkflowBuilder(`db-migrate-${databaseName}`, `DB Migration: ${databaseName}`)
    .description(`Run database migrations for ${databaseName}`)
    .env({
      DATABASE_NAME: databaseName,
      MIGRATION_TOOL: migrationTool,
    })
    .task('backup', 'Backup Database', 'shell.exec', {
      command: `pg_dump \${{env.DATABASE_URL}} > backup_$(date +%Y%m%d_%H%M%S).sql`,
    })
    .timeout('backup', 300000)
    .task('dry-run', 'Dry Run Migration', 'shell.exec', {
      command: `${migrationCommands[migrationTool]} --dry-run`,
    })
    .dependsOn('dry-run', ['backup'])
    .approval('approve-migration', 'Approve Migration', 
      'Apply database migration? Review the dry-run output.', ['dba-team'])
    .dependsOn('approve-migration', ['dry-run'])
    .task('migrate', 'Apply Migration', 'shell.exec', {
      command: migrationCommands[migrationTool],
    })
    .dependsOn('migrate', ['approve-migration'])
    .timeout('migrate', 600000)
    .task('validate', 'Validate Schema', 'shell.exec', {
      command: 'npm run db:validate',
    })
    .dependsOn('validate', ['migrate'])
    .onFailure([{
      id: 'restore',
      name: 'Restore from Backup',
      type: 'task',
      config: {
        action: 'shell.exec',
        params: { command: 'psql \${{env.DATABASE_URL}} < backup_*.sql' },
      },
    }])
    .build();
}

/**
 * Blue-Green Deployment Workflow
 */
export function createBlueGreenWorkflow(options: {
  serviceName: string;
  loadBalancer: string;
  healthCheckPath?: string;
}): Workflow {
  const { serviceName, loadBalancer, healthCheckPath = '/health' } = options;

  return new WorkflowBuilder(`blue-green-${serviceName}`, `Blue-Green: ${serviceName}`)
    .description(`Blue-Green deployment for ${serviceName}`)
    .env({
      SERVICE_NAME: serviceName,
      LOAD_BALANCER: loadBalancer,
      HEALTH_PATH: healthCheckPath,
    })
    .task('identify-current', 'Identify Current Environment', 'shell.exec', {
      command: 'kubectl get service \${{env.SERVICE_NAME}} -o jsonpath="{.spec.selector.version}"',
      outputs: ['currentVersion'],
    })
    .task('deploy-inactive', 'Deploy to Inactive Environment', 'kubernetes.apply', {
      manifest: '\${{env.MANIFEST}}',
      namespace: 'default',
    })
    .dependsOn('deploy-inactive', ['identify-current'])
    .task('wait-healthy', 'Wait for Health', 'http.request', {
      url: 'http://\${{env.SERVICE_NAME}}-inactive\${{env.HEALTH_PATH}}',
      method: 'GET',
      expectedStatus: 200,
      retries: 10,
      retryDelay: 5000,
    })
    .dependsOn('wait-healthy', ['deploy-inactive'])
    .retries('wait-healthy', 10)
    .task('run-smoke-tests', 'Run Smoke Tests', 'test.run', {
      suite: 'smoke',
      target: '\${{env.SERVICE_NAME}}-inactive',
    })
    .dependsOn('run-smoke-tests', ['wait-healthy'])
    .approval('approve-switch', 'Approve Traffic Switch', 
      'Switch traffic to new deployment?')
    .dependsOn('approve-switch', ['run-smoke-tests'])
    .task('switch-traffic', 'Switch Traffic', 'shell.exec', {
      command: `kubectl patch service \${{env.SERVICE_NAME}} -p '{"spec":{"selector":{"version":"\${{outputs.newVersion}}"}}}'`,
    })
    .dependsOn('switch-traffic', ['approve-switch'])
    .task('verify-production', 'Verify Production', 'http.request', {
      url: 'http://\${{env.LOAD_BALANCER}}\${{env.HEALTH_PATH}}',
      method: 'GET',
      expectedStatus: 200,
    })
    .dependsOn('verify-production', ['switch-traffic'])
    .task('cleanup-old', 'Cleanup Old Environment', 'kubernetes.scale', {
      deployment: '\${{env.SERVICE_NAME}}-old',
      replicas: 0,
    })
    .dependsOn('cleanup-old', ['verify-production'])
    .continueOnError('cleanup-old')
    .onFailure([{
      id: 'rollback-traffic',
      name: 'Rollback Traffic',
      type: 'task',
      config: {
        action: 'shell.exec',
        params: {
          command: `kubectl patch service \${{env.SERVICE_NAME}} -p '{"spec":{"selector":{"version":"\${{outputs.identify-current.currentVersion}}"}}}'`,
        },
      },
    }])
    .build();
}

/**
 * Infrastructure Provisioning Workflow
 */
export function createInfraWorkflow(options: {
  projectName: string;
  provider: 'aws' | 'gcp' | 'azure';
  environment: string;
}): Workflow {
  const { projectName, provider, environment } = options;

  return new WorkflowBuilder(`infra-${projectName}-${environment}`, `Infrastructure: ${projectName}`)
    .description(`Provision infrastructure for ${projectName} on ${provider}`)
    .env({
      PROJECT: projectName,
      PROVIDER: provider,
      ENVIRONMENT: environment,
      TF_VAR_project: projectName,
      TF_VAR_environment: environment,
    })
    .task('tf-init', 'Terraform Init', 'shell.exec', {
      command: 'terraform init -backend-config="key=\${{env.PROJECT}}/\${{env.ENVIRONMENT}}/terraform.tfstate"',
    })
    .task('tf-validate', 'Terraform Validate', 'shell.exec', {
      command: 'terraform validate',
    })
    .dependsOn('tf-validate', ['tf-init'])
    .task('tf-plan', 'Terraform Plan', 'shell.exec', {
      command: 'terraform plan -out=tfplan -var-file=\${{env.ENVIRONMENT}}.tfvars',
      outputs: ['planFile'],
    })
    .dependsOn('tf-plan', ['tf-validate'])
    .approval('approve-infra', 'Approve Infrastructure Changes',
      'Review the Terraform plan and approve infrastructure changes.')
    .dependsOn('approve-infra', ['tf-plan'])
    .task('tf-apply', 'Terraform Apply', 'shell.exec', {
      command: 'terraform apply -auto-approve tfplan',
    })
    .dependsOn('tf-apply', ['approve-infra'])
    .timeout('tf-apply', 1800000) // 30 minutes
    .task('get-outputs', 'Get Terraform Outputs', 'shell.exec', {
      command: 'terraform output -json > outputs.json',
      outputs: ['terraformOutputs'],
    })
    .dependsOn('get-outputs', ['tf-apply'])
    .notify('notify-complete', 'Notify Completion', 'slack',
      ':white_check_mark: Infrastructure provisioned for {{env.PROJECT}} in {{env.ENVIRONMENT}}')
    .dependsOn('notify-complete', ['get-outputs'])
    .onFailure([{
      id: 'notify-failure',
      name: 'Notify Failure',
      type: 'notification',
      config: {
        channel: 'slack',
        template: ':x: Infrastructure provisioning failed for {{env.PROJECT}}',
      },
    }])
    .build();
}

/**
 * Canary Deployment Workflow
 */
export function createCanaryWorkflow(options: {
  serviceName: string;
  canaryPercentage?: number;
  evaluationDuration?: number;
}): Workflow {
  const { serviceName, canaryPercentage = 10, evaluationDuration = 300000 } = options;

  return new WorkflowBuilder(`canary-${serviceName}`, `Canary Deploy: ${serviceName}`)
    .description(`Canary deployment for ${serviceName}`)
    .env({
      SERVICE: serviceName,
      CANARY_PERCENT: String(canaryPercentage),
    })
    .task('deploy-canary', 'Deploy Canary', 'kubernetes.apply', {
      manifest: '\${{env.CANARY_MANIFEST}}',
    })
    .task('configure-traffic', 'Configure Traffic Split', 'shell.exec', {
      command: `kubectl patch virtualservice \${{env.SERVICE}} --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"\${{env.SERVICE}}","subset":"stable"},"weight":${100 - canaryPercentage}},{"destination":{"host":"\${{env.SERVICE}}","subset":"canary"},"weight":${canaryPercentage}}]}]}}'`,
    })
    .dependsOn('configure-traffic', ['deploy-canary'])
    .task('wait-evaluation', 'Evaluate Canary', 'wait', {
      duration: evaluationDuration,
    })
    .dependsOn('wait-evaluation', ['configure-traffic'])
    .task('check-metrics', 'Check Metrics', 'http.request', {
      url: '\${{env.PROMETHEUS_URL}}/api/v1/query?query=rate(http_requests_total{service="\${{env.SERVICE}}",status="5xx"}[5m])',
      method: 'GET',
    })
    .dependsOn('check-metrics', ['wait-evaluation'])
    .conditional('evaluate-success', 'Evaluate Success',
      'outputs.check-metrics.data.result[0].value[1] < 0.01',
      [{
        id: 'promote-canary',
        name: 'Promote Canary',
        type: 'task',
        config: {
          action: 'shell.exec',
          params: { command: 'kubectl patch virtualservice \${{env.SERVICE}} --type merge -p \'{"spec":{"http":[{"route":[{"destination":{"host":"\${{env.SERVICE}}","subset":"canary"},"weight":100}]}]}}\'' },
        },
      }],
      [{
        id: 'rollback-canary',
        name: 'Rollback Canary',
        type: 'task',
        config: {
          action: 'shell.exec',
          params: { command: 'kubectl patch virtualservice \${{env.SERVICE}} --type merge -p \'{"spec":{"http":[{"route":[{"destination":{"host":"\${{env.SERVICE}}","subset":"stable"},"weight":100}]}]}}\'' },
        },
      }])
    .dependsOn('evaluate-success', ['check-metrics'])
    .build();
}

/**
 * Disaster Recovery Workflow
 */
export function createDRWorkflow(options: {
  primaryRegion: string;
  drRegion: string;
  services: string[];
}): Workflow {
  const { primaryRegion, drRegion, services } = options;

  const builder = new WorkflowBuilder('disaster-recovery', 'Disaster Recovery Failover')
    .description(`Failover from ${primaryRegion} to ${drRegion}`)
    .env({
      PRIMARY_REGION: primaryRegion,
      DR_REGION: drRegion,
    });

  // Verify DR environment
  builder.task('verify-dr', 'Verify DR Environment', 'http.request', {
    url: `https://health.${drRegion}.example.com/status`,
    expectedStatus: 200,
  });

  // DNS failover
  builder.task('dns-failover', 'DNS Failover', 'shell.exec', {
    command: `aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch '{"Changes":[{"Action":"UPSERT","ResourceRecordSet":{"Name":"api.example.com","Type":"CNAME","TTL":60,"ResourceRecords":[{"Value":"api.${drRegion}.example.com"}]}}]}'`,
  });
  builder.dependsOn('dns-failover', ['verify-dr']);

  // Scale up DR services
  const scaleSteps: WorkflowStep[] = services.map(service => ({
    id: `scale-${service}`,
    name: `Scale ${service}`,
    type: 'task' as const,
    config: {
      action: 'kubernetes.scale',
      params: {
        deployment: service,
        replicas: 3,
        namespace: 'production',
      },
    },
  }));

  builder.parallel('scale-services', 'Scale DR Services', scaleSteps);
  builder.dependsOn('scale-services', ['dns-failover']);

  // Verify services
  builder.task('verify-services', 'Verify All Services', 'shell.exec', {
    command: 'kubectl get pods -n production | grep Running | wc -l',
  });
  builder.dependsOn('verify-services', ['scale-services']);

  // Notification
  builder.notify('notify-dr', 'Notify DR Complete', 'slack',
    ':warning: Disaster Recovery Failover Complete - Now serving from {{env.DR_REGION}}');
  builder.dependsOn('notify-dr', ['verify-services']);

  return builder.build();
}

// Helper function to get deploy action based on target
function getDeployAction(target: string): string {
  const actions: Record<string, string> = {
    'kubernetes': 'kubernetes.apply',
    'aws-lambda': 'aws.lambda.deploy',
    'gcp-cloudrun': 'gcp.cloudrun.deploy',
    'azure-webapp': 'azure.webapp.deploy',
  };
  return actions[target] || 'kubernetes.apply';
}
