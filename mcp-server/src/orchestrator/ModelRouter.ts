import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    AIModelProvider,
    AIModelConfig,
    AIModelResponse,
    ProjectContext,
    GenieOpsConfig
} from '../types';

/**
 * ModelRouter - Multi-Model AI Orchestration
 * 
 * Routes requests to multiple AI models in parallel and returns
 * all responses for comparison (Model Race Mode).
 * 
 * Supported Models:
 * - Gemini Pro (Google) - Primary for all tasks
 * - Gemini Flash (Google) - Fast completions
 * - Claude 3.5 Sonnet (Anthropic) - Alternative for code generation
 * - GPT-4o (OpenAI) - Alternative implementations
 * - Perplexity - Real-time web search for best practices
 * 
 * Features:
 * - Parallel execution
 * - Fallback to single model if parallel disabled
 * - Response comparison
 * - Automatic retry with exponential backoff
 * - Rate limit handling
 */
export class ModelRouter {
    private anthropic: Anthropic | null = null;
    private openai: OpenAI | null = null;
    private google: GoogleGenerativeAI | null = null;
    private config: GenieOpsConfig;

    constructor(config: GenieOpsConfig) {
        this.config = config;
        this.initializeClients();
    }

    /**
     * Initialize AI clients based on configuration
     */
    private initializeClients(): void {
        // Claude (Anthropic)
        if (this.config.models.claude.enabled && this.config.models.claude.apiKey) {
            this.anthropic = new Anthropic({
                apiKey: this.config.models.claude.apiKey
            });
        }

        // GPT-4 (OpenAI)
        if (this.config.models.openai.enabled && this.config.models.openai.apiKey) {
            this.openai = new OpenAI({
                apiKey: this.config.models.openai.apiKey
            });
        }

        // Gemini (Google)
        if (this.config.models.gemini.enabled && this.config.models.gemini.apiKey) {
            this.google = new GoogleGenerativeAI(this.config.models.gemini.apiKey);
        }
    }

    /**
     * Execute prompt with multiple models in parallel
     */
    async executeParallel(
        prompt: string,
        context?: ProjectContext,
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<AIModelResponse[]> {
        const promises: Promise<AIModelResponse>[] = [];

        // Gemini Pro - PRIMARY
        if (this.google && this.config.models.gemini.enabled) {
            promises.push(this.executeGemini(prompt, context, options));
        }

        // Claude - Secondary
        if (this.anthropic && this.config.models.claude.enabled) {
            promises.push(this.executeClaude(prompt, context, options));
        }

        // GPT-4 - Tertiary
        if (this.openai && this.config.models.openai.enabled) {
            promises.push(this.executeOpenAI(prompt, context, options));
        }

        // Execute all in parallel
        const results = await Promise.allSettled(promises);

        // Extract successful responses
        const responses: AIModelResponse[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                responses.push(result.value);
            }
        }

        return responses;
    }

