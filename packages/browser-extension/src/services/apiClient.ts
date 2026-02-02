import type { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  HealthResponse, 
  ConfigResponse,
  ComponentInfo,
  EnvironmentName,
  MarketCode
} from '@component-analyzer/shared';

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

// Chat API 类型
interface ChatRequest {
  question: string;
  component: {
    name: string;
    filePath: string;
    code: string;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
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

interface GetComponentCodeResponse {
  success: boolean;
  code?: string;
  childComponents?: Array<{
    name: string;
    path: string;
    githubUrl: string;
    line?: number;
  }>;
  error?: string;
}

export class ApiClient {
  private backendUrl: string;

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || DEFAULT_BACKEND_URL;
  }

  setBackendUrl(url: string): void {
    this.backendUrl = url;
  }

  async health(): Promise<HealthResponse> {
    const response = await fetch(`${this.backendUrl}/api/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    return response.json();
  }

  async config(): Promise<ConfigResponse> {
    const response = await fetch(`${this.backendUrl}/api/config`);
    if (!response.ok) {
      throw new Error(`Config fetch failed: ${response.status}`);
    }
    return response.json();
  }

  async analyze(
    componentInfo: ComponentInfo,
    pageUrl: string,
    environment: EnvironmentName = 'local',
    market: MarketCode = 'US'
  ): Promise<AnalyzeResponse> {
    const request: AnalyzeRequest = {
      componentInfo,
      environment,
      market,
      pageUrl
    };

    console.log('[Component Analyzer] 📤 Sending analysis request:', {
      component: componentInfo.displayName,
      type: componentInfo.componentType,
      path: componentInfo.filePath,
      environment,
      market
    });

    const startTime = performance.now();
    
    const response = await fetch(`${this.backendUrl}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '1.0.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Component Analyzer] ❌ Analysis failed:', error);
      throw new Error(error.error?.message || `Analysis failed: ${response.status}`);
    }

    const result: AnalyzeResponse = await response.json();
    const duration = Math.round(performance.now() - startTime);
    
    console.log('[Component Analyzer] 📥 Analysis result received:', {
      component: result.result?.componentName,
      cached: result.meta?.cached,
      duration: `${duration}ms`,
      summary: result.result?.summary?.substring(0, 100) + '...'
    });
    console.log('[Component Analyzer] Full result:', result);

    return result;
  }

  /**
   * 发送聊天消息进行组件分析
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    console.log('[ApiClient] 📤 Sending chat request:', {
      component: request.component.name,
      question: request.question || '(default analysis)',
      historyLength: request.history?.length || 0
    });

    const startTime = performance.now();

    try {
      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[ApiClient] ❌ Chat failed:', error);
        return {
          success: false,
          error: error.error?.message || `Chat failed: ${response.status}`
        };
      }

      const result: ChatResponse = await response.json();
      const duration = Math.round(performance.now() - startTime);

      console.log('[ApiClient] 📥 Chat response received:', {
        success: result.success,
        answerLength: result.answer?.length || 0,
        tokenUsage: result.tokenUsage,
        duration: `${duration}ms`
      });

      return result;
    } catch (error) {
      console.error('[ApiClient] ❌ Chat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      };
    }
  }

  /**
   * 获取组件代码
   */
  async getComponentCode(
    componentInfo: ComponentInfo,
    pageUrl: string
  ): Promise<GetComponentCodeResponse> {
    console.log('[ApiClient] 📤 Getting component code:', componentInfo.displayName);

    try {
      const response = await fetch(`${this.backendUrl}/api/component-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0'
        },
        body: JSON.stringify({
          componentInfo,
          pageUrl
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[ApiClient] ❌ Get component code failed:', error);
        return {
          success: false,
          error: error.error?.message || `Failed: ${response.status}`
        };
      }

      const result = await response.json();
      console.log('[ApiClient] 📥 Component code received:', {
        codeLength: result.code?.length || 0,
        childCount: result.childComponents?.length || 0
      });

      return {
        success: true,
        code: result.code,
        childComponents: result.childComponents
      };
    } catch (error) {
      console.error('[ApiClient] ❌ Get component code error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络错误'
      };
    }
  }
}

export const apiClient = new ApiClient();
