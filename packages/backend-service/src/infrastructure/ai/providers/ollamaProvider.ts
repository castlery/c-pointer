/**
 * Ollama AI 提供商实现
 * 
 * Ollama 是本地部署的大模型服务，支持多种开源模型。
 * API 文档: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import type { AIProviderInterface, CompletionOptions, CompletionResult, ChatMessage } from './baseProvider.js';
import type { AIConfig } from '../aiConfig.js';

export class OllamaProvider implements AIProviderInterface {
  readonly name = 'ollama';
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.error('[OllamaProvider] Service not available:', error);
      return false;
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('[OllamaProvider] Failed to list models:', error);
      return [];
    }
  }

  /**
   * 执行文本补全
   */
  async complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();
    
    console.log('[OllamaProvider] Starting completion...');
    console.log('  Model:', this.config.model);
    console.log('  Prompt length:', prompt.length);

    const requestBody = {
      model: this.config.model,
      prompt: options?.systemPrompt 
        ? `${options.systemPrompt}\n\n${prompt}`
        : prompt,
      stream: false,
      options: {
        temperature: options?.temperature ?? this.config.temperature,
        num_predict: options?.maxTokens ?? this.config.maxTokens,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('[OllamaProvider] Completion finished');
      console.log('  Duration:', duration, 'ms');
      console.log('  Response length:', data.response?.length || 0);

      return {
        content: data.response || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: data.model || this.config.model,
        finishReason: data.done ? 'stop' : 'unknown',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * 多轮对话
   */
  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult> {
    const startTime = Date.now();
    
    console.log('[OllamaProvider] Starting chat...');
    console.log('  Model:', this.config.model);
    console.log('  Messages:', messages.length);

    const requestBody = {
      model: this.config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options?.temperature ?? this.config.temperature,
        num_predict: options?.maxTokens ?? this.config.maxTokens,
      },
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('[OllamaProvider] Chat finished');
      console.log('  Duration:', duration, 'ms');
      console.log('  Response length:', data.message?.content?.length || 0);

      return {
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        model: data.model || this.config.model,
        finishReason: data.done ? 'stop' : 'unknown',
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }
}
