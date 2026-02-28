/**
 * Kubernetes Integration Tool
 * 
 * Provides Kubernetes operations:
 * - Cluster connection and management
 * - Deployment, Service, Ingress YAML generation
 * - Helm chart scaffolding
 * - Pod log streaming (simulated)
 * - Resource management commands
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';

export class KubernetesTool {
  private secretManager: SecretManager;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'k8s_generate_deployment',
        description: 'Generate Kubernetes Deployment + Service YAML',
        inputSchema: {
          type: 'object',
          properties: {
            appName: { type: 'string', description: 'Application name' },
            image: { type: 'string', description: 'Container image (e.g., nginx:latest)' },
            replicas: { type: 'number', default: 3, description: 'Number of replicas' },
            port: { type: 'number', default: 80, description: 'Container port' },
            envVars: { type: 'object', description: 'Environment variables as key-value pairs' },
          },
          required: ['appName', 'image'],
        },
      },
      {
        name: 'k8s_generate_ingress',
        description: 'Generate Kubernetes Ingress YAML for routing',
        inputSchema: {
          type: 'object',
          properties: {
            appName: { type: 'string' },
            host: { type: 'string', description: 'Domain name (e.g., example.com)' },
            serviceName: { type: 'string', description: 'Backend service name' },
            servicePort: { type: 'number', default: 80 },
            tls: { type: 'boolean', default: false, description: 'Enable TLS/SSL' },
          },
          required: ['appName', 'host', 'serviceName'],
        },
      },
      {
        name: 'k8s_generate_helm_chart',
        description: 'Generate a complete Hello chart structure',
        inputSchema: {
          type: 'object',
          properties: {
            chartName: { type: 'string', description: 'Helm chart name' },
            appType: { type: 'string', description: 'App type (web, api, worker)', default: 'web' },
            includeIngress: { type: 'boolean', default: true },
            includeCertManager: { type: 'boolean', default: false },
          },
          required: ['chartName'],
        },
      },
      {
        name: 'k8s_get_pod_logs',
        description: 'Get logs from a pod (simulated for now)',
        inputSchema: {
          type: 'object',
          properties: {
            podName: { type: 'string', description: 'Pod name' },
            namespace: { type: 'string', default: 'default' },
            tailLines: { type: 'number', default: 50, description: 'Number of log lines' },
          },
          required: ['podName'],
        },
      },
    ];
  }

  async executeTool(toolName: string, input: Record<string, any>): Promise<CallToolResult> {
    try {
      switch (toolName) {
        case 'k8s_generate_deployment':
          return await this.generateDeployment(input);
        
        case 'k8s_generate_ingress':
          return await this.generateIngress(input);
        
        case 'k8s_generate_helm_chart':
          return await this.generateHelmChart(input);
        
        case 'k8s_get_pod_logs':
          return await this.getPodLogs(input);
        
        default:
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool' }) }],
            isError: true,
          };
      }
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: error.message || 'Kubernetes operation failed',
          }),
        }],
        isError: true,
      };
    }
  }

  private async generateDeployment(input: Record<string, any>): Promise<CallToolResult> {
    const envVarsYaml = input.envVars
      ? Object.entries(input.envVars)
          .map(([key, value]) => `        - name: ${key}\n          value: "${value}"`)
          .join('\n')
      : '';

    const yaml = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${input.appName}
  labels:
    app: ${input.appName}
spec:
  replicas: ${input.replicas || 3}
  selector:
    matchLabels:
      app: ${input.appName}
  template:
    metadata:
      labels:
        app: ${input.appName}
    spec:
      containers:
      - name: ${input.appName}
        image: ${input.image}
        ports:
        - containerPort: ${input.port || 80}
${envVarsYaml ? `        env:\n${envVarsYaml}` : ''}
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: ${input.appName}-service
spec:
  selector:
    app: ${input.appName}
  ports:
  - protocol: TCP
    port: 80
    targetPort: ${input.port || 80}
  type: LoadBalancer
`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          yaml,
          files: {
            [`k8s/${input.appName}-deployment.yaml`]: yaml,
          },
          message: `✓ Generated K8s manifests for ${input.appName}`,
          nextSteps: [
            'Save to k8s/ directory',
            `kubectl apply -f k8s/${input.appName}-deployment.yaml`,
            'kubectl get pods',
            `kubectl get service ${input.appName}-service`,
          ],
        }),
      }],
    };
  }

  private async generateIngress(input: Record<string, any>): Promise<CallToolResult> {
    const tlsSection = input.tls
      ? `  tls:
  - hosts:
    - ${input.host}
    secretName: ${input.appName}-tls`
      : '';

    const yaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${input.appName}-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
${input.tls ? '    cert-manager.io/cluster-issuer: letsencrypt-prod' : ''}
spec:
${tlsSection}
  rules:
  - host: ${input.host}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${input.serviceName}
            port:
              number: ${input.servicePort || 80}
`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          yaml,
          files: { [`k8s/${input.appName}-ingress.yaml`]: yaml },
          message: `✓ Generated Ingress for ${input.host}`,
          nextSteps: [
            input.tls ? 'Install cert-manager: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml' : '',
            `kubectl apply -f k8s/${input.appName}-ingress.yaml`,
            `Point DNS ${input.host} to cluster IP`,
          ].filter(Boolean),
        }),
      }],
    };
  }

  private async generateHelmChart(input: Record<string, any>): Promise<CallToolResult> {
    const chartYaml = `apiVersion: v2
name: ${input.chartName}
description: A Helm chart for ${input.chartName}
type: application
version: 0.1.0
appVersion: "1.0"
`;

    const valuesYaml = `replicaCount: 3

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: LoadBalancer
  port: 80

${input.includeIngress ? `ingress:
  enabled: true
  className: nginx
  annotations: {}
  hosts:
    - host: ${input.chartName}.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: ${input.includeCertManager ? '[]' : ''}` : ''}

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
`;

    const deploymentTemplate = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "${input.chartName}.fullname" . }}
  labels:
    {{- include "${input.chartName}.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "${input.chartName}.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "${input.chartName}.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.port }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
`;

    const helpers = `{{- define "${input.chartName}.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "${input.chartName}.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "${input.chartName}.labels" -}}
app.kubernetes.io/name: {{ include "${input.chartName}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "${input.chartName}.selectorLabels" -}}
app.kubernetes.io/name: {{ include "${input.chartName}.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          chartName: input.chartName,
          files: {
            [`${input.chartName}/Chart.yaml`]: chartYaml,
            [`${input.chartName}/values.yaml`]: valuesYaml,
            [`${input.chartName}/templates/deployment.yaml`]: deploymentTemplate,
            [`${input.chartName}/templates/_helpers.tpl`]: helpers,
          },
          message: `✓ Generated Helm chart: ${input.chartName}`,
          nextSteps: [
            `cd ${input.chartName}`,
            'helm install my-release .',
            'helm list',
            'kubectl get all',
          ],
        }),
      }],
    };
  }

  private async getPodLogs(input: Record<string, any>): Promise<CallToolResult> {
    // In production, would use kubectl client or k8s API
    const simulatedLogs = `[Simulated logs for ${input.podName}]
2025-01-15 10:00:01 INFO Starting application
2025-01-15 10:00:02 INFO Connecting to database
2025-01-15 10:00:03 INFO Server listening on port 3000
2025-01-15 10:00:04 INFO Health check passed
2025-01-15 10:00:05 INFO Ready to accept requests`;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          podName: input.podName,
          namespace: input.namespace || 'default',
          logs: simulatedLogs,
          note: 'Logs are simulated. Configure kubeconfig for real pod logs.',
          actualCommand: `kubectl logs ${input.podName} -n ${input.namespace || 'default'} --tail=${input.tailLines || 50}`,
        }),
      }],
    };
  }
}
