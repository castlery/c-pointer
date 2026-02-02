// 组件类型
export type ComponentType = 'fortress' | 'business' | 'shared' | 'unknown';

// 环境类型
export type EnvironmentName = 'test' | 'uat' | 'local';

// 市场代码
export type MarketCode = 'US' | 'CA' | 'AU' | 'UK' | 'SG';

// 解析置信度
export type ResolveConfidence = 'high' | 'medium' | 'low';

// 解析来源
export type ResolveSource = 'fiber' | 'className' | 'dataAttribute' | 'heuristic' | 'inspector';

// Inspector 路径信息（来自 code-inspector-plugin）
export interface InspectorPathInfo {
  filePath: string;
  line: number;
  column: number;
  componentName: string;
}

// 元素上下文信息
export interface ElementContext {
  tagName: string;
  className: string;
  id: string;
  dataAttributes: Record<string, string>;
  ancestorPath: string[];
  textContent: string;
}

// 组件信息
export interface ComponentInfo {
  displayName: string;
  fileName: string;
  filePath: string | null;
  componentType: ComponentType;
  props?: Record<string, unknown>;
  // 解析元数据
  resolveInfo?: {
    confidence: ResolveConfidence;
    source: ResolveSource;
    possiblePaths: string[];
    metadata?: {
      isMuiComponent?: boolean;
      muiComponentName?: string;
      ancestorHints?: string[];
      dataAttributes?: Record<string, string>;
      line?: number;
      column?: number;
      rawPath?: string;
    };
  };
  // Inspector 路径信息（来自 code-inspector-plugin）
  inspectorInfo?: InspectorPathInfo;
  // 元素上下文
  elementContext?: ElementContext;
}

// 分析请求
export interface AnalyzeRequest {
  componentInfo: ComponentInfo;
  environment: EnvironmentName;
  market: MarketCode;
  pageUrl: string;
  options?: {
    includeCodeSnippets?: boolean;
    maxDepth?: number;
  };
}

// Prop 描述
export interface PropDescription {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

// 状态项
export interface StateItem {
  name: string;
  type: string;
  description: string;
  initialValue?: string;
}

// Redux 状态项
export interface ReduxStateItem {
  selector: string;
  slice: string;
  description: string;
}

// 状态分析
export interface StateAnalysis {
  localState: StateItem[];
  reduxState: ReduxStateItem[];
}

// 数据流
export interface DataFlow {
  inputs: string[];
  outputs: string[];
  sideEffects: string[];
  diagram?: string;
}

// 依赖类型
export type DependencyType = 'component' | 'service' | 'domain' | 'util' | 'external' | 'internal';

// 依赖信息
export interface DependencyInfo {
  name: string;
  type: DependencyType;
  path: string;
  description?: string;
}

// 代码片段
export interface CodeSnippet {
  title: string;
  code: string;
  language: 'typescript' | 'javascript' | 'tsx' | 'jsx';
  filePath: string;
  lineStart: number;
  lineEnd: number;
  explanation?: string;
}

// 子组件信息
export interface ChildComponentInfo {
  name: string;
  path: string;
  githubUrl: string;
  line?: number;
}

// AI 分析报告
export interface AIAnalysisReport {
  summary: string;
  businessLogic: {
    description: string;
    keyFunctions: Array<{ name: string; purpose: string }>;
    dataProcessing?: string;
  };
  interactions: {
    userActions: Array<{ action: string; response: string }>;
    flowDescription: string;
  };
  eventHandling: {
    events: Array<{
      eventName: string;
      handlerName: string;
      description: string;
      sideEffects?: string[];
    }>;
    summary: string;
  };
  stateFlow: {
    states: Array<{
      name: string;
      type: 'local' | 'redux' | 'context' | 'url';
      description: string;
      initialValue?: string;
    }>;
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      description: string;
    }>;
  };
  suggestions?: string[];
  meta: {
    analyzedAt: string;
    model: string;
    language: 'zh' | 'en';
    tokensUsed?: number;
    duration?: number;
  };
}

// 分析结果
export interface AnalysisResult {
  componentName: string;
  componentPath: string;
  componentType: ComponentType;
  moduleName?: string;
  summary: string;
  props: PropDescription[];
  stateManagement: StateAnalysis;
  businessLogic: string[];
  dataFlow: DataFlow;
  dependencies: DependencyInfo[];
  codeSnippets?: CodeSnippet[];
  childComponents?: ChildComponentInfo[];
  githubUrl?: string;
  line?: number;
  // AI 分析结果
  aiAnalysis?: AIAnalysisReport;
}

// 错误代码
export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'COMPONENT_NOT_FOUND'
  | 'INVALID_COMPONENT_PATH'
  | 'UNSUPPORTED_ENVIRONMENT'
  | 'GIT_CONNECTION_FAILED'
  | 'BRANCH_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'PARSE_ERROR'
  | 'AI_API_ERROR'
  | 'TIMEOUT'
  | 'INTERNAL_ERROR';

// 分析错误
export interface AnalysisError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// 分析响应
export interface AnalyzeResponse {
  success: boolean;
  result?: AnalysisResult;
  error?: AnalysisError;
  meta: {
    cached: boolean;
    analyzedAt: string;
    duration: number;
    branch: string;
    commitHash: string;
    githubUrl?: string;
    line?: number;
  };
}

// 健康检查响应
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  checks: {
    git: { status: 'ok' | 'error'; message?: string };
    ai: { status: 'ok' | 'error'; provider: string; message?: string };
    cache: { status: 'ok' | 'error'; size: number; message?: string };
  };
}

// 配置响应
export interface ConfigResponse {
  environments: Array<{
    name: string;
    domain: string;
    enabled: boolean;
  }>;
  markets: Array<{
    code: string;
    enabled: boolean;
  }>;
  features: {
    codeSnippets: boolean;
    dependencyGraph: boolean;
    export: boolean;
  };
}
