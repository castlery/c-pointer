# 集成契约文档 (Integration Contract)

## 概述

本文档定义了组件代码分析器各单元之间的集成契约，包括 API 端点、数据格式和通信协议。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户浏览器                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Unit 1: Browser Extension               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │  Popup   │  │ Content  │  │   Side Panel     │  │   │
│  │  │          │  │ Script   │  │                  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    内网服务器                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Unit 2: Backend Service                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│  │  │   API    │  │  Code    │  │   AI Analyzer    │  │   │
│  │  │ Gateway  │  │ Fetcher  │  │                  │  │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              │ 内部调用                      │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Unit 3: Config Management                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Git Protocol
                              ▼
                    ┌──────────────────┐
                    │   Git Repository │
                    │    (Joyboy)      │
                    └──────────────────┘
```

---

## Unit 1 ↔ Unit 2 集成契约

### 契约 1: 组件分析 API

**端点:** `POST /api/analyze`

**协议:** HTTP/HTTPS

**请求格式:**
```typescript
interface AnalyzeRequest {
  // 组件信息（由浏览器插件提取）
  componentInfo: {
    displayName: string;           // 组件显示名称
    fileName: string;              // 源文件名
    filePath: string | null;       // 源文件路径
    componentType: ComponentType;  // 组件类型
    props?: Record<string, unknown>; // 当前 props 值（可选）
  };
  
  // 环境信息
  environment: 'test' | 'uat' | 'local';
  market: 'US' | 'CA' | 'AU' | 'UK' | 'SG';
  pageUrl: string;                 // 当前页面 URL
  
  // 分析选项（可选）
  options?: {
    includeCodeSnippets?: boolean; // 是否包含代码片段
    maxDepth?: number;             // 依赖分析深度
  };
}

type ComponentType = 'fortress' | 'business' | 'shared' | 'unknown';
```

**响应格式:**
```typescript
interface AnalyzeResponse {
  success: boolean;
  
  // 成功时返回分析结果
  result?: AnalysisResult;
  
  // 失败时返回错误信息
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  
  // 元数据
  meta: {
    cached: boolean;           // 是否来自缓存
    analyzedAt: string;        // 分析时间 (ISO 8601)
    duration: number;          // 分析耗时 (ms)
    branch: string;            // 使用的代码分支
    commitHash: string;        // 代码 commit hash
  };
}

interface AnalysisResult {
  componentName: string;
  componentPath: string;
  componentType: ComponentType;
  moduleName?: string;         // 业务模块名（如 cart, checkout）
  
  // 功能概述
  summary: string;
  
  // Props 分析
  props: PropDescription[];
  
  // 状态管理分析
  stateManagement: {
    localState: StateItem[];
    reduxState: ReduxStateItem[];
  };
  
  // 业务逻辑要点
  businessLogic: string[];
  
  // 数据流向
  dataFlow: {
    inputs: string[];
    outputs: string[];
    sideEffects: string[];
    diagram?: string;          // Mermaid 格式
  };
  
  // 依赖关系
  dependencies: DependencyInfo[];
  
  // 代码片段（可选）
  codeSnippets?: CodeSnippet[];
}

interface PropDescription {
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

interface StateItem {
  name: string;
  type: string;
  description: string;
  initialValue?: string;
}

interface ReduxStateItem {
  selector: string;
  slice: string;
  description: string;
}

interface DependencyInfo {
  name: string;
  type: 'component' | 'service' | 'domain' | 'util' | 'external';
  path: string;
  description?: string;
}

interface CodeSnippet {
  title: string;
  code: string;
  language: 'typescript' | 'javascript';
  filePath: string;
  lineStart: number;
  lineEnd: number;
  explanation?: string;
}
```

**错误码:**
```typescript
enum ErrorCode {
  // 客户端错误 (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  INVALID_COMPONENT_PATH = 'INVALID_COMPONENT_PATH',
  UNSUPPORTED_ENVIRONMENT = 'UNSUPPORTED_ENVIRONMENT',
  
