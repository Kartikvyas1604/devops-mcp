/**
 * Jira Integration Tool
 * 
 * Provides Jira operations via Atlassian REST API:
 * - Create issues, epics, and sprints
 * - Link commits to issues
 * - Sprint management
 * - Automated ticket creation from TODO comments
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { SecretManager } from '../secrets/secretManager.js';
import axios from 'axios';

export class JiraTool {
  private secretManager: SecretManager;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'jira_create_issue',
        description: 'Create a Jira issue (Story, Bug, Task, or custom type)',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Project key (e.g., PROJ)' },
            summary: { type: 'string', description: 'Issue summary/title' },
            description: { type: 'string', description: 'Detailed description' },
            issueType: { type: 'string', description: 'Issue type (Story, Bug, Task)', default: 'Task' },
            priority: { type: 'string', description: 'Priority (Highest, High, Medium, Low, Lowest)', default: 'Medium' },
            assignee: { type: 'string', description: 'Assignee username (optional)' },
          },
          required: ['project', 'summary'],
        },
      },
      {
        name: 'jira_create_epic',
        description: 'Create a Jira epic with child stories auto-generated from features list',
        inputSchema: {
          type: 'object',
          properties: {
            project: { type: 'string', description: 'Project key' },
            epicName: { type: 'string', description: 'Epic title' },
            description: { type: 'string', description: 'Epic description' },
            features: { type: 'array', items: { type: 'string' }, description: 'List of features (each becomes a story)' },
          },
          required: ['project', 'epicName', 'features'],
        },
      },
      {
        name: 'jira_transition_issue',
        description: 'Move issue through workflow (To Do → In Progress → Done)',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key (e.g., PROJ-123)' },
            transition: { type: 'string', description: 'Transition name (e.g., "In Progress", "Done")' },
          },
          required: ['issueKey', 'transition'],
        },
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to a Jira issue',
        inputSchema: {
          type: 'object',
          properties: {
            issueKey: { type: 'string', description: 'Issue key' },
            comment: { type: 'string', description: 'Comment text' },
          },
          required: ['issueKey', 'comment'],
        },
      },
    ];
  }

  async executeTool(toolName: string, input: Record<string, any>): Promise<CallToolResult> {
    const credentials = await this.secretManager.getSecret('jira.token');
    if (!credentials) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Jira not authenticated. Use "Connect Jira" command first.',
          }),
        }],
        isError: true,
      };
    }

    const { domain, credentials: authHeader } = JSON.parse(credentials);
    const baseUrl = `https://${domain}/rest/api/3`;

    try {
      switch (toolName) {
        case 'jira_create_issue':
          return await this.createIssue(baseUrl, authHeader, input);
        
        case 'jira_create_epic':
          return await this.createEpic(baseUrl, authHeader, input);
        
        case 'jira_transition_issue':
          return await this.transitionIssue(baseUrl, authHeader, input);
        
        case 'jira_add_comment':
          return await this.addComment(baseUrl, authHeader, input);
        
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
            error: error.message || 'Jira operation failed',
            details: error.response?.data || error.toString(),
          }),
        }],
        isError: true,
      };
    }
  }

  private async createIssue(
    baseUrl: string,
    authHeader: string,
    input: Record<string, any>
  ): Promise<CallToolResult> {
    const payload: {
      fields: {
        project: { key: any };
        summary: any;
        description: any;
        issuetype: { name: any };
        priority: { name: any };
        assignee?: { name: string };
      };
    } = {
      fields: {
        project: { key: input.project || input.projectKey },
        summary: input.summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: input.description || input.summary }],
            },
          ],
        },
        issuetype: { name: input.issueType || 'Task' },
        priority: { name: input.priority || 'Medium' },
      },
    };

    if (input.assignee) {
      payload.fields.assignee = { name: input.assignee };
    }

    const response = await axios.post(`${baseUrl}/issue`, payload, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          issueKey: response.data.key,
          issueUrl: `${baseUrl.replace('/rest/api/3', '')}/browse/${response.data.key}`,
          message: `✓ Created ${input.issueType || 'Task'}: ${response.data.key}`,
        }),
      }],
    };
  }

  private async createEpic(
    baseUrl: string,
    authHeader: string,
    input: Record<string, any>
  ): Promise<CallToolResult> {
    // Create epic
    const epicPayload = {
      fields: {
        project: { key: input.project },
        summary: input.epicName,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: input.description || input.epicName }],
            },
          ],
        },
        issuetype: { name: 'Epic' },
      },
    };

    const epicResponse = await axios.post(`${baseUrl}/issue`, epicPayload, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    const epicKey = epicResponse.data.key;

    // Create child stories
    const childIssues = [];
    for (const feature of input.features) {
      const storyPayload = {
        fields: {
          project: { key: input.project },
          summary: feature,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: `Story for: ${feature}` }],
              },
            ],
          },
          issuetype: { name: 'Story' },
          parent: { key: epicKey },
        },
      };

      const storyResponse = await axios.post(`${baseUrl}/issue`, storyPayload, {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });

      childIssues.push(storyResponse.data.key);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          epicKey,
          epicUrl: `${baseUrl.replace('/rest/api/3', '')}/browse/${epicKey}`,
          childIssues,
          message: `✓ Created epic ${epicKey} with ${childIssues.length} stories`,
        }),
      }],
    };
  }

  private async transitionIssue(
    baseUrl: string,
    authHeader: string,
    input: Record<string, any>
  ): Promise<CallToolResult> {
    // Get available transitions
    const transitionsResponse = await axios.get(
      `${baseUrl}/issue/${input.issueKey}/transitions`,
      {
        headers: { Authorization: `Basic ${authHeader}` },
      }
    );

    const transition = transitionsResponse.data.transitions.find(
      (t: any) => t.name.toLowerCase() === input.transition.toLowerCase()
    );

    if (!transition) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: `Transition "${input.transition}" not available`,
            availableTransitions: transitionsResponse.data.transitions.map((t: any) => t.name),
          }),
        }],
        isError: true,
      };
    }

    await axios.post(
      `${baseUrl}/issue/${input.issueKey}/transitions`,
      { transition: { id: transition.id } },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          issueKey: input.issueKey,
          transition: input.transition,
          message: `✓ Moved ${input.issueKey} to ${input.transition}`,
        }),
      }],
    };
  }

  private async addComment(
    baseUrl: string,
    authHeader: string,
    input: Record<string, any>
  ): Promise<CallToolResult> {
    const payload = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.comment }],
          },
        ],
      },
    };

    await axios.post(`${baseUrl}/issue/${input.issueKey}/comment`, payload, {
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          issueKey: input.issueKey,
          message: `✓ Added comment to ${input.issueKey}`,
        }),
      }],
    };
  }
}
