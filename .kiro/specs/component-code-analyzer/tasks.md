# Implementation Plan: Component Code Analyzer

## Overview

本实现计划将组件代码分析器分为两个主要部分：Chrome浏览器插件和后端分析服务。采用增量开发方式，先搭建核心框架，再逐步实现各功能模块。技术栈使用 TypeScript，浏览器插件使用 Chrome Extension Manifest V3，后端使用 Node.js + Express。

## Tasks

- [ ] 1. 项目初始化和基础架构搭建
  - [ ] 1.1 创建后端服务项目结构
    - 初始化 Node.js + Express + TypeScript 项目
    - 配置 ESLint、Prettier、tsconfig
    - 创建目录结构：src/api、src/services、src/utils、src/types
    - _Requirements: 6.1_

  - [ ] 1.2 创建浏览器插件项目结构
    - 初始化 Chrome Extension Manifest V3 项目
    - 配置 React + TailwindCSS 用于插件UI
    - 创建目录结构：src/background、src/content、src/popup、src/panel
    - _Requirements: 7.1_

  - [ ] 1.3 定义共享类型和接口
    - 创建 ComponentInfo、AnalysisResult、AnalyzeRequest 等核心类型定义
    - 创建错误类型 ErrorCode 和 AppError 定义
    - _Requirements: 1.3, 3.5, 4.1_

- [ ] 2. Checkpoint - 确保项目结构正确
  - 确保所有配置文件正确，项目可以编译运行，如有问题请询问用户

- [ ] 3. 浏览器插件 - React DevTools Bridge 实现
  - [ ] 3.1 实现 React 检测功能
    - 实现 isReactPage() 检测页面是否使用 React
    - 实现 getReactVersion() 获取 React 版本
    - _Requirements: 8.1_

  - [ ] 3.2 实现 Fiber 节点访问功能
    - 实现 getFiberFromElement() 从 DOM 元素获取 Fiber 节点
    - 实现 getComponentProps() 获取组件 props
    - 实现 getComponentState() 获取组件 state
    - _Requirements: 8.1, 8.2_

  - [ ]* 3.3 编写 React DevTools Bridge 属性测试
    - **Property 2: 组件信息提取正确性**
    - **Validates: Requirements 1.3, 8.2**

- [ ] 4. 浏览器插件 - Component Selector 实现
  - [ ] 4.1 实现组件选择模式
    - 实现 activate() 和 deactivate() 控制选择模式
    - 实现鼠标悬停时的组件预览边框显示
    - 实现点击时的组件高亮显示
    - _Requirements: 1.1, 1.2, 7.2_

  - [ ] 4.2 实现组件信息提取
    - 实现 getComponentAtPoint() 获取指定位置的组件信息
    - 提取组件的 displayName、filePath、componentType
    - 实现父组件回退逻辑（当选中非组件元素时）
    - _Requirements: 1.3, 1.4, 8.2_

  - [ ] 4.3 实现组件类型判断
    - 实现 determineComponentType() 判断 fortress/business/shared/unknown
    - 根据文件路径识别 Fortress 组件和业务模块组件
    - _Requirements: 8.3, 8.4_

  - [ ]* 4.4 编写 Component Selector 属性测试
    - **Property 1: 组件选择高亮正确性**
    - **Property 3: 父组件回退正确性**
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [ ] 5. Checkpoint - 确保组件选择功能正常
  - 确保所有测试通过，组件选择功能可以正常工作，如有问题请询问用户

