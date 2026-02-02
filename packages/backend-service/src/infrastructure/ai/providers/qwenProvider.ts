/**
 * 阿里云 Qwen 大模型提供商
 * 使用 OpenAI 兼容接口
 */

import type { AIProviderInterface, CompletionOptions, CompletionResult, ChatMessage } from './baseProvider.js';
import type { AIConfig } from '../aiConfig.js';

export class QwenProvider implements AIProviderInterface {
  readonly name = 'qwen';
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  async listModels(): Promise<string[]> {
    return ['qwen-turbo', 'qwen-plus', 'qwen-max'];
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();
    
    console.log('[QwenProvider] Starting completion...');
    console.log('  Model:', this.config.model);

    const messages = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody = {
      model: this.config.model,
      messages,
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('[QwenProvider] Completion finished in', duration, 'ms');

      const content = data.choices?.[0]?.message?.content || '';
      
      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.config.model,
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Qwen request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * 多轮对话
   */
  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();
    
    console.log('[QwenProvider] Starting chat...');
    console.log('  Model:', this.config.model);
    console.log('  Messages:', messages.length);

    const requestBody = {
      model: this.config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Qwen API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('[QwenProvider] Chat finished in', duration, 'ms');

      const content = data.choices?.[0]?.message?.content || '';
      
      return {
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        model: data.model || this.config.model,
        finishReason: data.choices?.[0]?.finish_reason || 'stop',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Qwen request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }
}
