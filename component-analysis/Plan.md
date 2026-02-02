# 组件源码 AI 分析功能计划

## 目标
在后端服务中集成大模型，对获取到的组件源代码进行智能分析，生成标准化的组件分析报告。

---

## 实施步骤

### 阶段一：大模型选型与配置
- [x] 1.1 调研免费/低成本大模型 API 选项
- [x] 1.2 确定最终选型方案（Ollama 本地部署）
- [x] 1.3 创建 AI 服务配置模块
- [x] 1.4 实现 API 调用封装

### 阶段二：组件分析模型设计
- [x] 2.1 定义标准组件分析报告数据结构
- [x] 2.2 设计 Prompt 模板
- [x] 2.3 实现分析结果解析器
- [x] 2.4 创建 AI 分析服务

### 阶段三：后端服务集成
- [x] 3.1 修改 analysisService 集成 AI 分析
- [x] 3.2 添加分析结果缓存策略
- [x] 3.3 实现错误处理和降级方案

### 阶段四：前端展示优化
- [x] 4.1 修改 sidePanel 默认折叠源码区域
- [x] 4.2 添加 AI 分析结果展示区域
- [x] 4.3 优化加载状态和错误提示

---

## 问题

### 大模型选型

[Question] 大模型 API 选择偏好？
- 选项 A: OpenAI GPT-3.5-turbo（需要 API Key，有免费额度）
- 选项 B: Google Gemini（免费额度较多）
- 选项 C: Cloudflare Workers AI（免费额度）
- 选项 D: 本地部署 Ollama（完全免费，需要本地资源）
- 选项 E: 其他（请指定）

[Answer] 
- 使用 Ollama, 我在本地以及部署并且启动了  Ollama，你可以在代码中进行配置连接

[Question] 是否需要支持多个大模型提供商的切换？
[Answer] 
- 预留切换的逻辑

[Question] 分析结果是否需要持久化存储（数据库）？还是仅使用内存缓存？
[Answer] 
- 根据业务场景进行分析数据库缓存的必要性，考虑到我们的web项目是经常比较庞大，且每两周就有发布版本进行迭代

### 分析报告内容

[Question] 组件分析报告需要包含哪些内容？当前计划：
1. 组件功能概述
2. 关键业务逻辑说明
3. 交互逻辑分析
4. 事件处理机制
5. 状态变化流程
6. 潜在优化建议

是否需要调整或补充？
[Answer] 
- 无

[Question] 分析报告的语言偏好？
- 选项 A: 中文
- 选项 B: 英文
- 选项 C: 根据用户设置自动切换

[Answer] 
- 根据用户的选择进行切换，默认中文

---

## 技术方案概述

### 大模型候选方案对比

| 方案 | 优点 | 缺点 | 免费额度 |
|------|------|------|----------|
| OpenAI GPT-3.5 | 质量稳定、文档完善 | 需要付费 | $5 新用户额度 |
| Google Gemini | 免费额度多、支持长上下文 | API 可能不稳定 | 60 QPM 免费 |
| Cloudflare AI | 完全免费、延迟低 | 模型能力有限 | 10K 请求/天 |
| Ollama 本地 | 完全免费、隐私安全 | 需要本地 GPU | 无限制 |

### 标准分析报告结构（草案）

```
ComponentAnalysisReport {
  summary: string           // 组件功能概述
  businessLogic: {          // 业务逻辑
    description: string
    keyFunctions: string[]
  }
  interactions: {           // 交互逻辑
    userActions: string[]
    systemResponses: string[]
  }
  eventHandling: {          // 事件处理
    events: EventInfo[]
  }
  stateFlow: {              // 状态变化
    states: StateInfo[]
    transitions: string[]
  }
  suggestions?: string[]    // 优化建议（可选）
}
```

---

## 依赖项

### 后端新增依赖
- AI SDK（根据选型确定）
- 可能需要的 token 计数库

### 配置项
- AI_PROVIDER: 大模型提供商
- AI_API_KEY: API 密钥
- AI_MODEL: 模型名称
- AI_MAX_TOKENS: 最大 token 数
- AI_TEMPERATURE: 温度参数

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| API 调用失败 | 实现降级方案，返回基础分析结果 |
| 响应时间过长 | 设置超时，使用流式响应 |
| 成本超支 | 实现缓存，限制调用频率 |
| 分析质量不稳定 | 优化 Prompt，添加结果验证 |

---

## 待审核

请审核以上计划，并回答 [Question] 标签中的问题。确认后我将开始执行。
