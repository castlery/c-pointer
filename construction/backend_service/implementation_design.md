# Backend Service - 实现设计

## 项目目录结构

```
packages/backend-service/
├── src/
│   ├── api/                        # API 层
│   │   ├── index.ts               # 路由注册
│   │   ├── routes/
│   │   │   ├── analyze.ts         # 分析路由
│   │   │   ├── health.ts          # 健康检查路由
│   │   │   └── config.ts          # 配置路由
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts    # 错误处理
│   │   │   ├── requestLogger.ts   # 请求日志
│   │   │   ├── validator.ts       # 请求验证
│   │   │   └── cors.ts            # CORS 配置
│   │   └── validators/
│   │       └── analyzeRequest.ts  # 分析请求验证
│   │
│   ├── application/                # 应用层
│   │   ├── services/
│   │   │   ├── AnalysisService.ts # 分析服务
│   │   │   ├── CodeFetcherService.ts # 代码获取服务
│   │   │   └── AIAnalyzerService.ts  # AI 分析服务
│   │   ├── dto/
│   │   │   ├── AnalyzeRequest.ts  # 请求 DTO
│   │   │   └── AnalyzeResponse.ts # 响应 DTO
│   │   └── mappers/
│   │       └── ResultMapper.ts    # 结果映射
│   │
│   ├── domain/                     # 领域层
│   │   ├── entities/
│   │   │   ├── AnalysisRequest.ts # 分析请求实体
│   │   │   ├── CodeBundle.ts      # 代码包实体
│   │   │   └── AnalysisResult.ts  # 分析结果实体
│   │   ├── valueObjects/
│   │   │   ├── ComponentInfo.ts   # 组件信息
│   │   │   ├── ComponentPath.ts   # 组件路径
│   │   │   ├── Environment.ts     # 环境信息
│   │   │   └── SourceFile.ts      # 源文件
│   │   ├── services/
│   │   │   ├── NxWorkspaceParser.ts  # Nx 工作区解析
│   │   │   └── TypeScriptParser.ts   # TS 代码解析
│   │   └── events/
│   │       ├── EventBus.ts        # 事件总线
│   │       └── AnalysisEvents.ts  # 分析事件
│   │
│   ├── infrastructure/             # 基础设施层
│   │   ├── git/
│   │   │   └── GitClient.ts       # Git 客户端
│   │   ├── ai/
│   │   │   ├── AIProvider.ts      # AI 提供商接口
│   │   │   └── OpenAIProvider.ts  # OpenAI 实现
│   │   ├── cache/
│   │   │   ├── CacheProvider.ts   # 缓存接口
│   │   │   └── MemoryCache.ts     # 内存缓存实现
│   │   ├── config/
│   │   │   ├── ConfigManager.ts   # 配置管理
│   │   │   └── EnvironmentResolver.ts # 环境解析
│   │   └── logging/
│   │       └── Logger.ts          # 日志服务
│   │
│   ├── types/                      # 类型定义
│   │   └── index.ts
│   │
│   ├── utils/                      # 工具函数
│   │   ├── errors.ts              # 错误定义
│   │   └── helpers.ts             # 辅助函数
│   │
│   ├── app.ts                      # Express 应用
│   └── index.ts                    # 入口文件
│
├── config/
│   ├── default.json               # 默认配置
│   └── production.json            # 生产配置
│
├── tests/
│   ├── unit/                      # 单元测试
│   ├── integration/               # 集成测试
│   └── fixtures/                  # 测试数据
│
├── Dockerfile                     # Docker 配置
├── tsconfig.json                  # TypeScript 配置
├── package.json
└── .env.example                   # 环境变量示例
```

---

## 分层架构实现

### API 层

负责 HTTP 请求处理、路由、中间件

#### 路由定义

```typescript
// src/api/routes/analyze.ts
router.post('/analyze', 
  validateRequest(analyzeRequestSchema),
  async (req, res, next) => {
    try {
      const result = await analysisService.analyze(req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);
```

#### 中间件链

```
请求 → CORS → RequestLogger → Validator → Route Handler → ErrorHandler → 响应
```

### 应用层

负责业务流程编排、DTO 转换

#### AnalysisService

```typescript
class AnalysisService {
  async analyze(request: AnalyzeRequestDTO): Promise<AnalyzeResponseDTO> {
    // 1. 检查缓存
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    // 2. 解析环境和分支
    const { branch } = this.configManager.resolveEnvironment(request.pageUrl);
    
    // 3. 获取代码
    const codeBundle = await this.codeFetcher.fetch(request.componentInfo, branch);
    
    // 4. AI 分析
    const result = await this.aiAnalyzer.analyze(codeBundle);
    
    // 5. 缓存结果
    await this.cache.set(cacheKey, result);
    
    return result;
  }
}
```

### 领域层

负责核心业务逻辑、领域模型

#### NxWorkspaceParser

