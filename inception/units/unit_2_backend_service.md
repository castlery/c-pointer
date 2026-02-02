# Unit 2: 后端分析服务 (Backend Service)

## 单元概述

后端分析服务是系统的核心处理单元，负责从 Git 仓库获取源代码、解析 Nx 工作区结构、调用 AI 进行代码分析。部署在内网环境，可安全访问代码仓库。

## 技术栈

- Node.js 20 + Express
- TypeScript 5.x
- TypeScript Compiler API (代码解析)
- simple-git (Git 操作)
- OpenAI API (AI 分析)
- Redis (缓存，可选)

## 包含的用户故事

### Epic 2: 代码获取

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-2.1 | P0 | 获取组件源代码 |
| US-2.2 | P0 | 获取业务模块三层代码 |
| US-2.3 | P1 | 获取 Fortress 组件代码 |

### Epic 3: AI 代码分析

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-3.1 | P0 | 分析组件功能 |
| US-3.2 | P0 | 分析组件 Props |
| US-3.3 | P0 | 分析状态管理 |
| US-3.4 | P1 | 分析 API 调用 |
| US-3.5 | P1 | 分析影响范围 |

### Epic 6: 配置管理（后端部分）

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-6.2 | P0 | 配置 Git 仓库 |
| US-6.3 | P1 | 配置环境分支映射 |

---

## 详细验收标准

### US-2.1 获取组件源代码

