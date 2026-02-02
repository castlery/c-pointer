/**
 * AI 服务配置模块
 * 
 * 支持多个 AI 提供商：
 * - Ollama（本地部署，默认）
 * - OpenAI
 * - Google Gemini
 * - Cloudflare AI
 */

export type AIProvider = 'ollama' | 'openai' | 'gemini' | 'cloudflare' | 'qwen';

export interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  enabled: boolean;
  language: 'zh' | 'en';
}

// 默认配置
const defaultConfigs: Record<AIProvider, Partial<AIConfig>> = {
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5-coder:7b',
    maxTokens: 4096,
    temperature: 0.3,
    timeout: 60000,
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
    maxTokens: 4096,
    temperature: 0.3,
    timeout: 30000,
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-pro',
    maxTokens: 4096,
    temperature: 0.3,
    timeout: 30000,
  },
  cloudflare: {
    baseUrl: 'https://api.cloudflare.com/client/v4/accounts',
    model: '@cf/meta/llama-2-7b-chat-int8',
    maxTokens: 2048,
    temperature: 0.3,
    timeout: 30000,
  },
  qwen: {
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-turbo',
    maxTokens: 2048,
    temperature: 0.3,
    timeout: 30000,
  },
};

/**
 * 从环境变量加载 AI 配置
 */
export function loadAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'ollama') as AIProvider;
  const defaults = defaultConfigs[provider] || defaultConfigs.ollama;

  return {
    provider,
    baseUrl: process.env.AI_BASE_URL || defaults.baseUrl!,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || defaults.model!,
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || String(defaults.maxTokens), 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || String(defaults.temperature)),
    timeout: parseInt(process.env.AI_TIMEOUT || String(defaults.timeout), 10),
    enabled: process.env.AI_ENABLED !== 'false',
    language: (process.env.AI_LANGUAGE || 'zh') as 'zh' | 'en',
  };
}

// 导出单例配置
export const aiConfig = loadAIConfig();

/**
 * 验证 AI 配置
 */
export function validateAIConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push('AI_BASE_URL is required');
  }

  if (!config.model) {
    errors.push('AI_MODEL is required');
  }

  if (config.provider !== 'ollama' && !config.apiKey) {
    errors.push(`AI_API_KEY is required for provider: ${config.provider}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取提供商显示名称
 */
export function getProviderDisplayName(provider: AIProvider): string {
  const names: Record<AIProvider, string> = {
    ollama: 'Ollama (Local)',
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    cloudflare: 'Cloudflare AI',
    qwen: 'Qwen (阿里云)',
  };
  return names[provider] || provider;
}
