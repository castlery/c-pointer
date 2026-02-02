# Backend Service - 领域模型设计

## 限界上下文

**上下文名称**: Code Analysis Context (代码分析上下文)

**职责**: 负责代码获取、解析和 AI 分析，生成结构化的分析结果

**与其他上下文的关系**:
- 上游供应商，为 Browser Extension Context 提供分析服务
- 下游依赖 Config Management Context (获取配置)

---

## 聚合 (Aggregates)

### 聚合 1: AnalysisRequest (分析请求)

**聚合根**: AnalysisRequest

**职责**: 管理一次组件分析请求的完整生命周期，包括代码获取、解析和 AI 分析

**不变量 (Invariants)**:
- 分析请求必须包含有效的组件信息
- 分析状态必须按顺序流转
- 分析结果必须在分析完成后才能访问

#### 实体 (Entities)

**AnalysisRequest**
| 属性 | 类型 | 说明 |
|------|------|------|
| requestId | RequestId | 请求唯一标识 |
| componentInfo | ComponentInfo | 组件信息 |
| environment | Environment | 环境信息 |
| status | AnalysisStatus | 分析状态 |
| codeBundle | CodeBundle | 获取的代码包 |
| analysisResult | AnalysisResult | 分析结果 |
| error | AnalysisError | 错误信息 |
| createdAt | Timestamp | 创建时间 |
| completedAt | Timestamp | 完成时间 |

**行为**:
- create(componentInfo, environment): 创建分析请求
- startCodeFetching(): 开始获取代码
- codesFetched(codeBundle): 代码获取完成
- startAnalysis(): 开始 AI 分析
- completeAnalysis(result): 完成分析
- failAnalysis(error): 分析失败

---

### 聚合 2: CodeBundle (代码包)

**聚合根**: CodeBundle

**职责**: 表示从 Git 仓库获取的组件相关代码集合

#### 实体 (Entities)

**CodeBundle**
| 属性 | 类型 | 说明 |
|------|------|------|
| bundleId | BundleId | 代码包标识 |
| componentPath | ComponentPath | 组件路径 |
| mainFile | SourceFile | 主文件 |
| relatedFiles | SourceFile[] | 相关文件 |
| moduleCode | ModuleCode | 模块代码（三层） |
| imports | ImportInfo[] | 导入信息 |
| branch | BranchName | 代码分支 |
| commitHash | CommitHash | 提交哈希 |

**ModuleCode** (嵌套实体)
| 属性 | 类型 | 说明 |
|------|------|------|
| components | SourceFile[] | 组件层代码 |
| services | SourceFile[] | 服务层代码 |
| domain | SourceFile[] | 领域层代码 |
| types | SourceFile[] | 类型定义 |

---

### 聚合 3: AnalysisResult (分析结果)

**聚合根**: AnalysisResult

**职责**: 表示 AI 分析生成的结构化结果

#### 实体 (Entities)

**AnalysisResult**
| 属性 | 类型 | 说明 |
|------|------|------|
| resultId | ResultId | 结果标识 |
| componentName | string | 组件名称 |
| componentPath | ComponentPath | 组件路径 |
| componentType | ComponentType | 组件类型 |
| moduleName | ModuleName | 模块名称 |
| summary | Summary | 功能概述 |
| propsAnalysis | PropsAnalysis | Props 分析 |
| stateAnalysis | StateAnalysis | 状态分析 |
| businessLogic | BusinessLogic[] | 业务逻辑 |
| dataFlow | DataFlow | 数据流向 |
| dependencies | Dependency[] | 依赖关系 |
| codeSnippets | CodeSnippet[] | 代码片段 |

---

## 值对象 (Value Objects)

### RequestId
请求唯一标识符
| 属性 | 类型 |
|------|------|
| value | UUID |

### AnalysisStatus
分析状态枚举
| 值 | 说明 |
|----|------|
| PENDING | 待处理 |
| FETCHING_CODE | 获取代码中 |
| CODE_FETCHED | 代码已获取 |
| ANALYZING | 分析中 |
| COMPLETED | 已完成 |
| FAILED | 失败 |

### ComponentInfo
组件信息
| 属性 | 类型 |
|------|------|
| displayName | string |
| fileName | string |
| filePath | string |
| componentType | ComponentType |

### ComponentType
组件类型枚举
| 值 | 说明 |
|----|------|
| FORTRESS | Fortress 组件 |
| BUSINESS | 业务模块组件 |
| SHARED | 共享组件 |
| UNKNOWN | 未知 |

### Environment
环境信息
| 属性 | 类型 |
|------|------|
| name | EnvironmentName |
| market | MarketCode |
| pageUrl | URL |

### EnvironmentName
环境名称枚举
| 值 |
|----|
| TEST |
| UAT |
| LOCAL |

