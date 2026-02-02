/**
 * 对话式组件分析服务
 * 
 * 支持用户与 AI 进行多轮对话，深入了解组件细节
 */

import { logger } from '../../infrastructure/logging/logger.js';
import { createAIProvider } from '../../infrastructure/ai/providers/index.js';
import { aiConfig } from '../../infrastructure/ai/aiConfig.js';
import { buildChatPrompt, buildDefaultAnalysisPrompt } from './promptBuilder.js';

// Token 限制配置
const TOKEN_LIMITS = {
  'qwen-turbo': 8000,
  'qwen-plus': 32000,
  'qwen-max': 32000,
};

const DEFAULT_TOKEN_LIMIT = 8000;

// 估算 token 数（简单估算：中文约 2 字符/token，英文约 4 字符/token）
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

interface ChatRequest {
  question: string;
  component: {
    name: string;
    filePath: string;
    code: string;
  };
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface ChatResponse {
  success: boolean;
  answer?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}

/**
 * 对话式组件分析
 */
export async function chatWithComponent(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();
  const { question, component, history } = request;
  
  try {
    const provider = createAIProvider(aiConfig);
    const modelName = aiConfig.model || 'qwen-turbo';
    const tokenLimit = TOKEN_LIMITS[modelName as keyof typeof TOKEN_LIMITS] || DEFAULT_TOKEN_LIMIT;
    
    // 构建系统提示词
    const systemPrompt = buildSystemPrompt();
    
    // 构建组件上下文
    const componentContext = buildComponentContext(component);
    
    // 构建历史对话上下文
    const historyContext = buildHistoryContext(history);
    
    // 构建用户问题
    const userQuestion = question.trim() 
      ? question 
      : buildDefaultAnalysisPrompt(component.name);
    
    // 估算 token 使用量
    const estimatedTokens = estimateTokens(systemPrompt + componentContext + historyContext + userQuestion);
    
    // 检查是否超出限制
    if (estimatedTokens > tokenLimit * 0.9) {
      logger.warn('Token limit approaching', { 
        estimated: estimatedTokens, 
        limit: tokenLimit,
        component: component.name 
      });
      
      // 如果超出限制，返回警告
      if (estimatedTokens > tokenLimit) {
        return {
          success: false,
          error: '对话上下文已超出限制，请点击组件标签的关闭按钮，重新选择组件开始新对话。',
        };
      }
    }
    
    // 构建完整的消息列表
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: componentContext },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: userQuestion },
    ];
    
    logger.info('Sending chat request to AI', {
      component: component.name,
      question: userQuestion.substring(0, 100),
      historyLength: history.length,
      estimatedTokens,
    });
    
    // 调用 AI
    const response = await provider.chat(messages);
    
    const duration = Date.now() - startTime;
    
    logger.info('Chat response received', {
      component: component.name,
      answerLength: response.content?.length || 0,
      duration: `${duration}ms`,
    });
    
    return {
      success: true,
      answer: response.content,
      tokenUsage: {
        prompt: estimatedTokens,
        completion: estimateTokens(response.content || ''),
        total: estimatedTokens + estimateTokens(response.content || ''),
      },
    };
  } catch (error) {
    logger.error('Chat error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      component: component.name,
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '分析失败，请重试',
    };
  }
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(): string {
  return `你是一位专业的前端组件分析助手，专门帮助产品经理、测试人员和业务人员理解 React 组件的功能和行为。

你的回答应该：
1. 使用简洁易懂的中文
2. 避免使用技术术语和代码变量名
3. 重点说明组件的业务功能和用户交互
4. 使用 Markdown 格式，条理清晰
5. 如果用户的问题与组件无关，礼貌地引导回组件分析

请记住：你的目标用户不是开发人员，而是需要理解组件功能的业务人员。`;
}

/**
 * 构建组件上下文
 */
function buildComponentContext(component: { name: string; filePath: string; code: string }): string {
  let context = `## 当前分析的组件\n\n`;
  context += `**组件名称**: ${component.name}\n`;
  
  if (component.filePath) {
    context += `**文件路径**: ${component.filePath}\n`;
  }
  
  if (component.code) {
    // 截断过长的代码
    const maxCodeLength = 4000;
    const code = component.code.length > maxCodeLength 
      ? component.code.substring(0, maxCodeLength) + '\n\n... (代码已截断)'
      : component.code;
    
    context += `\n**组件源代码**:\n\`\`\`tsx\n${code}\n\`\`\`\n`;
  }
  
  return context;
}

/**
 * 构建历史对话上下文
 */
function buildHistoryContext(history: Array<{ role: string; content: string }>): string {
  if (history.length === 0) return '';
  
  // 只保留最近 5 轮对话
  const recentHistory = history.slice(-10);
  
  return recentHistory.map(h => {
    const prefix = h.role === 'user' ? '用户' : 'AI';
    return `${prefix}: ${h.content}`;
  }).join('\n\n');
}
