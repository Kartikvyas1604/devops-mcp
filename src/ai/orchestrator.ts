/**
 * AI Orchestrator - Multi-model AI execution engine
 * 
 * Supports multiple AI providers:
 * - Anthropic Claude (default)
 * - OpenAI GPT
 * - Google Gemini
 * - Mistral
 * - Local models via Ollama
 */

import Anthropic from '@anthropic-ai/sdk';
import * as vscode from 'vscode';
import { ConfigService } from '../services/configService';
import { SecretsService } from '../services/secretsService';
import { LoggingService } from '../services/loggingService';

export type AIProvider = 'anthropic' | 'openai' | 'google' | 'mistral' | 'ollama';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AITool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  toolCalls?: AIToolCall[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface OrchestratorOptions {
  provider?: AIProvider;
  model?: string;
  systemPrompt?: string;
  tools?: AITool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  onToken?: (token: string) => void;
}

const DEFAULT_SYSTEM_PROMPT = `You are DevOps Omnibus, an expert AI assistant for DevOps, cloud infrastructure, and developer automation. You help developers with:

- Docker and container management
- CI/CD pipeline configuration
- Cloud deployments (AWS, GCP, Azure)
- Kubernetes orchestration
- Infrastructure as Code (Terraform, CloudFormation)
- Git operations and workflows
- Monitoring and observability

When using tools, always explain what you're doing and why. Provide clear, actionable guidance.
If a task requires multiple steps, break it down and explain each step.
Always prioritize security best practices and production-ready configurations.`;

const MODEL_CONFIGS: Record<AIProvider, { defaultModel: string; models: string[] }> = {
  anthropic: {
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']
  },
  openai: {
    defaultModel: 'gpt-4-turbo-preview',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo']
  },
  google: {
    defaultModel: 'gemini-pro',
    models: ['gemini-pro', 'gemini-pro-vision']
  },
  mistral: {
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest']
  },
  ollama: {
    defaultModel: 'llama2',
    models: ['llama2', 'codellama', 'mistral']
  }
};

export class AIOrchestrator {
  private anthropicClient: Anthropic | null = null;
  private configService: ConfigService;
  private secretsService: SecretsService;
  private logger: LoggingService;

  constructor(
    context: vscode.ExtensionContext,
    configService: ConfigService,
    secretsService: SecretsService,
    logger: LoggingService
  ) {
    this.configService = configService;
    this.secretsService = secretsService;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    // Initialize default provider (Anthropic)
    const anthropicKey = await this.secretsService.getCredentials('anthropic');
    if (anthropicKey?.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: anthropicKey.apiKey
      });
      this.logger.info('AI Orchestrator initialized with Anthropic');
    }
  }

  async execute(
    messages: AIMessage[],
    options: OrchestratorOptions = {}
  ): Promise<AIResponse> {
    const provider = options.provider || this.getDefaultProvider();
    const model = options.model || MODEL_CONFIGS[provider].defaultModel;

    this.logger.debug(`AI request: provider=${provider}, model=${model}`);

    switch (provider) {
      case 'anthropic':
        return this.executeAnthropic(messages, { ...options, model });
      case 'openai':
        return this.executeOpenAI(messages, { ...options, model });
      case 'google':
        return this.executeGoogle(messages, { ...options, model });
      case 'mistral':
        return this.executeMistral(messages, { ...options, model });
      case 'ollama':
        return this.executeOllama(messages, { ...options, model });
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  async executeWithTools(
    userMessage: string,
    tools: AITool[],
    options: OrchestratorOptions = {}
  ): Promise<AIResponse> {
    const messages: AIMessage[] = [
      { role: 'user', content: userMessage }
    ];

    return this.execute(messages, {
      ...options,
      tools,
      systemPrompt: options.systemPrompt || DEFAULT_SYSTEM_PROMPT
    });
  }

  async stream(
    messages: AIMessage[],
    options: OrchestratorOptions & { onToken: (token: string) => void }
  ): Promise<AIResponse> {
    return this.execute(messages, { ...options, stream: true });
  }

  private getDefaultProvider(): AIProvider {
    return this.configService.get('ai.defaultProvider') as AIProvider || 'anthropic';
  }

  private async executeAnthropic(
    messages: AIMessage[],
    options: OrchestratorOptions & { model: string }
  ): Promise<AIResponse> {
    if (!this.anthropicClient) {
      const apiKey = await this.secretsService.getCredentials('anthropic');
      if (!apiKey?.apiKey) {
        throw new Error('Anthropic API key not configured. Use "DevOps Omnibus: Configure AI" to set it up.');
      }
      this.anthropicClient = new Anthropic({ apiKey: apiKey.apiKey });
    }

    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const anthropicMessages = userMessages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }));

    try {
      if (options.stream && options.onToken) {
        // Streaming response
        let fullContent = '';
        let usage = { inputTokens: 0, outputTokens: 0 };

        const stream = await this.anthropicClient.messages.stream({
          model: options.model,
          max_tokens: options.maxTokens || 4096,
          system: systemPrompt,
          messages: anthropicMessages,
          temperature: options.temperature,
          tools: options.tools?.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as Anthropic.Tool.InputSchema
          }))
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if ('text' in delta) {
              fullContent += delta.text;
              options.onToken(delta.text);
            }
          }
        }

        const finalMessage = await stream.finalMessage();
        usage = {
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens
        };

        return {
          content: fullContent,
          usage,
          model: options.model,
          provider: 'anthropic'
        };
      } else {
        // Non-streaming response
        const response = await this.anthropicClient.messages.create({
          model: options.model,
          max_tokens: options.maxTokens || 4096,
          system: systemPrompt,
          messages: anthropicMessages,
          temperature: options.temperature,
          tools: options.tools?.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as Anthropic.Tool.InputSchema
          }))
        });

        // Extract content and tool calls
        let textContent = '';
        const toolCalls: AIToolCall[] = [];

        for (const block of response.content) {
          if (block.type === 'text') {
            textContent += block.text;
          } else if (block.type === 'tool_use') {
            toolCalls.push({
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>
            });
          }
        }

        return {
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens
          },
          model: options.model,
          provider: 'anthropic'
        };
      }
    } catch (error) {
      this.logger.error('Anthropic API error', error);
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeOpenAI(
    messages: AIMessage[],
    options: OrchestratorOptions & { model: string }
  ): Promise<AIResponse> {
    const apiKey = await this.secretsService.getCredentials('openai');
    if (!apiKey?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const openAIMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    ];

    // Dynamic import to avoid bundling issues
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: apiKey.apiKey });

    try {
      const response = await client.chat.completions.create({
        model: options.model,
        messages: openAIMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        tools: options.tools?.map(t => ({
          type: 'function' as const,
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        })),
        stream: false
      });

      const choice = response.choices[0];
      const toolCalls: AIToolCall[] = [];

      if (choice.message.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments)
          });
        }
      }

      return {
        content: choice.message.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0
        },
        model: options.model,
        provider: 'openai'
      };
    } catch (error) {
      this.logger.error('OpenAI API error', error);
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeGoogle(
    messages: AIMessage[],
    options: OrchestratorOptions & { model: string }
  ): Promise<AIResponse> {
    const apiKey = await this.secretsService.getCredentials('google');
    if (!apiKey?.apiKey) {
      throw new Error('Google API key not configured');
    }

    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    // Use Google's Generative AI API
    const url = `https://generativelanguage.googleapis.com/v1/models/${options.model}:generateContent?key=${apiKey.apiKey}`;
    
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            maxOutputTokens: options.maxTokens || 4096,
            temperature: options.temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        candidates: Array<{
          content: { parts: Array<{ text: string }> }
        }>;
        usageMetadata?: {
          promptTokenCount: number;
          candidatesTokenCount: number;
        };
      };

      return {
        content: data.candidates[0]?.content.parts[0]?.text || '',
        usage: {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0
        },
        model: options.model,
        provider: 'google'
      };
    } catch (error) {
      this.logger.error('Google API error', error);
      throw new Error(`Google API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeMistral(
    messages: AIMessage[],
    options: OrchestratorOptions & { model: string }
  ): Promise<AIResponse> {
    const apiKey = await this.secretsService.getCredentials('mistral');
    if (!apiKey?.apiKey) {
      throw new Error('Mistral API key not configured');
    }

    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const mistralMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content
      }))
    ];

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.apiKey}`
        },
        body: JSON.stringify({
          model: options.model,
          messages: mistralMessages,
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature,
          tools: options.tools?.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.input_schema
            }
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        choices: Array<{
          message: {
            content: string;
            tool_calls?: Array<{
              id: string;
              function: { name: string; arguments: string };
            }>;
          };
        }>;
        usage: { prompt_tokens: number; completion_tokens: number };
      };

      const choice = data.choices[0];
      const toolCalls: AIToolCall[] = [];

      if (choice.message.tool_calls) {
        for (const tc of choice.message.tool_calls) {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments)
          });
        }
      }

      return {
        content: choice.message.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens
        },
        model: options.model,
        provider: 'mistral'
      };
    } catch (error) {
      this.logger.error('Mistral API error', error);
      throw new Error(`Mistral API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeOllama(
    messages: AIMessage[],
    options: OrchestratorOptions & { model: string }
  ): Promise<AIResponse> {
    const ollamaUrl = this.configService.get('ai.ollamaUrl') as string || 'http://localhost:11434';
    const systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const ollamaMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          messages: ollamaMessages,
          stream: false,
          options: {
            num_predict: options.maxTokens || 4096,
            temperature: options.temperature
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as {
        message: { content: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };

      return {
        content: data.message.content,
        usage: {
          inputTokens: data.prompt_eval_count || 0,
          outputTokens: data.eval_count || 0
        },
        model: options.model,
        provider: 'ollama'
      };
    } catch (error) {
      this.logger.error('Ollama API error', error);
      throw new Error(`Ollama API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getAvailableModels(provider: AIProvider): string[] {
    return MODEL_CONFIGS[provider]?.models || [];
  }

  getDefaultModel(provider: AIProvider): string {
    return MODEL_CONFIGS[provider]?.defaultModel || '';
  }

  getAllProviders(): AIProvider[] {
    return Object.keys(MODEL_CONFIGS) as AIProvider[];
  }
}
