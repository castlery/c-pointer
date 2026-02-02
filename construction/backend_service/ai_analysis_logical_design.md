# AI 组件分析服务 - 逻辑设计

## 概述

本文档描述后端服务集成大模型进行组件源码智能分析的逻辑设计。

---

## 领域模型

### 核心实体

#### ComponentAnalysisReport（组件分析报告）

分析报告是 AI 分析的核心输出，包含对组件的全面解读。

**属性**：
- `id`: 报告唯一标识
- `componentName`: 组件名称
- `analyzedAt`: 分析时间
- `summary`: 功能概述
- `businessLogic`: 业务逻辑分析
- `interactions`: 交互逻辑分析
- `eventHandling`: 事件处理分析
- `stateFlow`: 状态流转分析
- `suggestions`: 优化建议

#### AnalysisContext（分析上下文）

提供给 AI 的上下文信息。

**属性**：
- `sourceCode`: 组件源代码
- `filePath`: 文件路径
- `componentType`: 组件类型
- `childComponents`: 子组件列表
- `dependencies`: 依赖信息

### 值对象

#### BusinessLogicInfo（业务逻辑信息）
- `description`: 业务逻辑描述
- `keyFunctions`: 关键函数列表
- `dataProcessing`: 数据处理逻辑

#### InteractionInfo（交互信息）
- `userActions`: 用户操作列表
- `systemResponses`: 系统响应列表
- `flowDescription`: 交互流程描述

#### EventHandlerInfo（事件处理信息）
- `eventName`: 事件名称
- `handler`: 处理函数名
- `description`: 处理逻辑描述
- `sideEffects`: 副作用说明

#### StateFlowInfo（状态流转信息）
- `stateName`: 状态名称
- `type`: 状态类型（local/redux/context）
- `transitions`: 状态转换描述
- `triggers`: 触发条件

---

## 服务架构

### AIAnalysisService（AI 分析服务）

**职责**：
- 构建分析 Prompt
- 调用大模型 API
- 解析分析结果
- 处理错误和降级

**接口**：
```
analyzeComponent(context: AnalysisContext): Promise<ComponentAnalysisReport>
```

**依赖**：
- AIProvider（AI 提供商抽象）
- PromptBuilder（Prompt 构建器）
- ResultParser（结果解析器）

### AIProvider（AI 提供商抽象）

**职责**：
- 封装不同 AI 提供商的 API 调用
- 统一响应格式
- 处理认证和限流

**实现**：
- OpenAIProvider
- GeminiProvider
- CloudflareAIProvider
- OllamaProvider

**接口**：
```
complete(prompt: string, options: CompletionOptions): Promise<string>
```

### PromptBuilder（Prompt 构建器）

**职责**：
- 根据分析上下文构建 Prompt
- 管理 Prompt 模板
- 控制 token 使用

**Prompt 结构**：
1. 系统角色定义
2. 分析任务说明
3. 输出格式要求
4. 组件源代码
5. 上下文信息

### ResultParser（结果解析器）

**职责**：
- 解析 AI 返回的文本
- 验证结果结构
- 处理解析错误

---

## 数据流

### 分析流程

```
1. 接收分析请求
   ↓
2. 获取组件源代码（已有）
   ↓
3. 构建分析上下文
   ↓
4. 检查缓存
   ↓ (缓存未命中)
5. 构建 Prompt
   ↓
6. 调用 AI API
   ↓
7. 解析响应
   ↓
8. 验证结果
   ↓
9. 缓存结果
   ↓
10. 返回分析报告
```

### 降级流程

```
AI 调用失败
   ↓
检查错误类型
   ↓
├─ 超时 → 返回基础分析 + 提示
├─ 限流 → 排队重试
├─ 认证失败 → 返回基础分析 + 错误提示
└─ 其他 → 返回基础分析
```

---

## 集成点

### 与 AnalysisService 集成

修改现有 `generateAnalysisResult` 函数：

1. 在获取源代码后，调用 AIAnalysisService
2. 将 AI 分析结果合并到现有结果中
3. 保持向后兼容（AI 分析失败时使用现有逻辑）

### 与前端集成

扩展 API 响应结构：

```
AnalyzeResponse {
  ...existing fields
  aiAnalysis?: ComponentAnalysisReport
}
```

---

## 配置管理

### 环境变量

```
# AI 提供商配置
AI_PROVIDER=openai|gemini|cloudflare|ollama
AI_API_KEY=xxx
AI_API_BASE_URL=https://api.openai.com/v1

# 模型配置
AI_MODEL=gpt-3.5-turbo
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.3

# 功能开关
AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_TIMEOUT=30000
```

### 配置优先级

1. 环境变量
2. 配置文件
3. 默认值

---

## 缓存策略

### 缓存键

```
ai-analysis:{componentPath}:{codeHash}:{modelVersion}
```

### 缓存时间

- 成功结果：24 小时
- 失败结果：不缓存

### 缓存失效

- 源代码变更（通过 hash 检测）
- 模型版本更新
- 手动清除

---

## 错误处理

### 错误类型

| 错误类型 | 处理方式 |
|----------|----------|
| API_TIMEOUT | 返回基础分析，标记超时 |
| RATE_LIMITED | 延迟重试，最多 3 次 |
| AUTH_FAILED | 返回基础分析，记录错误 |
| PARSE_ERROR | 返回原始文本，标记解析失败 |
| UNKNOWN | 返回基础分析，记录详细错误 |

### 降级策略

AI 分析不可用时，返回现有的基础分析结果，确保服务可用性。

---

## 性能考虑

### 响应时间优化

1. 使用流式响应（如果 AI 提供商支持）
2. 并行处理多个组件分析
3. 预热常用组件的分析缓存

### Token 优化

1. 压缩源代码（移除注释、空行）
2. 只发送关键代码片段
3. 使用简洁的 Prompt

### 成本控制

1. 实现请求限流
2. 优先使用缓存
3. 监控 API 使用量

---

## 监控与日志

### 关键指标

- AI 调用成功率
- 平均响应时间
- Token 使用量
- 缓存命中率

### 日志记录

- 每次 AI 调用的输入/输出
- 错误详情
- 性能数据

---

## 安全考虑

### API 密钥保护

- 使用环境变量存储
- 不在日志中输出
- 定期轮换

### 数据隐私

- 不发送敏感业务数据
- 考虑使用本地模型（Ollama）处理敏感代码

---

## 扩展性

### 支持新的 AI 提供商

1. 实现 AIProvider 接口
2. 注册到 ProviderFactory
3. 添加配置项

### 支持新的分析维度

1. 扩展 AnalysisContext
2. 更新 Prompt 模板
3. 扩展 ResultParser
