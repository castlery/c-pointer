# 组件代码分析器 - 整体架构概览

## 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户浏览器                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Chrome Extension (Manifest V3)                      │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │ │
│  │  │   Popup     │  │  Content    │  │   Side      │  │  Background │  │ │
│  │  │   (React)   │  │  Script     │  │   Panel     │  │  (Service   │  │ │
│  │  │             │  │             │  │   (React)   │  │   Worker)   │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │ │
│  │         │                │                │                │         │ │
│  │         └────────────────┴────────────────┴────────────────┘         │ │
│  │                              │                                        │ │
│  │                    Redux Toolkit Store                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/HTTPS (REST API)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backend Service (Express.js)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                           API Layer                                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │ │
│  │  │  /analyze   │  │  /health    │  │  /config    │                   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                        Application Layer                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │ │
│  │  │  Analysis   │  │   Code      │  │    AI       │                   │ │
│  │  │  Service    │  │  Fetcher    │  │  Analyzer   │                   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                          Domain Layer                                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │ │
│  │  │  Analysis   │  │    Code     │  │  Analysis   │                   │ │
│  │  │  Request    │  │   Bundle    │  │   Result    │                   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                       Infrastructure Layer                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │ │
│  │  │    Git      │  │  TypeScript │  │   OpenAI    │  │   Memory    │ │ │
│  │  │   Client    │  │   Parser    │  │   Client    │  │   Cache     │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
            │    Git      │   │   OpenAI    │   │   Config    │
            │ Repository  │   │    API      │   │   Files     │
            │  (Joyboy)   │   │             │   │             │
            └─────────────┘   └─────────────┘   └─────────────┘
```

---

## 技术选型

### 前端 (Browser Extension)

| 技术 | 版本 | 用途 |
|------|------|------|
| Chrome Extension | Manifest V3 | 浏览器插件标准 |
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Redux Toolkit | 2.x | 状态管理 |
| TailwindCSS | 3.x | 样式框架 |
| Vite | 5.x | 构建工具 |
| @crxjs/vite-plugin | 2.x | Chrome Extension Vite 插件 |

### 后端 (Backend Service)

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x LTS | 运行时 |
| Express.js | 4.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| simple-git | 3.x | Git 操作 |
| typescript (compiler) | 5.x | 代码解析 |
| openai | 4.x | AI API 客户端 |
| winston | 3.x | 日志记录 |
| node-cache | 5.x | 内存缓存 |
| zod | 3.x | 请求验证 |
| cors | 2.x | 跨域支持 |
| helmet | 7.x | 安全中间件 |

### 开发工具

| 工具 | 用途 |
|------|------|
| pnpm | 包管理器 |
| ESLint | 代码检查 |
| Prettier | 代码格式化 |
| Vitest | 单元测试 |
| Docker | 容器化部署 |

---

## 项目结构 (Monorepo)

```
component-code-analyzer/
├── packages/
│   ├── browser-extension/      # Chrome 浏览器插件
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── manifest.json
│   │
│   ├── backend-service/        # 后端分析服务
│   │   ├── src/
│   │   ├── config/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── shared/                 # 共享类型和工具
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
│
├── construction/               # 设计文档
│   ├── architecture_overview.md
│   ├── browser_extension/
│   ├── backend_service/
│   └── config_management/
│
├── inception/                  # 需求和用户故事
│   ├── user_stories.md
│   └── units/
│
├── docker-compose.yml          # 本地开发环境
├── pnpm-workspace.yaml         # Monorepo 配置
├── package.json                # 根 package.json
└── README.md
```

---

## 数据流

### 组件分析流程

```
1. 用户激活插件
   └─▶ Content Script 进入选择模式

2. 用户选择组件
   └─▶ Content Script 通过 React DevTools 获取 Fiber 信息
   └─▶ 提取组件名称、文件路径、类型

3. 发起分析请求
   └─▶ Side Panel 调用 POST /api/analyze
   └─▶ 请求包含: componentInfo, environment, market, pageUrl

4. 后端处理
   └─▶ 解析环境，确定代码分支
   └─▶ 从 Git 仓库获取源代码
   └─▶ 解析 TypeScript 代码
   └─▶ 调用 OpenAI API 分析
   └─▶ 格式化分析结果

5. 返回结果
   └─▶ Side Panel 展示分析结果
   └─▶ 用户可导出为 Markdown
```

---

## 环境配置

### 开发环境

| 环境变量 | 说明 | 示例值 |
|---------|------|--------|
| NODE_ENV | 运行环境 | development |
| PORT | 服务端口 | 3001 |
| GIT_REPO_URL | Git 仓库地址 | git@github.com:castlery/joyboy.git |
| GIT_REPO_PATH | 本地仓库路径 | ./repos/joyboy |
| OPENAI_API_KEY | OpenAI API 密钥 | sk-xxx |
| LOG_LEVEL | 日志级别 | debug |

### 生产环境

| 环境变量 | 说明 | 示例值 |
|---------|------|--------|
| NODE_ENV | 运行环境 | production |
| PORT | 服务端口 | 3001 |
| GIT_REPO_URL | Git 仓库地址 | git@github.com:castlery/joyboy.git |
| OPENAI_API_KEY | OpenAI API 密钥 | sk-xxx |
| LOG_LEVEL | 日志级别 | info |

---

## 安全考虑

1. **代码仓库访问**: 仅在后端服务访问，不暴露给前端
2. **API 密钥**: 通过环境变量注入，不提交到代码仓库
3. **CORS**: 仅允许 Chrome Extension 来源
4. **输入验证**: 使用 Zod 验证所有 API 请求
5. **日志脱敏**: 不记录敏感信息（API 密钥、代码内容）

---

## 扩展性设计

### AI Provider 扩展

```
AIProvider (接口)
├── OpenAIProvider (当前实现)
├── ClaudeProvider (未来扩展)
└── AzureOpenAIProvider (未来扩展)
```

### 缓存扩展

```
CacheProvider (接口)
├── MemoryCacheProvider (当前实现)
├── RedisCacheProvider (未来扩展)
└── SQLiteCacheProvider (未来扩展)
```

---

## 性能指标

| 指标 | 目标值 |
|------|--------|
| 组件选择响应时间 | < 100ms |
| API 请求响应时间 | < 30s |
| 缓存命中时响应时间 | < 500ms |
| 并发请求支持 | 50 |
| 内存占用 | < 512MB |
