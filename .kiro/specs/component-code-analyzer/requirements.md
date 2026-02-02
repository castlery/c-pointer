# Requirements Document

## Introduction

组件代码分析器（Component Code Analyzer）是一个帮助产品经理、测试人员和开发人员理解 Castlery Joyboy 前端代码的工具。当用户在测试环境、UAT环境或本地开发环境的页面上选中某个区域或组件时，该工具能够自动分析对应的源代码，并以易于理解的方式展示组件的功能逻辑，从而降低代码理解门槛，促进团队协作和产品迭代。

## 目标用户

| 用户角色 | 使用场景 | 核心需求 |
|---------|---------|---------|
| 产品经理 | 需求设计、迭代规划 | 了解组件功能逻辑，评估改动影响范围 |
| 测试人员 | 测试用例设计、回归测试 | 理解组件行为，识别测试边界 |
| 开发人员 | 本地开发、代码审查 | 快速定位组件源码，理解依赖关系 |

## 目标项目技术栈

- **Monorepo 架构**: Nx 20.4.5
- **前端框架**: Next.js 14.2.35 (App Router)
- **UI 基础库**: MUI Joy UI + Fortress 组件库
- **状态管理**: Redux Toolkit
- **类型系统**: TypeScript 5.7.3
- **包管理器**: pnpm 9.15.4

## 落地方式分析

### 使用场景

**目标用户**：测试人员、产品经理、开发人员
**使用环境**：测试环境、UAT环境、本地开发环境（非生产环境）
**核心诉求**：无需接触代码仓库，直接在浏览器中分析已部署的页面

### 推荐方案：浏览器插件 + 后端分析服务

采用**Chrome浏览器插件 + 后端代码分析服务**的组合方案：

1. **Chrome浏览器插件**：
   - 提供组件选择功能（点击页面元素）
   - 利用React DevTools协议识别组件信息
   - 识别Fortress组件和业务模块组件
   - 展示分析结果的UI面板

2. **后端分析服务**：
   - 部署在内网，可访问Joyboy代码仓库（Git）
   - 理解Nx Monorepo结构，定位libs/modules下的组件
   - 解析组件的三层结构（components/services/domain）
   - 调用AI进行代码分析
   - 返回结构化的分析结果

3. **工作流程**：
   ```
   用户点击页面组件 → 插件通过React DevTools识别组件 
   → 发送组件路径到后端 → 后端从Git获取源码（含services/domain层）
   → AI分析代码 → 返回分析结果 → 插件展示
   ```

**方案优势**：
- 非技术人员只需安装浏览器插件即可使用
- 可在测试环境、UAT环境中使用
- 源代码访问在后端完成，安全可控
- 理解Nx Monorepo结构，可分析完整的业务逻辑链路

## Glossary

- **Analyzer**: 代码分析器核心模块，负责解析和分析组件源代码
- **Component_Selector**: 组件选择器，负责在页面上捕获用户选中的区域或组件
- **Code_Fetcher**: 代码获取器，负责根据选中的组件定位并获取对应的源代码
- **Logic_Presenter**: 逻辑展示器，负责将分析结果以易于理解的方式呈现给用户
- **Browser_Extension**: 浏览器插件，提供组件选择和结果展示的前端界面
- **Backend_Service**: 后端分析服务，负责代码获取和AI分析
- **Code_Repository**: 代码仓库，存储Joyboy项目源代码的Git仓库
- **Nx_Workspace**: Nx Monorepo工作区，包含apps和libs目录结构
- **Fortress_Component**: Fortress组件库中的基础UI组件
- **Business_Module**: 业务模块，位于libs/modules下的领域模块（如cart、checkout、product）
- **Module_Layer**: 模块层级，包括components层、services层、domain层

## Requirements

### Requirement 1: 组件选择

**User Story:** 作为产品经理，我想要在页面上选中任意组件或区域，以便分析该组件的代码逻辑。

#### Acceptance Criteria

