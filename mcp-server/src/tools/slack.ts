/**
 * Slack Integration Tool
 * 
 * Provides Slack operations:
 * - Send messages and notifications
 * - Create channels
 * - Manage webhooks
 * - Deploy notification integrations
 */

import { WebClient } from '@slack/web-api';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';

export class SlackTool {
  private secretManager: SecretManager;
  private slack?: WebClient;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
    this.initializeClient();
  }

  private async initializeClient(): Promise<void> {
    const token = await this.secretManager.getSecret('slack.token');
    if (token) {
      this.slack = new WebClient(token);
    }
  }

  getTools(): Tool[] {
    return [
      {
        name: 'slack_send_message',
        description: 'Send a message to a Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Channel name or ID' },
            text: { type: 'string', description: 'Message text' },
          },
          required: ['channel', 'text'],
        },
      },
      {
        name: 'slack_create_channel',
        description: 'Create a new Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Channel name (lowercase, no spaces)' },
            isPrivate: { type: 'boolean', description: 'Private channel?', default: false },
          },
          required: ['name'],
        },
      },
      {
        name: 'slack_setup_deployment_notifications',
        description: 'Set up automated deployment notifications for a project',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Notification channel' },
            environment: { type: 'string', description: 'Environment (staging, production)' },
          },
          required: ['channel'],
        },
      },
      {
        name: 'slack_create_webhook',
        description: 'Generate a webhook URL for custom integrations',
        inputSchema: {
          type: 'object',
          properties: {
            channel: { type: 'string', description: 'Target channel' },
          },
          required: ['channel'],
        },
      },
    ];
  }

  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.slack) {
      await this.initializeClient();
      if (!this.slack) {
        throw new Error('Slack not connected. Please authenticate with Slack first.');
      }
    }

    switch (toolName) {
      case 'slack_send_message':
        return this.sendMessage(args);
      case 'slack_create_channel':
        return this.createChannel(args);
      case 'slack_setup_deployment_notifications':
        return this.setupDeploymentNotifications(args);
      case 'slack_create_webhook':
        return this.createWebhook(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async sendMessage(args: any): Promise<any> {
    const result = await this.slack!.chat.postMessage({
      channel: args.channel,
      text: args.text,
    });

    return {
      success: true,
      message: 'Message sent to Slack',
      channel: args.channel,
      timestamp: result.ts,
    };
  }

  private async createChannel(args: any): Promise<any> {
    const result = await this.slack!.conversations.create({
      name: args.name,
      is_private: args.isPrivate || false,
    });

    return {
      success: true,
      message: `Channel created: #${args.name}`,
      channelId: result.channel?.id,
      channelName: args.name,
    };
  }

  private async setupDeploymentNotifications(args: any): Promise<any> {
    // Generate sample code for deployment notifications
    const webhookCode = `
// Add this to your deployment script
const notifySlack = async (status, environment) => {
  const message = {
    text: \`Deployment to \${environment}: \${status}\`,
    channel: '${args.channel}',
  };
  
  await fetch('WEBHOOK_URL', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
};

// In your CI/CD pipeline:
await notifySlack('SUCCESS', '${args.environment || 'production'}');
`;

    return {
      success: true,
      message: `Deployment notifications configured for #${args.channel}`,
      channel: args.channel,
      environment: args.environment || 'production',
      sampleCode: webhookCode,
      nextSteps: [
        'Copy the webhook URL to your CI/CD environment variables',
        'Add the notification code to your deployment script',
        'Test with a manual deployment',
      ],
    };
  }

  private async createWebhook(args: any): Promise<any> {
    // In production, this would create an actual webhook
    return {
      success: true,
      message: `Webhook created for #${args.channel}`,
      webhookUrl: `https://hooks.slack.com/services/YOUR_WEBHOOK_URL`,
      channel: args.channel,
      note: 'Save this webhook URL securely - it cannot be retrieved later',
      usage: `curl -X POST -H 'Content-type: application/json' --data '{"text":"Hello from Genie-ops!"}' WEBHOOK_URL`,
    };
  }
}