### MarketCode
市场代码枚举
| 值 |
|----|
| US |
| CA |
| AU |
| UK |
| SG |

### ComponentPath
组件路径
| 属性 | 类型 |
|------|------|
| value | string |
| moduleName | string |
| layer | ModuleLayer |

### ModuleLayer
模块层级枚举
| 值 |
|----|
| COMPONENTS |
| SERVICES |
| DOMAIN |

### BranchName
分支名称
| 属性 | 类型 |
|------|------|
| value | string |

### CommitHash
提交哈希
| 属性 | 类型 |
|------|------|
| value | string |

### SourceFile
源文件
| 属性 | 类型 |
|------|------|
| path | string |
| content | string |
| language | Language |

### Language
语言枚举
| 值 |
|----|
| TYPESCRIPT |
| JAVASCRIPT |
| JSON |

### ImportInfo
导入信息
| 属性 | 类型 |
|------|------|
| source | string |
| specifiers | string[] |
| isRelative | boolean |
| resolvedPath | string |

### Summary
功能概述
| 属性 | 类型 |
|------|------|
| text | string |
| language | string |

### PropsAnalysis
Props 分析结果
| 属性 | 类型 |
|------|------|
| props | PropDescription[] |

### PropDescription
Prop 描述
| 属性 | 类型 |
|------|------|
| name | string |
| type | string |
| description | string |
| required | boolean |
| defaultValue | string |

### StateAnalysis
状态分析结果
| 属性 | 类型 |
|------|------|
| localState | StateItem[] |
| reduxState | ReduxStateItem[] |

### StateItem
本地状态项
| 属性 | 类型 |
|------|------|
| name | string |
| type | string |
| description | string |
| initialValue | string |

### ReduxStateItem
Redux 状态项
| 属性 | 类型 |
|------|------|
| selector | string |
| slice | string |
| description | string |

### BusinessLogic
业务逻辑描述
| 属性 | 类型 |
|------|------|
| description | string |
| priority | number |

### DataFlow
数据流向
| 属性 | 类型 |
|------|------|
| inputs | string[] |
| outputs | string[] |
| sideEffects | string[] |
| diagram | string |

### Dependency
依赖关系
| 属性 | 类型 |
|------|------|
| name | string |
| type | DependencyType |
| path | string |
| description | string |

### DependencyType
依赖类型枚举
| 值 |
|----|
| COMPONENT |
| SERVICE |
| DOMAIN |
| UTIL |
| EXTERNAL |

### CodeSnippet
代码片段
| 属性 | 类型 |
|------|------|
| title | string |
| code | string |
| language | Language |
| filePath | string |
| lineStart | number |
| lineEnd | number |
| explanation | string |

### AnalysisError
分析错误
| 属性 | 类型 |
|------|------|
| code | ErrorCode |
| message | string |
| details | object |

### ErrorCode
错误代码枚举
| 值 | 说明 |
|----|------|
| INVALID_REQUEST | 无效请求 |
| COMPONENT_NOT_FOUND | 组件未找到 |
| GIT_CONNECTION_FAILED | Git 连接失败 |
| BRANCH_NOT_FOUND | 分支未找到 |
| FILE_NOT_FOUND | 文件未找到 |
| PARSE_ERROR | 解析错误 |
| AI_API_ERROR | AI API 错误 |
| TIMEOUT | 超时 |

---

## 领域事件 (Domain Events)

### AnalysisRequestCreated
分析请求创建事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| componentInfo | ComponentInfo |
| environment | Environment |
| createdAt | Timestamp |

### CodeFetchingStarted
代码获取开始事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| componentPath | ComponentPath |
| branch | BranchName |
| startedAt | Timestamp |

### CodeFetchingCompleted
代码获取完成事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| bundleId | BundleId |
| fileCount | number |
| completedAt | Timestamp |

### CodeFetchingFailed
代码获取失败事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| error | AnalysisError |
| failedAt | Timestamp |

### AIAnalysisStarted
AI 分析开始事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| provider | AIProviderName |
| startedAt | Timestamp |

### AIAnalysisCompleted
AI 分析完成事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| resultId | ResultId |
| duration | number |
| completedAt | Timestamp |

### AIAnalysisFailed
AI 分析失败事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| error | AnalysisError |
| failedAt | Timestamp |

### AnalysisCompleted
分析完成事件
| 属性 | 类型 |
|------|------|
| requestId | RequestId |
| resultId | ResultId |
| cached | boolean |
| completedAt | Timestamp |

---

## 领域服务 (Domain Services)

### CodeFetcherService
代码获取服务

**职责**: 从 Git 仓库获取组件源代码

**接口**:
- fetchComponentCode(path: ComponentPath, branch: BranchName): CodeBundle
- fetchModuleCode(moduleName: ModuleName, branch: BranchName): ModuleCode
- resolveImports(file: SourceFile): ImportInfo[]