**验收标准：**
- AC-2.1.1 根据组件路径在 Nx 工作区中定位源文件
  - 解析 tsconfig.paths.json 获取路径别名
  - 支持 @joyboy/* 路径别名解析
  - 返回绝对文件路径
  
- AC-2.1.2 获取组件的完整 TypeScript 源代码
  - 读取 .tsx/.ts 文件内容
  - 保留原始格式和注释
  
- AC-2.1.3 解析并收集组件的 import 依赖
  - 使用 TypeScript Compiler API 解析 AST
  - 提取所有 import 语句
  - 区分相对导入和包导入

---

### US-2.2 获取业务模块三层代码

**验收标准：**
- AC-2.2.1 自动识别组件所属的业务模块
  - 从文件路径提取模块名 (libs/modules/{moduleName})
  - 支持的模块: cart, checkout, product, account 等
  
- AC-2.2.2 获取 components 层的 UI 组件代码
  - 路径: libs/modules/{moduleName}/src/components/
  - 获取组件文件及其子组件
  
- AC-2.2.3 获取 services 层的 API 调用代码
  - 路径: libs/modules/{moduleName}/src/services/
  - 获取 API 服务定义文件
  
- AC-2.2.4 获取 domain 层的 Redux 状态管理代码
  - 路径: libs/modules/{moduleName}/src/domain/
  - 获取 slice、selectors、actions 文件

---

### US-3.1 分析组件功能

**验收标准：**
- AC-3.1.1 生成组件功能的自然语言描述
  - 调用 AI API 分析代码
  - 返回 100-200 字的功能概述
  
- AC-3.1.2 描述使用中文，避免技术术语
  - Prompt 中明确要求使用中文
  - 将技术概念转换为业务语言
  
- AC-3.1.3 准确反映组件的实际行为
  - 基于代码逻辑生成描述
  - 不添加代码中不存在的功能

---

### US-3.2 分析组件 Props

**验收标准：**
- AC-3.2.1 列出所有 Props 及其类型
  - 解析 TypeScript 接口定义
  - 提取 Props 类型信息
  
- AC-3.2.2 说明每个 Prop 的用途
  - 基于命名和使用方式推断用途
  - 使用 AI 生成描述
  
- AC-3.2.3 标注必填和可选参数
  - 识别 ? 可选标记
  - 识别 Required<> 类型
  
- AC-3.2.4 显示默认值（如有）
  - 解析 defaultProps
  - 解析参数解构默认值

---

### US-3.3 分析状态管理

**验收标准：**
- AC-3.3.1 识别组件的本地状态（useState）
  - 解析 useState 调用
  - 提取状态名称和初始值
  
- AC-3.3.2 识别 Redux 状态依赖（useSelector）
  - 解析 useSelector 调用
  - 提取 selector 函数
  - 关联到对应的 Redux slice
  
- AC-3.3.3 识别 Redux actions 调用（useDispatch）
  - 解析 dispatch 调用
  - 提取 action 名称
  - 关联到对应的 reducer
  
- AC-3.3.4 说明状态变化的触发条件
  - 分析事件处理函数
  - 说明何时触发状态更新

---

### US-6.2 配置 Git 仓库

**验收标准：**
- AC-6.2.1 支持配置 Git 仓库 URL
  - 支持 SSH 格式: git@github.com:org/repo.git
  - 支持 HTTPS 格式: https://github.com/org/repo.git
  
- AC-6.2.2 支持配置访问凭证
  - SSH: 使用 SSH key
  - HTTPS: 使用 Personal Access Token
  - 凭证加密存储
  
- AC-6.2.3 验证仓库连接状态
  - 执行 git ls-remote 验证连接
  - 返回连接状态和错误信息

---

### US-6.3 配置环境分支映射

**验收标准：**
- AC-6.3.1 配置测试环境对应的分支（如 develop）
  - 域名: test.castlery.com → develop 分支
  
- AC-6.3.2 配置 UAT 环境对应的分支（如 release）
  - 域名: uat.castlery.com → release 分支
  
- AC-6.3.3 根据当前页面 URL 自动选择分支
  - 解析请求中的 pageUrl
  - 匹配域名到对应分支

---

## 模块结构

```
backend-service/
├── src/
│   ├── api/                    # API 路由
│   │   ├── index.ts
│   │   ├── analyze.ts
│   │   ├── health.ts
│   │   └── config.ts
│   ├── services/               # 业务服务
│   │   ├── CodeFetcher.ts
│   │   ├── NxWorkspaceParser.ts
│   │   ├── AIAnalyzer.ts
│   │   └── GitService.ts
│   ├── parsers/                # 代码解析器
│   │   ├── TypeScriptParser.ts
│   │   ├── PropsParser.ts
│   │   ├── StateParser.ts
│   │   └── ImportParser.ts
│   ├── config/                 # 配置管理
│   │   ├── ProjectConfig.ts
│   │   └── EnvironmentConfig.ts
│   ├── cache/                  # 缓存层
│   │   └── AnalysisCache.ts
│   ├── types/                  # 类型定义
│   │   ├── api.ts
│   │   ├── analysis.ts
│   │   └── workspace.ts
│   └── utils/                  # 工具函数
│       ├── logger.ts
│       └── errors.ts
├── config/
│   └── default.json            # 默认配置
├── package.json
└── tsconfig.json
```

---

## API 端点定义

### POST /api/analyze

分析组件代码

**Request:**
```typescript
interface AnalyzeRequest {
  componentInfo: {
    displayName: string;
    fileName: string;
    filePath: string | null;
    componentType: 'fortress' | 'business' | 'shared' | 'unknown';
  };
  environment: 'test' | 'uat';
  market: 'US' | 'CA' | 'AU' | 'UK' | 'SG';
  pageUrl: string;
}
```

**Response:**
```typescript
interface AnalyzeResponse {
  success: boolean;
  result?: {
    componentName: string;
    componentPath: string;
    summary: string;
    props: PropDescription[];
    stateManagement: StateDescription;
    businessLogic: string[];
    dataFlow: DataFlowDescription;
    dependencies: DependencyInfo[];
    codeSnippets: CodeSnippet[];
  };
  error?: string;
  cached: boolean;
  analyzedAt: string;
}
```

---

### GET /api/health

健康检查

**Response:**
```typescript
{
  status: 'ok' | 'error';
  version: string;
  gitConnected: boolean;
  aiConnected: boolean;
}
```

---

### GET /api/config

获取配置信息

**Response:**
```typescript
{
  environments: EnvironmentConfig[];
  markets: MarketConfig[];
  gitRepository: string;
}
```

---

### POST /api/config

更新配置

**Request:**
```typescript
{
  gitRepository?: string;
  gitCredentials?: string;
  environments?: EnvironmentConfig[];
}
```

---

## 依赖关系

- **被 Unit 1 (浏览器插件) 依赖**: 提供分析 API
- **依赖 Unit 3 (配置管理)**: 读取项目配置

---

## AI 服务抽象层

为支持未来切换 AI 服务提供商，设计抽象接口：

```typescript
interface AIProvider {
  name: string;
  analyze(code: string, context: AnalysisContext): Promise<AnalysisResult>;
}

class OpenAIProvider implements AIProvider {
  name = 'openai';
  // GPT-4 实现
}

class ClaudeProvider implements AIProvider {
  name = 'claude';
  // Claude 实现（未来扩展）
}

class AIAnalyzerService {
  private provider: AIProvider;
  
  setProvider(provider: AIProvider) {
    this.provider = provider;
  }
  
  async analyze(code: string, context: AnalysisContext) {
    return this.provider.analyze(code, context);
  }
}
```

---

## 开发里程碑

| 里程碑 | 包含功能 | 预计工时 |
|-------|---------|---------|
| M1 | 基础框架 + API 路由 | 2 天 |
| M2 | Git 服务 + 代码获取 | 3 天 |
| M3 | Nx 工作区解析 | 2 天 |
| M4 | TypeScript 代码解析 | 3 天 |
| M5 | AI 分析集成 | 2 天 |
| M6 | 缓存 + 优化 | 1 天 |