- [ ] 6. 后端服务 - 项目配置管理实现
  - [ ] 6.1 实现配置数据模型
    - 创建 ProjectConfig、EnvironmentConfig、MarketConfig 类型
    - 实现配置文件的读取和保存功能
    - 创建默认配置（Joyboy 项目的 Git 仓库、环境、市场配置）
    - _Requirements: 9.1, 9.2_

  - [ ] 6.2 实现环境和分支映射
    - 实现根据环境（test/uat）选择对应分支的逻辑
    - 实现多市场（US/CA/AU/UK/SG）的域名映射
    - _Requirements: 9.3, 9.4, 9.5_

  - [ ]* 6.3 编写配置管理属性测试
    - **Property 11: 环境分支映射正确性**
    - **Property 12: 配置持久化正确性**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 7. 后端服务 - Nx Workspace Parser 实现
  - [ ] 7.1 实现工作区解析功能
    - 实现 parseWorkspace() 解析 Nx 工作区配置
    - 解析 project.json 和 tsconfig.json 获取项目信息
    - 构建 WorkspaceInfo 包含所有项目的元数据
    - _Requirements: 6.3, 6.4_

  - [ ] 7.2 实现组件路径查找功能
    - 实现 findComponentPath() 根据组件名查找源文件路径
    - 支持在 libs/modules、libs/fortress、libs/shared 中查找
    - _Requirements: 2.1, 6.3_

  - [ ] 7.3 实现模块依赖分析功能
    - 实现 getModuleDependencies() 获取模块依赖关系
    - 构建 DependencyGraph 包含节点和边的信息
    - _Requirements: 6.4_

  - [ ]* 7.4 编写 Nx Workspace Parser 属性测试
    - **Property 4: Nx工作区路径解析正确性**
    - **Property 6: 组件类型判断正确性**
    - **Validates: Requirements 2.1, 6.3, 8.3, 8.4**

- [ ] 8. 后端服务 - Code Fetcher 实现
  - [ ] 8.1 实现 Git 仓库操作
    - 使用 simple-git 库实现仓库克隆和分支切换
    - 实现仓库缓存机制，避免重复克隆
    - _Requirements: 6.2_

  - [ ] 8.2 实现组件代码获取
    - 实现 fetchComponentCode() 获取单个组件的源代码
    - 解析 import 语句收集相关文件
    - 构建 ComponentCodeBundle 包含主文件和相关文件
    - _Requirements: 2.1, 2.4_

  - [ ] 8.3 实现业务模块三层代码获取
    - 实现 fetchModuleCode() 获取 components/services/domain 三层代码
    - 自动识别模块边界并收集完整代码
    - _Requirements: 2.2, 6.5_

  - [ ] 8.4 实现 Fortress 组件代码获取
    - 实现从 libs/fortress 获取 Fortress 组件定义
    - _Requirements: 2.3_

  - [ ] 8.5 实现错误处理
    - 实现文件未找到、仓库访问失败等错误处理
    - 返回明确的错误信息
    - _Requirements: 2.5, 6.6_

  - [ ]* 8.6 编写 Code Fetcher 属性测试
    - **Property 5: 业务模块三层代码获取完整性**
    - **Validates: Requirements 2.2, 6.5**

- [ ] 9. Checkpoint - 确保代码获取功能正常
  - 确保所有测试通过，代码获取功能可以正常工作，如有问题请询问用户

- [ ] 10. 后端服务 - AI Analyzer 实现
  - [ ] 10.1 实现 AI 分析接口
    - 集成 OpenAI GPT-4 API
    - 实现 analyzeComponent() 方法
    - 构建分析 prompt 模板
    - _Requirements: 3.1, 3.2_

  - [ ] 10.2 实现 TypeScript 代码解析
    - 使用 TypeScript Compiler API 解析类型定义
    - 提取 props、state、hooks 信息
    - _Requirements: 3.1, 3.2_

  - [ ] 10.3 实现 Redux 状态追踪
    - 识别 useSelector、useDispatch 调用
    - 追踪 Redux actions 和 reducers
    - _Requirements: 3.3, 3.4_

  - [ ] 10.4 实现分析结果格式化
    - 生成结构化的 AnalysisResult
    - 包含 summary、props、stateManagement、businessLogic、dataFlow
    - _Requirements: 3.5_

  - [ ]* 10.5 编写 AI Analyzer 属性测试
    - **Property 7: 分析结果结构完整性**
    - **Property 8: Redux状态追踪正确性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [ ] 11. 后端服务 - API Gateway 实现
  - [ ] 11.1 实现 REST API 端点
    - 实现 POST /api/analyze 分析组件端点
    - 实现 GET /api/health 健康检查端点
    - 实现 GET /api/config 获取配置端点
    - _Requirements: 6.1_

  - [ ] 11.2 实现请求验证和错误处理
    - 验证 AnalyzeRequest 请求参数
    - 统一错误响应格式
    - _Requirements: 6.1, 6.6_

  - [ ] 11.3 实现分析结果缓存
    - 基于组件路径、分支、commit hash 生成缓存键
    - 实现缓存读取和写入
    - _Requirements: 3.5_