### NxWorkspaceParserService
Nx 工作区解析服务

**职责**: 解析 Nx Monorepo 工作区结构

**接口**:
- parseWorkspace(repoPath: string): WorkspaceInfo
- findComponentPath(componentName: string): ComponentPath
- getModuleDependencies(modulePath: string): DependencyGraph
- resolvePathAlias(alias: string): string

### TypeScriptParserService
TypeScript 解析服务

**职责**: 解析 TypeScript 代码，提取类型信息

**接口**:
- parseFile(file: SourceFile): ParsedFile
- extractProps(file: ParsedFile): PropDescription[]
- extractState(file: ParsedFile): StateAnalysis
- extractImports(file: ParsedFile): ImportInfo[]

### AIAnalyzerService
AI 分析服务

**职责**: 调用 AI 服务分析代码

**接口**:
- analyze(codeBundle: CodeBundle, context: AnalysisContext): AnalysisResult
- setProvider(provider: AIProvider): void
- getProvider(): AIProvider

### ResultFormatterService
结果格式化服务

**职责**: 格式化分析结果

**接口**:
- formatResult(rawResult: RawAnalysisResult): AnalysisResult
- generateDataFlowDiagram(dataFlow: DataFlow): string
- generateDependencyGraph(dependencies: Dependency[]): string

---

## 策略 (Policies/Strategies)

### AIProviderStrategy
AI 服务提供商策略

**职责**: 支持多种 AI 服务提供商的切换

**策略接口**:
- analyze(code: string, context: AnalysisContext): Promise<RawAnalysisResult>
- getName(): string
- isAvailable(): boolean

**具体策略**:
- OpenAIProvider: GPT-4 实现
- ClaudeProvider: Claude 实现（未来扩展）
- AzureOpenAIProvider: Azure OpenAI 实现（未来扩展）

### ComponentTypeStrategy
组件类型识别策略

**职责**: 根据文件路径识别组件类型

**策略接口**:
- identify(filePath: string): ComponentType
- getModuleName(filePath: string): ModuleName

**具体策略**:
- FortressComponentStrategy: 识别 Fortress 组件
- BusinessModuleStrategy: 识别业务模块组件
- SharedComponentStrategy: 识别共享组件

### BranchResolutionStrategy
分支解析策略

**职责**: 根据环境解析对应的代码分支

**策略接口**:
- resolveBranch(environment: Environment): BranchName

---

## 存储库 (Repositories)

### AnalysisRequestRepository
分析请求存储库

**职责**: 管理分析请求的持久化

**接口**:
- save(request: AnalysisRequest): void
- findById(requestId: RequestId): AnalysisRequest
- findByComponentPath(path: ComponentPath): AnalysisRequest[]

### AnalysisResultRepository
分析结果存储库

**职责**: 管理分析结果的持久化和缓存

**接口**:
- save(result: AnalysisResult): void
- findById(resultId: ResultId): AnalysisResult
- findByComponentAndBranch(path: ComponentPath, branch: BranchName, commit: CommitHash): AnalysisResult
- isCached(path: ComponentPath, branch: BranchName, commit: CommitHash): boolean

### GitRepository
Git 仓库访问

**职责**: 管理 Git 仓库的克隆和访问

**接口**:
- clone(url: string): void
- checkout(branch: BranchName): void
- pull(): void
- getFile(path: string): string
- getCurrentCommit(): CommitHash
- isCloned(): boolean

---

## 上下文映射 (Context Map)

```
┌─────────────────────────────────────────────────────────────┐
│                  Code Analysis Context                       │
│                    (Backend Service)                         │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │  Analysis   │───▶│    Code     │───▶│  Analysis   │    │
│  │   Request   │    │   Bundle    │    │   Result    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  ▲                               │
│         │                  │                               │
│         ▼                  │                               │
│  ┌─────────────┐    ┌─────────────┐                       │
│  │    AI       │    │    Git      │                       │
│  │  Analyzer   │    │   Repo      │                       │
│  └─────────────┘    └─────────────┘                       │
│         │                                                  │
└─────────│──────────────────────────────────────────────────┘
          │
          │ Conformist
          ▼
┌─────────────────────────────────────────────────────────────┐
│              External AI Service (OpenAI)                    │
└─────────────────────────────────────────────────────────────┘

          ▲
          │ Customer/Supplier
          │
┌─────────────────────────────────────────────────────────────┐
│              Config Management Context                       │
└─────────────────────────────────────────────────────────────┘
```

**关系类型**:
- 与 External AI Service: Conformist (遵从者) - 遵从外部 API 规范
- 与 Config Management: Customer/Supplier - 作为下游客户获取配置
