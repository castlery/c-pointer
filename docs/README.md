# C-Pointer 文档索引

本文档集按职责领域拆分，优先阅读顺序如下：

## 1. 产品

- [产品总览](product/overview.md)
- [用户故事](product/user-stories.md)
- [交互设计](product/interaction-design.md)

## 2. 架构

- [整体架构](architecture/overview.md)
- [数据模型](architecture/data-model.md)
- [存储与清理策略](architecture/storage-strategy.md)

## 3. 流程

- [数据流程](flows/data-flow.md)
- [时序图](flows/sequence-diagrams.md)

## 4. AI

- [AI 上下文拼接策略](ai/context-strategy.md)
- [对话历史策略](ai/conversation-history.md)

## 5. API

- [接口定义](api/contracts.md)

## 6. 整合版

- [产品需求文档（整合版）](product-requirements.md)

## 当前推荐方案

- 形态：`Chrome 插件 + 后端服务 + GPT API`
- 支持站点：`www-test.castlery.com`、`pos-test.castlery.com`
- 源码仓库：`castlery/joyboy`
- 页面定位：依赖 `codeInspectorPlugin`
- 用户身份：按浏览器/设备维度区分，不依赖应用登录态