- 1.1 WHEN 用户激活选择模式并点击页面元素 THEN THE Component_Selector SHALL 高亮显示被选中的组件边界
- 1.2 WHEN 用户悬停在页面元素上 THEN THE Component_Selector SHALL 显示组件的预览边框
- 1.3 WHEN 用户选中一个组件 THEN THE Component_Selector SHALL 识别该组件的组件名称和文件路径
- 1.4 IF 用户选中的区域不是有效组件 THEN THE Component_Selector SHALL 向上查找最近的父组件并选中

### Requirement 2: 代码获取

**User Story:** 作为测试人员，我想要系统自动获取选中组件的源代码，以便进行代码分析。

#### Acceptance Criteria

- 2.1 WHEN 组件被选中 THEN THE Code_Fetcher SHALL 根据组件路径在Nx_Workspace中定位源代码文件
- 2.2 WHEN 组件属于Business_Module THEN THE Code_Fetcher SHALL 同时获取components、services、domain三层代码
- 2.3 WHEN 组件属于Fortress_Component THEN THE Code_Fetcher SHALL 获取Fortress库中的组件定义
- 2.4 WHEN 组件依赖shared库 THEN THE Code_Fetcher SHALL 收集libs/shared下的相关代码
- 2.5 IF 源代码文件无法找到 THEN THE Code_Fetcher SHALL 返回明确的错误信息

### Requirement 3: 代码分析

**User Story:** 作为产品经理，我想要AI分析组件代码的功能逻辑，以便理解组件的实际行为。

#### Acceptance Criteria

- 3.1 WHEN 源代码被获取 THEN THE Analyzer SHALL 解析组件的TypeScript类型定义和接口
- 3.2 WHEN 分析组件时 THEN THE Analyzer SHALL 识别组件的props、state和Redux状态依赖
- 3.3 WHEN 分析Business_Module组件时 THEN THE Analyzer SHALL 追踪services层的API调用和业务逻辑
- 3.4 WHEN 分析Business_Module组件时 THEN THE Analyzer SHALL 解析domain层的Redux actions和reducers
- 3.5 WHEN 分析完成 THEN THE Analyzer SHALL 生成包含数据流向的结构化分析结果

### Requirement 4: 结果展示

**User Story:** 作为产品经理，我想要以易于理解的方式查看分析结果，以便快速了解组件功能。

#### Acceptance Criteria

- 4.1 WHEN 分析结果生成 THEN THE Logic_Presenter SHALL 以自然语言描述组件的主要功能
- 4.2 WHEN 展示分析结果 THEN THE Logic_Presenter SHALL 列出组件的输入参数和输出行为
- 4.3 WHEN 展示分析结果 THEN THE Logic_Presenter SHALL 显示组件的交互逻辑和状态变化
- 4.4 WHEN 展示分析结果 THEN THE Logic_Presenter SHALL 提供组件依赖关系的可视化图表
- 4.5 WHERE 用户需要详细信息 THEN THE Logic_Presenter SHALL 支持展开查看具体代码片段

### Requirement 5: 分析结果导出

**User Story:** 作为产品经理，我想要导出分析结果，以便在产品文档或需求讨论中使用。

#### Acceptance Criteria

- 5.1 WHEN 用户请求导出 THEN THE Logic_Presenter SHALL 支持将分析结果导出为Markdown格式
- 5.2 WHEN 导出分析结果 THEN THE Logic_Presenter SHALL 包含组件名称、功能描述和逻辑说明
- 5.3 WHERE 用户选择包含代码片段 THEN THE Logic_Presenter SHALL 在导出文件中嵌入相关代码

### Requirement 6: 后端分析服务

**User Story:** 作为系统管理员，我想要部署一个后端服务来处理代码分析请求，以便安全地访问代码仓库。

#### Acceptance Criteria

- 6.1 THE Backend_Service SHALL 提供REST API接收组件分析请求
- 6.2 WHEN 收到分析请求 THEN THE Backend_Service SHALL 连接Joyboy的Git仓库
- 6.3 WHEN 获取源代码 THEN THE Backend_Service SHALL 理解Nx_Workspace结构定位libs/modules下的组件
- 6.4 THE Backend_Service SHALL 解析project.json和tsconfig.json理解模块依赖关系
- 6.5 WHEN 分析Business_Module THEN THE Backend_Service SHALL 自动收集components、services、domain三层代码
- 6.6 IF 代码仓库访问失败 THEN THE Backend_Service SHALL 返回明确的错误信息

