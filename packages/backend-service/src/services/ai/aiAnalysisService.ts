/**
 * AI 组件分析服务 - 并行分析版本
 */

import { aiConfig, validateAIConfig, getProviderDisplayName } from '../../infrastructure/ai/aiConfig.js';
import { createAIProvider, type AIProviderInterface } from '../../infrastructure/ai/providers/index.js';
import { buildSegmentPrompt, getTokenLimit, type AnalysisType } from './promptBuilder.js';
import type { AnalysisContext, AIAnalysisResult, ComponentAnalysisReport } from './types.js';

let aiProvider: AIProviderInterface | null = null;

/**
 * 初始化 AI 服务
 */
export async function initAIService(): Promise<boolean> {
  const validation = validateAIConfig(aiConfig);
  
  if (!validation.valid) {
    console.error('[AIAnalysisService] Invalid config:', validation.errors);
    return false;
  }

  if (!aiConfig.enabled) {
    console.log('[AIAnalysisService] AI analysis is disabled');
    return false;
  }

  try {
    aiProvider = createAIProvider(aiConfig);
    const available = await aiProvider.isAvailable();
    
    if (available) {
      console.log(`[AIAnalysisService] ✅ Initialized with ${getProviderDisplayName(aiConfig.provider)}`);
      return true;
    } else {
      console.error(`[AIAnalysisService] ❌ ${getProviderDisplayName(aiConfig.provider)} is not available`);
      return false;
    }
  } catch (error) {
    console.error('[AIAnalysisService] Failed to initialize:', error);
    return false;
  }
}

export function isAIServiceAvailable(): boolean {
  return aiProvider !== null && aiConfig.enabled;
}

/**
 * 执行单个分析任务
 */
async function analyzeSegment(
  context: AnalysisContext,
  type: AnalysisType
): Promise<string> {
  if (!aiProvider) {
    throw new Error('AI provider not initialized');
  }

  const prompt = buildSegmentPrompt(context, type);
  const maxTokens = getTokenLimit(type);

  const result = await aiProvider.complete(prompt, {
    temperature: 0.3,
    maxTokens,
  });

  // 清理响应，移除可能的 markdown 标记
  let content = result.content.trim();
  content = content.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
  
  return content;
}

/**
 * 并行分析组件源代码
 */
export async function analyzeComponentCode(
  context: AnalysisContext
): Promise<AIAnalysisResult> {
  const startTime = Date.now();

  console.log('\n🤖 [AI] Starting parallel analysis...');
  console.log('  Component:', context.componentName);

  if (!aiProvider) {
    const initialized = await initAIService();
    if (!initialized) {
      return {
        success: false,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'AI service not available' },
      };
    }
  }

  try {
    // 并行执行三个分析任务
    const [summary, businessLogic, interactions] = await Promise.all([
      analyzeSegment(context, 'summary').catch(e => `分析失败: ${e.message}`),
      analyzeSegment(context, 'business').catch(e => `分析失败: ${e.message}`),
      analyzeSegment(context, 'interaction').catch(e => `分析失败: ${e.message}`),
    ]);

    const duration = Date.now() - startTime;
    console.log('  ✅ Parallel analysis completed in', duration, 'ms');

    const report: ComponentAnalysisReport = {
      summary,
      businessLogic: {
        description: businessLogic,
        keyFunctions: [],
      },
      interactions: {
        userActions: [],
        flowDescription: interactions,
      },
      eventHandling: { events: [], summary: '' },
      stateFlow: { states: [], transitions: [] },
      suggestions: [],
      meta: {
        analyzedAt: new Date().toISOString(),
        model: aiConfig.model,
        language: context.language,
        duration,
      },
    };

    return { success: true, report };
  } catch (error) {
    console.error('  ❌ Analysis failed:', error);
    return {
      success: false,
      error: {
        code: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

export function getAIServiceStatus() {
  return {
    enabled: aiConfig.enabled,
    available: aiProvider !== null,
    provider: getProviderDisplayName(aiConfig.provider),
    model: aiConfig.model,
  };
}