  // 服务端错误 (5xx)
  GIT_CONNECTION_FAILED = 'GIT_CONNECTION_FAILED',
  BRANCH_NOT_FOUND = 'BRANCH_NOT_FOUND',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  AI_API_ERROR = 'AI_API_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

**HTTP 状态码映射:**
| 错误码 | HTTP 状态码 |
|-------|------------|
| INVALID_REQUEST | 400 |
| COMPONENT_NOT_FOUND | 404 |
| INVALID_COMPONENT_PATH | 400 |
| UNSUPPORTED_ENVIRONMENT | 400 |
| GIT_CONNECTION_FAILED | 503 |
| BRANCH_NOT_FOUND | 404 |
| FILE_NOT_FOUND | 404 |
| PARSE_ERROR | 500 |
| AI_API_ERROR | 502 |
| TIMEOUT | 504 |
| INTERNAL_ERROR | 500 |

---

### 契约 2: 健康检查 API

**端点:** `GET /api/health`

**响应格式:**
```typescript
interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;              // 运行时间 (秒)
  
  checks: {
    git: {
      status: 'ok' | 'error';
      message?: string;
    };
    ai: {
      status: 'ok' | 'error';
      provider: string;
      message?: string;
    };
    cache: {
      status: 'ok' | 'error';
      size: number;
      message?: string;
    };
  };
}
```

---

### 契约 3: 配置 API

**端点:** `GET /api/config`

**响应格式:**
```typescript
interface ConfigResponse {
  environments: {
    name: string;
    domain: string;
    enabled: boolean;
  }[];
  
  markets: {
    code: string;
    enabled: boolean;
  }[];
  
  features: {
    codeSnippets: boolean;
    dependencyGraph: boolean;
    export: boolean;
  };
}
```

---

## Unit 2 ↔ Unit 3 集成契约

### 契约 4: 配置读取接口

**调用方式:** 内部模块调用

```typescript
interface ConfigService {
  // 获取完整配置
  getConfig(): ProjectConfig;
  
  // 根据页面 URL 解析环境和分支
  resolveEnvironmentAndBranch(pageUrl: string): {
    environment: EnvironmentConfig;
    branch: string;
    market: MarketConfig;
  };
  
  // 获取 Git 仓库配置
  getGitConfig(): {
    repository: string;
    credentials: GitCredentials;
  };
  
  // 获取 AI 服务配置
  getAIConfig(): AIProviderConfig;
}
```

---

## 通信协议规范

### HTTP Headers

**请求头:**
```
Content-Type: application/json
Accept: application/json
X-Request-ID: <uuid>           // 请求追踪 ID
X-Client-Version: <version>    // 插件版本号
```

**响应头:**
```
Content-Type: application/json
X-Request-ID: <uuid>           // 回显请求 ID
X-Response-Time: <ms>          // 响应时间
```

### 超时设置

| 操作 | 超时时间 |
|-----|---------|
| 健康检查 | 5 秒 |
| 组件分析 | 60 秒 |
| 配置获取 | 10 秒 |

### 重试策略

| 错误类型 | 重试次数 | 重试间隔 |
|---------|---------|---------|
| 网络错误 | 3 | 1s, 2s, 4s |
| 超时 | 2 | 5s, 10s |
| 5xx 错误 | 2 | 2s, 4s |
| 4xx 错误 | 0 | - |

---

## 版本兼容性

### API 版本控制

- 当前版本: v1
- 版本通过 URL 路径指定: `/api/v1/analyze`
- 向后兼容: 新版本保持对旧版本请求的兼容

### 版本升级策略

1. 新增字段: 设为可选，提供默认值
2. 删除字段: 先标记为 deprecated，下个大版本移除
3. 修改字段类型: 创建新版本 API

---

## 安全规范

### 认证（未来扩展）

当前版本不需要认证，未来可扩展:
- API Key 认证
- JWT Token 认证

### 数据安全

1. 代码内容不在响应中返回完整源码，仅返回片段
2. Git 凭证在后端加密存储，不传输到前端
3. 敏感配置通过环境变量注入

### CORS 配置

```typescript
const corsOptions = {
  origin: [
    'chrome-extension://*',    // Chrome 插件
    'http://localhost:*'       // 本地开发
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Request-ID', 'X-Client-Version']
};
```

---

## 测试契约

### 契约测试用例

```typescript
describe('Analyze API Contract', () => {
  it('should return valid AnalysisResult for business component', async () => {
    const request: AnalyzeRequest = {
      componentInfo: {
        displayName: 'CartItem',
        fileName: 'CartItem.tsx',
        filePath: 'libs/modules/cart/src/components/CartItem.tsx',
        componentType: 'business'
      },
      environment: 'test',
      market: 'US',
      pageUrl: 'https://test.castlery.com/cart'
    };
    
    const response = await api.post('/api/analyze', request);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.result).toMatchSchema(AnalysisResultSchema);
  });
  
  it('should return 404 for non-existent component', async () => {
    const request: AnalyzeRequest = {
      componentInfo: {
        displayName: 'NonExistent',
        fileName: 'NonExistent.tsx',
        filePath: 'libs/modules/cart/src/components/NonExistent.tsx',
        componentType: 'business'
      },
      environment: 'test',
      market: 'US',
      pageUrl: 'https://test.castlery.com/cart'
    };
    
    const response = await api.post('/api/analyze', request);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FILE_NOT_FOUND');
  });
});
```

---

## 变更日志

| 版本 | 日期 | 变更内容 |
|-----|------|---------|
| 1.0.0 | 2024-01-XX | 初始版本 |