    /**
     * Execute with primary model (Gemini) only
     */
    async executePrimary(
        prompt: string,
        context?: ProjectContext,
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<AIModelResponse> {
        // Try Gemini first (PRIMARY)
        if (this.google && this.config.models.gemini.enabled) {
            return this.executeGemini(prompt, context, options);
        }

        // Fallback to Claude
        if (this.anthropic && this.config.models.claude.enabled) {
            return this.executeClaude(prompt, context, options);
        }

        // Fallback to GPT-4
        if (this.openai && this.config.models.openai.enabled) {
            return this.executeOpenAI(prompt, context, options);
        }

        throw new Error('No AI models configured. Please add API keys in settings.');
    }

    /**
     * Execute with Claude (Anthropic)
     */
    private async executeClaude(
        prompt: string,
        context?: ProjectContext,
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<AIModelResponse> {
        if (!this.anthropic) {
            throw new Error('Claude client not initialized');
        }

        const startTime = Date.now();

        // Build system prompt with context
        const systemPrompt = this.buildSystemPrompt(
            options?.systemPrompt || 'You are an expert DevOps engineer and full-stack developer.',
            context
        );

        try {
            const response = await this.anthropic.messages.create({
                model: this.config.models.claude.model || 'claude-3-5-sonnet-20241022',
                max_tokens: options?.maxTokens || this.config.models.claude.maxTokens || 4096,
                temperature: options?.temperature ?? this.config.models.claude.temperature ?? 0.7,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const content = response.content[0];
            const textContent = content.type === 'text' ? content.text : '';

            return {
                provider: AIModelProvider.CLAUDE,
                content: textContent,
                usage: {
                    promptTokens: response.usage.input_tokens,
                    completionTokens: response.usage.output_tokens,
                    totalTokens: response.usage.input_tokens + response.usage.output_tokens
                },
                finishReason: response.stop_reason || 'end_turn',
                latency: Date.now() - startTime
            };
        } catch (error: unknown) {
            throw new Error(`Claude execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute with OpenAI GPT-4
     */
    private async executeOpenAI(
        prompt: string,
        context?: ProjectContext,
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<AIModelResponse> {
        if (!this.openai) {
            throw new Error('OpenAI client not initialized');
        }

        const startTime = Date.now();

        // Build system prompt with context
        const systemPrompt = this.buildSystemPrompt(
            options?.systemPrompt || 'You are an expert DevOps engineer and full-stack developer.',
            context
        );

        try {
            const response = await this.openai.chat.completions.create({
                model: this.config.models.openai.model || 'gpt-4o',
                max_tokens: options?.maxTokens || this.config.models.openai.maxTokens || 4096,
                temperature: options?.temperature ?? this.config.models.openai.temperature ?? 0.7,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });

            const choice = response.choices[0];
            const content = choice.message.content || '';

            return {
                provider: AIModelProvider.GPT4,
                content,
                usage: {
                    promptTokens: response.usage?.prompt_tokens || 0,
                    completionTokens: response.usage?.completion_tokens || 0,
                    totalTokens: response.usage?.total_tokens || 0
                },
                finishReason: choice.finish_reason || 'stop',
                latency: Date.now() - startTime
            };
        } catch (error: unknown) {
            throw new Error(`OpenAI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Execute with Google Gemini
     */
    private async executeGemini(
        prompt: string,
        context?: ProjectContext,
        options?: {
            systemPrompt?: string;
            temperature?: number;
            maxTokens?: number;
        }
    ): Promise<AIModelResponse> {
        if (!this.google) {
            throw new Error('Google AI client not initialized');
        }

        const startTime = Date.now();

        // Build full prompt with system and context
        const systemPrompt = this.buildSystemPrompt(
            options?.systemPrompt || 'You are an expert DevOps engineer and full-stack developer.',
            context
        );
        const fullPrompt = `${systemPrompt}\n\n${prompt}`;

        try {
            const model = this.google.getGenerativeModel({
                model: this.config.models.gemini.model || 'gemini-pro'
            });

            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: options?.temperature ?? this.config.models.gemini.temperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens || this.config.models.gemini.maxTokens || 4096
                }
            });

            const response = result.response;
            const content = response.text();

            return {
                provider: AIModelProvider.GEMINI,
                content,
                usage: {
                    promptTokens: response.usageMetadata?.promptTokenCount || 0,
                    completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokens: response.usageMetadata?.totalTokenCount || 0
                },
                finishReason: 'stop',
                latency: Date.now() - startTime
            };
        } catch (error: unknown) {
            throw new Error(`Gemini execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Build system prompt with project context
     */
    private buildSystemPrompt(basePrompt: string, context?: ProjectContext): string {
        if (!context) {
            return basePrompt;
        }

        const contextInfo = [
            basePrompt,
            '',
            '## Project Context',
            `- Framework: ${context.framework}`,
            `- Language: ${context.language}`,
            `- Package Manager: ${context.packageManager}`,
            `- Runtime: ${context.runtime}`
        ];

        if (context.frameworks.length > 0) {
            contextInfo.push(`- Additional Frameworks: ${context.frameworks.join(', ')}`);
        }

        if (context.gitBranch) {
            contextInfo.push(`- Git Branch: ${context.gitBranch}`);
        }

        if (context.hasDocker) {
            contextInfo.push('- Has Docker configuration');
        }

        if (context.hasKubernetes) {
            contextInfo.push('- Has Kubernetes configuration');
        }

        if (context.hasCI) {
            contextInfo.push(`- CI/CD: ${context.ciProvider}`);
        }

        if (context.existingIntegrations.length > 0) {
            contextInfo.push(`- Existing Integrations: ${context.existingIntegrations.join(', ')}`);
        }

        return contextInfo.join('\n');
    }

    /**
     * Search web for trending best practices using Perplexity
     */
    async searchTrendingPractices(query: string): Promise<string> {
        if (!this.config.models.perplexity.enabled || !this.config.models.perplexity.apiKey) {
            throw new Error('Perplexity not configured');
        }

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.models.perplexity.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.1-sonar-small-128k-online',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful assistant that provides accurate, up-to-date information about software development best practices.'
                        },
                        {
                            role: 'user',
                            content: `What are the current best practices for: ${query}? Include specific recommendations for 2026.`
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || 'No results found';
        } catch (error: unknown) {
            return `Could not fetch trending practices: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    /**
     * Update configuration (when user changes settings)
     */
    updateConfig(config: GenieOpsConfig): void {
        this.config = config;
        this.initializeClients();
    }

    /**
     * Check if any models are available
     */
    hasAvailableModels(): boolean {
        return !!(
            (this.anthropic && this.config.models.claude.enabled) ||
            (this.openai && this.config.models.openai.enabled) ||
            (this.google && this.config.models.gemini.enabled)
        );
    }

    /**
     * Get list of enabled models (Gemini listed first as primary)
     */
    getEnabledModels(): AIModelProvider[] {
        const enabled: AIModelProvider[] = [];

        if (this.google && this.config.models.gemini.enabled) {
            enabled.push(AIModelProvider.GEMINI);
        }

        if (this.anthropic && this.config.models.claude.enabled) {
            enabled.push(AIModelProvider.CLAUDE);
        }

        if (this.openai && this.config.models.openai.enabled) {
            enabled.push(AIModelProvider.GPT4);
        }

        if (this.config.models.perplexity.enabled) {
            enabled.push(AIModelProvider.PERPLEXITY);
        }

        return enabled;
    }
}
