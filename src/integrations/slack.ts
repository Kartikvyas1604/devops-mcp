/**
 * Slack Integration
 * Comprehensive Slack client for notifications, messages, channels, and workflows
 */

import * as vscode from 'vscode';

// Slack types
export interface SlackChannel {
  id: string;
  name: string;
  isChannel: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  isMember: boolean;
  topic?: { value: string };
  purpose?: { value: string };
  numMembers?: number;
  created: number;
}

export interface SlackUser {
  id: string;
  name: string;
  realName: string;
  displayName: string;
  email?: string;
  isBot: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  deleted: boolean;
  profile: {
    title?: string;
    phone?: string;
    skype?: string;
    statusText?: string;
    statusEmoji?: string;
    image48?: string;
    image72?: string;
  };
}

export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  username?: string;
  botId?: string;
  type: string;
  subtype?: string;
  channel?: string;
  threadTs?: string;
  replyCount?: number;
  reactions?: Array<{ name: string; count: number; users: string[] }>;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
}

export interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  authorName?: string;
  authorLink?: string;
  authorIcon?: string;
  title?: string;
  titleLink?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  imageUrl?: string;
  thumbUrl?: string;
  footer?: string;
  footerIcon?: string;
  ts?: number;
}

export interface SlackBlock {
  type: string;
  blockId?: string;
  text?: { type: string; text: string; emoji?: boolean };
  accessory?: any;
  elements?: any[];
  fields?: any[];
}

export interface SlackMessageOptions {
  channel: string;
  text: string;
  threadTs?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  mrkdwn?: boolean;
  asUser?: boolean;
  iconEmoji?: string;
  iconUrl?: string;
  username?: string;
}

export interface SlackReaction {
  name: string;
  users: string[];
  count: number;
}

interface SlackConfig {
  token: string;
  defaultChannel?: string;
}

/**
 * Slack Integration Client
 * Provides comprehensive access to Slack workspace functionality
 */
export class SlackIntegration {
  private config: SlackConfig;
  private outputChannel: vscode.OutputChannel;
  private baseUrl = 'https://slack.com/api';

