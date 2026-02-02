/**
 * AI 提供商基础接口
 */

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface CompletionResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderInterface {
  /**
   * 提供商名称
   */
  readonly name: string;

  /**
   * 检查提供商是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 执行文本补全
   */
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;

  /**
   * 执行多轮对话
   */
  chat(messages: ChatMessage[], options?: CompletionOptions): Promise<CompletionResult>;

  /**
   * 获取可用模型列表
   */
  listModels?(): Promise<string[]>;
}
