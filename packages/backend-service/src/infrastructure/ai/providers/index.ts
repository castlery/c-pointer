/**
 * AI 提供商工厂
 * 
 * 根据配置创建对应的 AI 提供商实例
 */

import type { AIProviderInterface } from './baseProvider.js';
import type { AIConfig, AIProvider } from '../aiConfig.js';
import { OllamaProvider } from './ollamaProvider.js';
import { QwenProvider } from './qwenProvider.js';

export { type AIProviderInterface, type CompletionOptions, type CompletionResult } from './baseProvider.js';
export { OllamaProvider } from './ollamaProvider.js';
export { QwenProvider } from './qwenProvider.js';

/**
 * 创建 AI 提供商实例
 */
export function createAIProvider(config: AIConfig): AIProviderInterface {
  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider(config);
    
    case 'qwen':
      return new QwenProvider(config);
    
    case 'openai':
      // OpenAI 兼容接口，可以复用 Qwen Provider
      return new QwenProvider(config);
    
    case 'gemini':
      throw new Error('Gemini provider not implemented yet');
    
    case 'cloudflare':
      throw new Error('Cloudflare provider not implemented yet');
    
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

/**
 * 获取支持的提供商列表
 */
export function getSupportedProviders(): AIProvider[] {
  return ['ollama', 'qwen', 'openai', 'gemini', 'cloudflare'];
}
