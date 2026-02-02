/**
 * AI 分析结果解析器
 * 
 * 负责解析 AI 返回的 JSON 结果并验证结构
 */

import type { ComponentAnalysisReport } from './types.js';

/**
 * 解析 AI 响应
 */
export function parseAIResponse(
  response: string,
  model: string,
  language: 'zh' | 'en'
): ComponentAnalysisReport | null {
  try {
    // 尝试提取 JSON
    const jsonStr = extractJSON(response);
    if (!jsonStr) {
      console.error('[ResultParser] No JSON found in response');
      return null;
    }

    const parsed = JSON.parse(jsonStr);
    
    // 验证并规范化结果
    const report = normalizeReport(parsed, model, language);
    
    return report;
  } catch (error) {
    console.error('[ResultParser] Failed to parse response:', error);
    return null;
  }
}

/**
 * 从响应中提取 JSON
 */
function extractJSON(text: string): string | null {
  // 尝试直接解析
  try {
    JSON.parse(text);
    return text;
  } catch {
    // 继续尝试提取
  }

  // 尝试提取 ```json ... ``` 代码块
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      JSON.parse(jsonBlockMatch[1].trim());
      return jsonBlockMatch[1].trim();
    } catch {
      // 继续尝试
    }
  }

  // 尝试提取 { ... } 结构
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[0]);
      return jsonMatch[0];
    } catch {
      // 解析失败
    }
  }

  return null;
}

/**
 * 规范化报告结构
 */
function normalizeReport(
  data: any,
  model: string,
  language: 'zh' | 'en'
): ComponentAnalysisReport {
  // 获取 summary
  const summary = data.summary || data.overview || '';

  // 获取 businessLogic - 支持字符串或对象格式
  const businessLogicRaw = data.businessLogic || data.business_logic || {};
  const businessLogicDesc = typeof businessLogicRaw === 'string' 
    ? businessLogicRaw 
    : (businessLogicRaw.description || '');

  // 获取 interactions - 支持字符串或对象格式
  const interactionsRaw = data.interactions || {};
  const interactionsDesc = typeof interactionsRaw === 'string'
    ? interactionsRaw
    : (interactionsRaw.flowDescription || interactionsRaw.flow_description || '');

  return {
    summary,
    
    businessLogic: {
      description: businessLogicDesc,
      keyFunctions: typeof businessLogicRaw === 'object' 
        ? normalizeArray(businessLogicRaw.keyFunctions || businessLogicRaw.key_functions, (item) => ({
            name: item.name || 'unknown',
            purpose: item.purpose || '',
          }))
        : [],
    },
    
    interactions: {
      userActions: typeof interactionsRaw === 'object'
        ? normalizeArray(interactionsRaw.userActions || interactionsRaw.user_actions, (item) => ({
            action: item.action || '',
            response: item.response || '',
          }))
        : [],
      flowDescription: interactionsDesc,
    },
    
    eventHandling: {
      events: [],
      summary: '',
    },
    
    stateFlow: {
      states: [],
      transitions: [],
    },
    
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
    
    meta: {
      analyzedAt: new Date().toISOString(),
      model,
      language,
    },
  };
}

/**
 * 规范化数组
 */
function normalizeArray<T, R>(
  arr: any,
  transform: (item: any) => R
): R[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(transform).filter(Boolean);
}

/**
 * 验证状态类型
 */
function validateStateType(type: any): 'local' | 'redux' | 'context' | 'url' {
  const validTypes = ['local', 'redux', 'context', 'url'];
  return validTypes.includes(type) ? type : 'local';
}

/**
 * 生成降级报告（当 AI 分析失败时使用）
 */
export function generateFallbackReport(
  componentName: string,
  language: 'zh' | 'en'
): ComponentAnalysisReport {
  const isZh = language === 'zh';
  
  return {
    summary: isZh 
      ? `${componentName} 组件（AI 分析暂不可用）`
      : `${componentName} component (AI analysis unavailable)`,
    
    businessLogic: {
      description: isZh ? '暂无业务逻辑分析' : 'Business logic analysis unavailable',
      keyFunctions: [],
    },
    
    interactions: {
      userActions: [],
      flowDescription: isZh ? '暂无交互分析' : 'Interaction analysis unavailable',
    },
    
    eventHandling: {
      events: [],
      summary: isZh ? '暂无事件处理分析' : 'Event handling analysis unavailable',
    },
    
    stateFlow: {
      states: [],
      transitions: [],
    },
    
    suggestions: [
      isZh ? 'AI 分析服务暂时不可用，请稍后重试' : 'AI analysis service temporarily unavailable, please try again later',
    ],
    
    meta: {
      analyzedAt: new Date().toISOString(),
      model: 'fallback',
      language,
    },
  };
}