- [ ] 12. Checkpoint - 确保后端服务完整
  - 确保所有测试通过，后端 API 可以正常响应请求，如有问题请询问用户

- [ ] 13. 浏览器插件 - Result Panel 实现
  - [ ] 13.1 实现结果展示组件
    - 创建 ResultPanel React 组件
    - 展示组件功能概述（自然语言描述）
    - 展示 props 列表和说明
    - _Requirements: 4.1, 4.2_

  - [ ] 13.2 实现交互逻辑和状态展示
    - 展示组件的交互逻辑和状态变化
    - 展示 Redux 状态依赖
    - _Requirements: 4.3_

  - [ ] 13.3 实现依赖关系可视化
    - 使用 Mermaid 渲染数据流图
    - 展示组件依赖关系图表
    - _Requirements: 4.4_

  - [ ] 13.4 实现代码片段展开功能
    - 支持展开查看具体代码片段
    - 代码高亮显示
    - _Requirements: 4.5_

  - [ ] 13.5 实现加载和错误状态
    - 实现 showLoading() 加载状态
    - 实现 showError() 错误信息展示
    - _Requirements: 4.1_

  - [ ]* 13.6 编写 Result Panel 属性测试
    - **Property 9: 结果展示完整性**
    - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ] 14. 浏览器插件 - Markdown 导出功能
  - [ ] 14.1 实现 Markdown 导出
    - 实现 exportToMarkdown() 方法
    - 包含组件名称、功能描述、逻辑说明
    - _Requirements: 5.1, 5.2_

  - [ ] 14.2 实现代码片段嵌入选项
    - 支持用户选择是否包含代码片段
    - 在导出文件中嵌入相关代码
    - _Requirements: 5.3_

  - [ ]* 14.3 编写 Markdown 导出属性测试
    - **Property 10: Markdown导出格式正确性**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 15. 浏览器插件 - 主界面和配置
  - [ ] 15.1 实现 Popup 界面
    - 创建插件激活/停用按钮
    - 显示当前页面的 React 检测状态
    - _Requirements: 7.2_

  - [ ] 15.2 实现 Side Panel 界面
    - 创建侧边面板用于展示分析结果
    - 集成 ResultPanel 组件
    - _Requirements: 7.4_

  - [ ] 15.3 实现后端服务地址配置
    - 提供配置界面设置后端服务地址
    - 保存配置到 Chrome Storage
    - _Requirements: 7.5_

  - [ ] 15.4 实现手动输入组件路径功能
    - 当自动识别失败时，允许用户手动输入组件路径
    - _Requirements: 8.5_

- [ ] 16. 浏览器插件 - 与后端服务集成
  - [ ] 16.1 实现 API 调用服务
    - 创建 ApiService 封装后端 API 调用
    - 实现组件分析请求发送
    - _Requirements: 7.3_

  - [ ] 16.2 实现完整分析流程
    - 连接组件选择 → API 调用 → 结果展示的完整流程
    - 处理各种错误情况
    - _Requirements: 7.3, 7.4_

- [ ] 17. Checkpoint - 确保端到端流程正常
  - 确保所有测试通过，完整的分析流程可以正常工作，如有问题请询问用户

- [ ] 18. 错误处理和降级策略
  - [ ] 18.1 实现统一错误处理
    - 实现 AppError 类和错误码定义
    - 实现用户友好的错误提示
    - _Requirements: 2.5, 6.6_

  - [ ] 18.2 实现降级策略
    - 组件识别降级：React DevTools → DOM属性 → 手动输入
    - 代码获取降级：完整模块 → 单文件 → 缓存版本
    - AI分析降级：完整分析 → 基础AST分析 → 类型分析
    - _Requirements: 2.5, 6.6, 8.5_

- [ ] 19. Final Checkpoint - 确保所有功能完整
  - 确保所有测试通过，所有功能正常工作，如有问题请询问用户

## Notes

- 标记 `*` 的任务为可选任务，可以跳过以加快 MVP 开发
- 每个任务都引用了具体的需求编号以便追溯
- Checkpoint 任务用于确保增量验证
- 属性测试验证系统的正确性属性
- 单元测试验证具体示例和边界情况