### Requirement 7: 浏览器插件

**User Story:** 作为产品经理，我想要通过浏览器插件使用分析功能，以便无需额外配置即可使用。

#### Acceptance Criteria

- 7.1 THE Browser_Extension SHALL 在Chrome浏览器中提供组件选择功能
- 7.2 WHEN 用户激活插件 THEN THE Browser_Extension SHALL 进入组件选择模式
- 7.3 WHEN 用户点击页面元素 THEN THE Browser_Extension SHALL 识别组件信息并发送到后端服务
- 7.4 WHEN 收到分析结果 THEN THE Browser_Extension SHALL 在侧边面板中展示结果
- 7.5 THE Browser_Extension SHALL 支持配置后端服务地址

### Requirement 8: 组件识别

**User Story:** 作为测试人员，我想要系统能够准确识别页面上的组件，以便获取正确的源代码。

#### Acceptance Criteria

- 8.1 WHEN 页面使用React框架 THEN THE Browser_Extension SHALL 通过React DevTools协议获取组件Fiber信息
- 8.2 WHEN 识别到组件 THEN THE Browser_Extension SHALL 提取组件的displayName或函数名
- 8.3 WHEN 组件来自Fortress库 THEN THE Browser_Extension SHALL 标记为Fortress_Component类型
- 8.4 WHEN 组件来自libs/modules THEN THE Browser_Extension SHALL 解析出模块名称和组件路径
- 8.5 IF 无法自动识别组件 THEN THE Browser_Extension SHALL 允许用户手动输入组件路径

### Requirement 9: 项目配置管理

**User Story:** 作为系统管理员，我想要配置项目与代码仓库的映射关系，以便支持多环境分析。

#### Acceptance Criteria

- 9.1 THE Backend_Service SHALL 支持配置Joyboy项目的Git仓库地址
- 9.2 WHEN 配置项目 THEN THE Backend_Service SHALL 记录测试环境和UAT环境的域名映射
- 9.3 WHEN 测试环境请求分析 THEN THE Backend_Service SHALL 自动选择对应的测试分支代码
- 9.4 WHEN UAT环境请求分析 THEN THE Backend_Service SHALL 自动选择对应的UAT分支代码
- 9.5 THE Backend_Service SHALL 支持配置多市场（US、CA、AU、UK、SG）的环境映射

---

## 用户故事优先级

| 优先级 | 需求 | 说明 |
|-------|------|------|
| P0 (MVP) | Req 1, 2, 3, 6, 7, 8 (部分) | 第一版本必须实现：组件选择、代码获取、AI分析、后端服务、浏览器插件基础功能 |
| P1 | Req 4, 8.5, 9 | 第二版本实现：完整结果展示、手动输入、环境配置 |
| P2 | Req 5 | 后续版本实现：导出功能 |

---

## 非功能性需求

### NFR-1 性能要求
- 组件选择响应时间 < 100ms
- 代码分析完成时间 < 30s
- 结果展示渲染时间 < 500ms

### NFR-2 兼容性要求
- 支持 Chrome 浏览器 90+
- 支持 React 17+ 页面

### NFR-3 可扩展性要求
- AI 服务支持未来切换到其他提供商（如 Claude、Azure OpenAI）
- 支持未来添加更多分析维度
- 保证代码路径以及相关逻辑的真实性

### NFR-4 安全性要求
- 代码仓库访问在后端完成，不暴露给前端
- 支持 Git 凭证安全存储
- 不支持生产环境分析

### NFR-5 部署要求
- 支持开发人员本地环境使用
- 支持部署到测试环境
- 不需要权限控制（第一阶段）

---

## 相关文档

- 详细用户故事：[/inception/user_stories.md](/inception/user_stories.md)
- 单元划分文档：[/inception/units/](/inception/units/)
- 集成契约：[/inception/units/integration_contract.md](/inception/units/integration_contract.md)