  constructor(config: SlackConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('DevOps Omnibus - Slack');
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  /**
   * Make API request to Slack
   */
  private async request<T>(
    method: string,
    data?: Record<string, any>
  ): Promise<T> {
    const url = `${this.baseUrl}/${method}`;
    this.log(`Request: ${method}`);

    // This would use fetch or axios in production
    // For now, simulate the structure
    throw new Error('Slack token not configured. Please set up Slack integration.');
  }

  // ============================================
  // Channel Operations
  // ============================================

  /**
   * List channels in workspace
   */
  async listChannels(options?: {
    excludeArchived?: boolean;
    types?: ('public_channel' | 'private_channel')[];
    limit?: number;
  }): Promise<SlackChannel[]> {
    const result = await this.request<{ channels: SlackChannel[] }>('conversations.list', {
      exclude_archived: options?.excludeArchived ?? true,
      types: options?.types?.join(',') || 'public_channel,private_channel',
      limit: options?.limit || 100,
    });

    return result.channels;
  }

  /**
   * Get channel information
   */
  async getChannel(channelId: string): Promise<SlackChannel> {
    const result = await this.request<{ channel: SlackChannel }>('conversations.info', {
      channel: channelId,
    });

    return result.channel;
  }

  /**
   * Create a channel
   */
  async createChannel(name: string, isPrivate = false): Promise<SlackChannel> {
    const result = await this.request<{ channel: SlackChannel }>('conversations.create', {
      name,
      is_private: isPrivate,
    });

    return result.channel;
  }

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<void> {
    await this.request('conversations.archive', { channel: channelId });
  }

  /**
   * Invite user to channel
   */
  async inviteToChannel(channelId: string, userIds: string[]): Promise<void> {
    await this.request('conversations.invite', {
      channel: channelId,
      users: userIds.join(','),
    });
  }

  /**
   * Set channel topic
   */
  async setChannelTopic(channelId: string, topic: string): Promise<void> {
    await this.request('conversations.setTopic', {
      channel: channelId,
      topic,
    });
  }

  /**
   * Set channel purpose
   */
  async setChannelPurpose(channelId: string, purpose: string): Promise<void> {
    await this.request('conversations.setPurpose', {
      channel: channelId,
      purpose,
    });
  }

  // ============================================
  // Message Operations
  // ============================================

  /**
   * Send a message
   */
  async sendMessage(options: SlackMessageOptions): Promise<SlackMessage> {
    const result = await this.request<{ message: SlackMessage }>('chat.postMessage', {
      channel: options.channel || this.config.defaultChannel,
      text: options.text,
      thread_ts: options.threadTs,
      attachments: options.attachments ? JSON.stringify(options.attachments) : undefined,
      blocks: options.blocks ? JSON.stringify(options.blocks) : undefined,
      unfurl_links: options.unfurlLinks,
      unfurl_media: options.unfurlMedia,
      mrkdwn: options.mrkdwn ?? true,
      as_user: options.asUser,
      icon_emoji: options.iconEmoji,
      icon_url: options.iconUrl,
      username: options.username,
    });

    return result.message;
  }

  /**
   * Send a simple notification
   */
  async notify(channel: string, text: string, color?: string): Promise<SlackMessage> {
    return this.sendMessage({
      channel,
      text: '',
      attachments: [{
        color: color || '#36a64f',
        text,
        ts: Math.floor(Date.now() / 1000),
      }],
    });
  }

  /**
   * Send deployment notification
   */
  async notifyDeployment(options: {
    channel: string;
    environment: string;
    service: string;
    version: string;
    status: 'started' | 'success' | 'failed';
    url?: string;
    message?: string;
    triggeredBy?: string;
  }): Promise<SlackMessage> {
    const colors = {
      started: '#3498db',
      success: '#2ecc71',
      failed: '#e74c3c',
    };

    const statusEmoji = {
      started: ':rocket:',
      success: ':white_check_mark:',
      failed: ':x:',
    };

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[options.status]} Deployment ${options.status.toUpperCase()}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Service:*\n${options.service}` },
          { type: 'mrkdwn', text: `*Version:*\n${options.version}` },
          { type: 'mrkdwn', text: `*Environment:*\n${options.environment}` },
          ...(options.triggeredBy ? [{ type: 'mrkdwn', text: `*Triggered by:*\n${options.triggeredBy}` }] : []),
        ],
      },
    ];

    if (options.message) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: options.message },
      });
    }

    if (options.url) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `<${options.url}|View Deployment>` },
      });
    }

    return this.sendMessage({
      channel: options.channel,
      text: `Deployment ${options.status}: ${options.service} v${options.version} to ${options.environment}`,
      blocks,
      attachments: [{ color: colors[options.status] }],
    });
  }

  /**
   * Send CI/CD pipeline notification
   */
  async notifyPipeline(options: {
    channel: string;
    pipelineName: string;
    status: 'running' | 'success' | 'failed' | 'cancelled';
    branch?: string;
    commit?: string;
    url?: string;
    duration?: string;
    stages?: Array<{ name: string; status: string }>;
  }): Promise<SlackMessage> {
    const colors = {
      running: '#3498db',
      success: '#2ecc71',
      failed: '#e74c3c',
      cancelled: '#95a5a6',
    };

    const statusEmoji = {
      running: ':arrows_counterclockwise:',
      success: ':white_check_mark:',
      failed: ':x:',
      cancelled: ':no_entry:',
    };

    const fields = [
      { type: 'mrkdwn', text: `*Pipeline:*\n${options.pipelineName}` },
      { type: 'mrkdwn', text: `*Status:*\n${statusEmoji[options.status]} ${options.status}` },
    ];

    if (options.branch) {
      fields.push({ type: 'mrkdwn', text: `*Branch:*\n\`${options.branch}\`` });
    }

    if (options.duration) {
      fields.push({ type: 'mrkdwn', text: `*Duration:*\n${options.duration}` });
    }

    const blocks: SlackBlock[] = [
      {
        type: 'section',
        fields,
      },
    ];

    if (options.stages && options.stages.length > 0) {
      const stageText = options.stages
        .map(s => {
          const emoji = s.status === 'success' ? ':white_check_mark:' 
            : s.status === 'failed' ? ':x:' 
            : s.status === 'running' ? ':hourglass:' 
            : ':white_circle:';
          return `${emoji} ${s.name}`;
        })
        .join(' → ');

      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: stageText }],
      });
    }

    if (options.url) {
      blocks.push({
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'View Pipeline', emoji: true },
          url: options.url,
        }],
      });
    }

    return this.sendMessage({
      channel: options.channel,
      text: `Pipeline ${options.pipelineName}: ${options.status}`,
      blocks,
      attachments: [{ color: colors[options.status] }],
    });
  }

  /**
   * Update a message
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    options?: {
      attachments?: SlackAttachment[];
      blocks?: SlackBlock[];
    }
  ): Promise<SlackMessage> {
    const result = await this.request<{ message: SlackMessage }>('chat.update', {
      channel,
      ts,
      text,
      attachments: options?.attachments ? JSON.stringify(options.attachments) : undefined,
      blocks: options?.blocks ? JSON.stringify(options.blocks) : undefined,
    });

    return result.message;
  }

  /**
   * Delete a message
   */
  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.request('chat.delete', { channel, ts });
  }

  /**
   * Get conversation history
   */
  async getMessages(
    channel: string,
    options?: {
      limit?: number;
      oldest?: string;
      latest?: string;
    }
  ): Promise<SlackMessage[]> {
    const result = await this.request<{ messages: SlackMessage[] }>('conversations.history', {
      channel,
      limit: options?.limit || 100,
      oldest: options?.oldest,
      latest: options?.latest,
    });

    return result.messages;
  }

  /**
   * Get thread replies
   */
  async getThreadReplies(channel: string, threadTs: string): Promise<SlackMessage[]> {
    const result = await this.request<{ messages: SlackMessage[] }>('conversations.replies', {
      channel,
      ts: threadTs,
    });

    return result.messages;
  }

  /**
   * Add reaction to message
   */
  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.request('reactions.add', {
      channel,
      timestamp: ts,
      name: emoji.replace(/:/g, ''),
    });
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.request('reactions.remove', {
      channel,
      timestamp: ts,
      name: emoji.replace(/:/g, ''),
    });
  }

  // ============================================
  // User Operations
  // ============================================

  /**
   * List users
   */
  async listUsers(options?: { limit?: number }): Promise<SlackUser[]> {
    const result = await this.request<{ members: SlackUser[] }>('users.list', {
      limit: options?.limit || 100,
    });

    return result.members;
  }

  /**
   * Get user info
   */
  async getUser(userId: string): Promise<SlackUser> {
    const result = await this.request<{ user: SlackUser }>('users.info', {
      user: userId,
    });

    return result.user;
  }

  /**
   * Look up user by email
   */
  async getUserByEmail(email: string): Promise<SlackUser> {
    const result = await this.request<{ user: SlackUser }>('users.lookupByEmail', {
      email,
    });

    return result.user;
  }

  // ============================================
  // File Operations
  // ============================================

  /**
   * Upload a file
   */
  async uploadFile(options: {
    channels: string[];
    content?: string;
    filename?: string;
    filetype?: string;
    title?: string;
    initialComment?: string;
    threadTs?: string;
  }): Promise<{ id: string; url: string }> {
    const result = await this.request<{ file: { id: string; permalink: string } }>('files.upload', {
      channels: options.channels.join(','),
      content: options.content,
      filename: options.filename,
      filetype: options.filetype,
      title: options.title,
      initial_comment: options.initialComment,
      thread_ts: options.threadTs,
    });

    return {
      id: result.file.id,
      url: result.file.permalink,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Build a message with blocks (Block Kit Builder helper)
   */
  buildBlocks(): BlockKitBuilder {
    return new BlockKitBuilder();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

/**
 * Block Kit Builder for constructing Slack messages
 */
export class BlockKitBuilder {
  private blocks: SlackBlock[] = [];

  /**
   * Add a header block
   */
  header(text: string): this {
    this.blocks.push({
      type: 'header',
      text: { type: 'plain_text', text, emoji: true },
    });
    return this;
  }

  /**
   * Add a section with text
   */
  section(text: string): this {
    this.blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text },
    });
    return this;
  }

  /**
   * Add a section with fields
   */
  fields(fields: Array<{ title: string; value: string }>): this {
    this.blocks.push({
      type: 'section',
      fields: fields.map(f => ({
        type: 'mrkdwn',
        text: `*${f.title}:*\n${f.value}`,
      })),
    });
    return this;
  }

  /**
   * Add a divider
   */
  divider(): this {
    this.blocks.push({ type: 'divider' });
    return this;
  }

  /**
   * Add context block
   */
  context(elements: string[]): this {
    this.blocks.push({
      type: 'context',
      elements: elements.map(text => ({ type: 'mrkdwn', text })),
    });
    return this;
  }

  /**
   * Add action buttons
   */
  actions(buttons: Array<{ text: string; url?: string; actionId?: string; style?: 'primary' | 'danger' }>): this {
    this.blocks.push({
      type: 'actions',
      elements: buttons.map(btn => ({
        type: 'button',
        text: { type: 'plain_text', text: btn.text, emoji: true },
        url: btn.url,
        action_id: btn.actionId,
        style: btn.style,
      })),
    });
    return this;
  }

  /**
   * Add image block
   */
  image(url: string, altText: string, title?: string): this {
    this.blocks.push({
      type: 'image',
      image_url: url,
      alt_text: altText,
      title: title ? { type: 'plain_text', text: title } : undefined,
    } as any);
    return this;
  }

  /**
   * Build and return the blocks
   */
  build(): SlackBlock[] {
    return this.blocks;
  }
}
