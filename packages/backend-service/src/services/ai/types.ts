/**
 * AI 组件分析相关类型定义
 */

/**
 * 事件处理信息
 */
export interface EventHandlerInfo {
  eventName: string;
  handlerName: string;
  description: string;
  sideEffects?: string[];
}

/**
 * 状态信息
 */
export interface StateInfo {
  name: string;
  type: 'local' | 'redux' | 'context' | 'url';
  description: string;
  initialValue?: string;
}

/**
 * 状态转换信息
 */
export interface StateTransition {
  from: string;
  to: string;
  trigger: string;
  description: string;
}

/**
 * 组件分析报告
 */
export interface ComponentAnalysisReport {
  /**
   * 组件功能概述
   */
  summary: string;

  /**
   * 业务逻辑分析
   */
  businessLogic: {
    description: string;
    keyFunctions: Array<{
      name: string;
      purpose: string;
    }>;
    dataProcessing?: string;
  };

  /**
   * 交互逻辑分析
   */
  interactions: {
    userActions: Array<{
      action: string;
      response: string;
    }>;
    flowDescription: string;
  };

  /**
   * 事件处理分析
   */
  eventHandling: {
    events: EventHandlerInfo[];
    summary: string;
  };

  /**
   * 状态变化分析
   */
  stateFlow: {
    states: StateInfo[];
    transitions: StateTransition[];
    diagram?: string;
  };

  /**
   * 优化建议（可选）
   */
  suggestions?: string[];

  /**
   * 分析元数据
   */
  meta: {
    analyzedAt: string;
    model: string;
    language: 'zh' | 'en';
    tokensUsed?: number;
    duration?: number;
  };
}

/**
 * 分析上下文
 */
export interface AnalysisContext {
  sourceCode: string;
  componentName: string;
  filePath: string;
  componentType: string;
  childComponents?: string[];
  language: 'zh' | 'en';
}

/**
 * 分析结果
 */
export interface AIAnalysisResult {
  success: boolean;
  report?: ComponentAnalysisReport;
  error?: {
    code: string;
    message: string;
  };
  fallback?: boolean;
}
