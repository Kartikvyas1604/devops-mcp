import * as vscode from 'vscode';

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: { text: string }[];
}

export interface GeminiResponse {
    candidates: {
        content: {
            parts: { text: string }[];
        };
    }[];
}

export class GeminiClient {
    private apiKey: string;
    private conversationHistory: GeminiMessage[] = [];

    constructor() {
        this.apiKey = this.getApiKey();
    }

    private getApiKey(): string {
        const config = vscode.workspace.getConfiguration('genieops');
        const apiKey = config.get<string>('googleApiKey', '');

        if (!apiKey || apiKey.trim() === '') {
            throw new Error('Gemini API key not configured. Please set it in Settings → GenieOps → Google API Key');
        }

        return apiKey;
    }

    async sendMessage(userMessage: string, systemPrompt?: string): Promise<string> {
        try {
            // Refresh API key in case it changed
            this.apiKey = this.getApiKey();

            // Build the conversation
            const messages: GeminiMessage[] = [];

            // Add system prompt as first user message if provided
            if (systemPrompt && this.conversationHistory.length === 0) {
                messages.push({
                    role: 'user',
                    parts: [{ text: systemPrompt }]
                });
                messages.push({
                    role: 'model',
                    parts: [{ text: 'I understand. I\'m GenieOps, your AI DevOps assistant. I\'ll help you with infrastructure, deployments, and automation tasks.' }]
                });
            }

            // Add conversation history
            messages.push(...this.conversationHistory);

            // Add current user message
            messages.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });

            // Call Gemini API
            const response = await this.callGeminiAPI(messages);

            // Update conversation history
            this.conversationHistory.push({
                role: 'user',
                parts: [{ text: userMessage }]
            });
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: response }]
            });

            // Keep only last 10 exchanges to avoid token limits
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            return response;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Gemini API error: ${error.message}`);
            }
            throw error;
        }
    }

    private async callGeminiAPI(messages: GeminiMessage[]): Promise<string> {
        // Use v1 API with gemini-1.5-pro-latest
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent?key=${this.apiKey}`;

        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch {
                errorMessage = errorText.substring(0, 200);
            }

            throw new Error(errorMessage);
        }

        const data = await response.json() as GeminiResponse;

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    }

    clearHistory(): void {
        this.conversationHistory = [];
    }
}