```typescript
class NxWorkspaceParser {
  parseWorkspace(repoPath: string): WorkspaceInfo {
    // 解析 nx.json, project.json, tsconfig.base.json
  }
  
  findComponentPath(componentName: string): ComponentPath {
    // 在 libs/modules, libs/fortress, libs/shared 中查找
  }
  
  resolvePathAlias(alias: string): string {
    // 解析 @joyboy/* 路径别名
  }
}
```

#### TypeScriptParser

```typescript
class TypeScriptParser {
  parseFile(content: string): ParsedFile {
    // 使用 TypeScript Compiler API 解析
  }
  
  extractProps(file: ParsedFile): PropDescription[] {
    // 提取 Props 接口定义
  }
  
  extractState(file: ParsedFile): StateAnalysis {
    // 提取 useState, useSelector 调用
  }
}
```

### 基础设施层

负责外部服务集成、技术实现

#### GitClient

```typescript
class GitClient {
  private git: SimpleGit;
  
  async clone(url: string, path: string): Promise<void> {
    await this.git.clone(url, path);
  }
  
  async checkout(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }
  
  async pull(): Promise<void> {
    await this.git.pull();
  }
  
  async getFile(filePath: string): Promise<string> {
    return fs.readFile(path.join(this.repoPath, filePath), 'utf-8');
  }
}
```

#### OpenAIProvider

```typescript
class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  
  async analyze(code: string, context: AnalysisContext): Promise<RawAnalysisResult> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: this.buildPrompt(code, context) }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });
    
    return this.parseResponse(response);
  }
}
```

---

## 缓存方案

### 内存缓存实现

```typescript
class MemoryCache implements CacheProvider {
  private cache: NodeCache;
  
  constructor(options: CacheOptions) {
    this.cache = new NodeCache({
      stdTTL: options.ttlSeconds,
      maxKeys: options.maxSize,
      checkperiod: 120
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key) || null;
  }
  
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }
  
  generateKey(componentPath: string, branch: string, commit: string): string {
    return `${componentPath}:${branch}:${commit}`;
  }
}
```

### 缓存策略

| 场景 | TTL | 说明 |
|------|-----|------|
| 分析结果 | 1 小时 | 同一 commit 的分析结果 |
| Git 仓库状态 | 5 分钟 | 分支和 commit 信息 |
| 工作区解析 | 10 分钟 | Nx 工作区结构 |

---

## API 路由和中间件

### 路由定义

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/analyze | 分析组件 |
| GET | /api/health | 健康检查 |
| GET | /api/config | 获取配置 |

### 请求验证 (Zod)

```typescript
const analyzeRequestSchema = z.object({
  componentInfo: z.object({
    displayName: z.string().min(1),
    fileName: z.string().min(1),
    filePath: z.string().nullable(),
    componentType: z.enum(['fortress', 'business', 'shared', 'unknown'])
  }),
  environment: z.enum(['test', 'uat', 'local']),
  market: z.enum(['US', 'CA', 'AU', 'UK', 'SG']),
  pageUrl: z.string().url()
});
```

### 错误处理

```typescript
class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// 错误处理中间件
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
  }
  
  logger.error('Unhandled error', { error: err });
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
};
```

---

## 日志和监控方案

### 日志配置 (Winston)

```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

### 日志级别

| 级别 | 用途 |
|------|------|
| error | 错误和异常 |
| warn | 警告信息 |
| info | 重要业务事件 |
| debug | 调试信息 |

### 请求日志

```typescript
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: req.headers['x-request-id']
    });
  });
  
  next();
};
```

### 监控指标

| 指标 | 类型 | 说明 |
|------|------|------|
| http_requests_total | Counter | HTTP 请求总数 |
| http_request_duration_seconds | Histogram | 请求耗时分布 |
| analysis_duration_seconds | Histogram | 分析耗时分布 |
| cache_hits_total | Counter | 缓存命中次数 |
| cache_misses_total | Counter | 缓存未命中次数 |
| ai_api_calls_total | Counter | AI API 调用次数 |
| ai_api_errors_total | Counter | AI API 错误次数 |

---

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm dev

# 构建
pnpm build

# 启动生产服务
pnpm start

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 运行测试（覆盖率）
pnpm test:coverage
```

---

## Docker 配置

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build:
      context: ./packages/backend-service
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - PORT=3001
      - GIT_REPO_URL=${GIT_REPO_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LOG_LEVEL=debug
    volumes:
      - ./repos:/app/repos
      - ./logs:/app/logs
```

---

## 测试策略

### 单元测试

- NxWorkspaceParser - 工作区解析逻辑
- TypeScriptParser - 代码解析逻辑
- MemoryCache - 缓存逻辑
- EnvironmentResolver - 环境解析逻辑

### 集成测试

- API 端点测试
- Git 操作测试
- AI 分析流程测试（使用 Mock）

### 测试覆盖率目标

| 模块 | 目标覆盖率 |
|------|-----------|
| Domain | 90% |
| Application | 85% |
| Infrastructure | 70% |
| API | 80% |
