/**
 * AI Orchestrator - Multi-Model Coordination
 * 
 * Routes requests to multiple AI models simultaneously and merges/ranks results.
 * Supports Claude, GPT-4o, Gemini, Mistral, and Perplexity.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import MistralClient from '@mistralai/mistralai';
import axios from 'axios';
import { SecretManager } from '../secrets/secretManager.js';

export interface ModelResponse {
  modelId: string;
  displayName: string;
  content: string;
  durationMs: number;
  isWinner: boolean;
  confidence?: number;
  reasoning?: string;
}

export interface OrchestratedResult {
  id: string;
  prompt: string;
  modelResponses: ModelResponse[];
  winnerExplanation: string;
}

export class AIOrchestrator {
  private secretManager: SecretManager;
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private gemini?: GoogleGenerativeAI;
  private mistral?: MistralClient;

  constructor(secretManager: SecretManager) {
    this.secretManager = secretManager;
    this.initializeClients();
  }

  private async initializeClients(): Promise<void> {
    // Initialize AI clients with stored API keys
    const anthropicKey = await this.secretManager.getSecret('models.anthropic.apiKey');
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    const openaiKey = await this.secretManager.getSecret('models.openai.apiKey');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    const geminiKey = await this.secretManager.getSecret('models.gemini.apiKey');
    if (geminiKey) {
      this.gemini = new GoogleGenerativeAI(geminiKey);
    }

    const mistralKey = await this.secretManager.getSecret('models.mistral.apiKey');
    if (mistralKey) {
      this.mistral = new MistralClient(mistralKey);
    }
  }

  /**
   * Execute a prompt across multiple models in parallel (model race).
   */
  async executeParallel(prompt: string, context?: any): Promise<OrchestratedResult> {
    const enrichedPrompt = context 
      ? `CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nPROMPT:\n${prompt}`
      : prompt;

    const tasks: Promise<ModelResponse>[] = [];

    // Fire all model requests in parallel
    if (this.anthropic) {
      tasks.push(this.callClaude(enrichedPrompt));
    }
    if (this.openai) {
      tasks.push(this.callOpenAI(enrichedPrompt));
    }
    if (this.gemini) {
      tasks.push(this.callGemini(enrichedPrompt));
    }
    if (this.mistral) {
      tasks.push(this.callMistral(enrichedPrompt));
    }

    // Special: Use Perplexity for "trending" or "best practices" queries
    if (this.shouldUsePerplexity(prompt)) {
      tasks.push(this.callPerplexity(enrichedPrompt));
    }

    // Wait for all responses
    const responses = await Promise.allSettled(tasks);
    const modelResponses: ModelResponse[] = [];

    for (const result of responses) {
      if (result.status === 'fulfilled') {
        modelResponses.push(result.value);
      }
    }

    // If no models succeeded, return a fallback
    if (modelResponses.length === 0) {
      modelResponses.push({
        modelId: 'fallback',
        displayName: 'Fallback',
        content: 'No AI models are configured. Please add API keys in settings.',
        durationMs: 0,
        isWinner: true,
      });
    }

    // Pick winner based on fastest + best confidence
    const winner = this.selectWinner(modelResponses);
    
    return {
      id: `orchestrated-${Date.now()}`,
      prompt,
      modelResponses: modelResponses.map(r => ({
        ...r,
        isWinner: r.modelId === winner.modelId
      })),
      winnerExplanation: `${winner.displayName} selected (${winner.durationMs}ms, confidence: ${winner.confidence || 'N/A'})`,
    };
  }

  private async callClaude(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    
    const message = await this.anthropic!.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = message.content[0].type === 'text' ? message.content[0].text : '';

    return {
      modelId: 'claude-3.5-sonnet',
      displayName: 'Claude 3.5 Sonnet',
      content,
      durationMs: Date.now() - start,
      isWinner: false,
      confidence: 0.95,
    };
  }

  private async callOpenAI(prompt: string): Promise<ModelResponse> {
    const start = Date.now();

    const completion = await this.openai!.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: prompt,
      }],
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content || '';

    return {
      modelId: 'gpt-4o',
      displayName: 'GPT-4o',
      content,
      durationMs: Date.now() - start,
      isWinner: false,
      confidence: 0.92,
    };
  }

  private async callGemini(prompt: string): Promise<ModelResponse> {
    const start = Date.now();

    const model = this.gemini!.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const content = result.response.text();

    return {
      modelId: 'gemini-pro',
      displayName: 'Gemini Pro',
      content,
      durationMs: Date.now() - start,
      isWinner: false,
      confidence: 0.88,
    };
  }

  private async callMistral(prompt: string): Promise<ModelResponse> {
    const start = Date.now();

    const chatResponse = await this.mistral!.chat({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = chatResponse.choices?.[0]?.message?.content || '';

    return {
      modelId: 'mistral-small',
      displayName: 'Mistral',
      content,
      durationMs: Date.now() - start,
      isWinner: false,
      confidence: 0.85,
    };
  }

  private async callPerplexity(prompt: string): Promise<ModelResponse> {
    const start = Date.now();
    const perplexityKey = await this.secretManager.getSecret('models.perplexity.apiKey');

    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '';

    return {
      modelId: 'perplexity-sonar',
      displayName: 'Perplexity (Web Search)',
      content,
      durationMs: Date.now() - start,
      isWinner: false,
      confidence: 0.90,
      reasoning: 'Real-time web search for trending solutions',
    };
  }

  private shouldUsePerplexity(prompt: string): boolean {
    const keywords = ['trending', 'best practice', 'latest', '2025', '2026', 'current', 'modern'];
    const lowerPrompt = prompt.toLowerCase();
    return keywords.some(keyword => lowerPrompt.includes(keyword));
  }

  private selectWinner(responses: ModelResponse[]): ModelResponse {
    // Winner = best balance of speed and confidence
    return responses.sort((a, b) => {
      const scoreA = (a.confidence || 0.5) * 100 - (a.durationMs / 100);
      const scoreB = (b.confidence || 0.5) * 100 - (b.durationMs / 100);
      return scoreB - scoreA;
    })[0];
  }

  /**
   * Execute with a single preferred model (for simple tasks).
   */
  async executeSingle(prompt: string, modelId: string = 'claude-3.5-sonnet'): Promise<ModelResponse> {
    const start = Date.now();
    
    switch (modelId) {
      case 'claude-3.5-sonnet':
        return this.anthropic ? this.callClaude(prompt) : this.getFallbackResponse(start);
      case 'gpt-4o':
        return this.openai ? this.callOpenAI(prompt) : this.getFallbackResponse(start);
      case 'gemini-pro':
        return this.gemini ? this.callGemini(prompt) : this.getFallbackResponse(start);
      case 'mistral-small':
        return this.mistral ? this.callMistral(prompt) : this.getFallbackResponse(start);
      default:
        return this.getFallbackResponse(start);
    }
  }

  private getFallbackResponse(start: number): ModelResponse {
    return {
      modelId: 'fallback',
      displayName: 'Fallback',
      content: 'Model not configured. Please add API key in settings.',
      durationMs: Date.now() - start,
      isWinner: true,
    };
  }
}
