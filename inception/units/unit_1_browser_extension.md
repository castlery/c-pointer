# Unit 1: 浏览器插件 (Browser Extension)

## 单元概述

浏览器插件是用户与系统交互的前端入口，负责组件选择、结果展示和用户配置。采用 Chrome Extension Manifest V3 标准开发。

## 技术栈

- Chrome Extension Manifest V3
- React 18 + TypeScript
- TailwindCSS
- Chrome Storage API

## 包含的用户故事

### Epic 1: 组件选择与识别

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-1.1 | P0 | 激活组件选择模式 |
| US-1.2 | P0 | 悬停预览组件 |
| US-1.3 | P0 | 点击选中组件 |
| US-1.4 | P0 | 识别组件类型 |
| US-1.5 | P1 | 手动输入组件路径 |

### Epic 4: 结果展示

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-4.1 | P0 | 展示分析结果 |
| US-4.2 | P1 | 展示依赖关系图 |
| US-4.3 | P1 | 展示代码片段 |
| US-4.4 | P0 | 显示加载状态 |

### Epic 5: 结果导出

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-5.1 | P2 | 导出为 Markdown |
| US-5.2 | P2 | 导出包含代码片段 |

### Epic 6: 配置管理（前端部分）

| 用户故事 | 优先级 | 描述 |
|---------|-------|------|
| US-6.1 | P0 | 配置后端服务地址 |

---

## 详细验收标准

### US-1.1 激活组件选择模式

**验收标准：**
- AC-1.1.1 点击插件图标后，页面进入组件选择模式
  - 插件图标位于 Chrome 工具栏
  - 点击后向 content script 发送激活消息
  - content script 开始监听鼠标事件
  
- AC-1.1.2 选择模式激活时，插件图标显示激活状态
  - 图标颜色从灰色变为蓝色
  - 显示 "ON" 徽章
  
- AC-1.1.3 再次点击可退出选择模式
  - 清除所有高亮效果
  - 停止监听鼠标事件
  - 图标恢复默认状态

---

### US-1.2 悬停预览组件

**验收标准：**
- AC-1.2.1 鼠标悬停时显示蓝色虚线边框
  - 边框颜色: #3B82F6 (blue-500)
  - 边框样式: 2px dashed
  - 边框圆角: 4px
  
- AC-1.2.2 边框精确匹配组件的 DOM 边界
  - 使用 getBoundingClientRect() 获取元素边界
  - 创建 overlay div 覆盖在元素上方
  - z-index 设置为 9999
  
- AC-1.2.3 鼠标移开后边框消失
  - 移除 overlay div
  - 响应时间 < 50ms

---

### US-1.3 点击选中组件

**验收标准：**
- AC-1.3.1 点击后显示绿色实线边框表示选中状态
  - 边框颜色: #22C55E (green-500)
  - 边框样式: 2px solid
  - 保持显示直到选择新组件或退出选择模式
  
- AC-1.3.2 选中后自动提取组件名称和文件路径
  - 通过 React Fiber 获取组件信息
  - 提取 displayName 或函数名
  - 提取 _debugSource 中的文件路径
  
- AC-1.3.3 如果点击的不是 React 组件，自动向上查找最近的父组件
  - 遍历 DOM 父节点
  - 检查每个节点是否有关联的 Fiber
  - 最多向上查找 10 层

---

### US-1.4 识别组件类型

**验收标准：**
- AC-1.4.1 识别 libs/fortress 下的 Fortress 组件
  - 文件路径包含 "libs/fortress" 标记为 Fortress
  
- AC-1.4.2 识别 libs/modules 下的业务模块组件
  - 文件路径包含 "libs/modules" 标记为 Business
  - 提取模块名称（如 cart, checkout, product）
  
- AC-1.4.3 识别 libs/shared 下的共享组件
  - 文件路径包含 "libs/shared" 标记为 Shared
  
- AC-1.4.4 在选中组件时显示组件类型标签
  - 在高亮边框旁显示类型标签
  - 不同类型使用不同颜色

---

### US-4.1 展示分析结果

**验收标准：**
- AC-4.1.1 在浏览器侧边面板中展示结果
  - 使用 Chrome Side Panel API
  - 面板宽度: 400px
  - 支持调整宽度
  
- AC-4.1.2 显示组件名称和类型
  - 组件名称作为标题
  - 类型标签显示在名称旁
  
- AC-4.1.3 显示功能概述（自然语言）
  - 使用卡片样式展示
  - 支持中文显示
  
- AC-4.1.4 支持滚动查看完整内容
  - 内容超出时显示滚动条
  - 支持平滑滚动

---

### US-4.4 显示加载状态

**验收标准：**
- AC-4.4.1 显示加载动画
  - 使用 spinner 动画
  - 居中显示
  
- AC-4.4.2 显示当前分析步骤
  - "正在获取组件信息..."
  - "正在获取源代码..."
  - "正在进行 AI 分析..."
  
- AC-4.4.3 支持取消分析操作
  - 显示取消按钮
  - 点击后中断请求

---

### US-6.1 配置后端服务地址

**验收标准：**
- AC-6.1.1 提供设置界面输入服务地址
  - 在 popup 页面提供设置入口
  - 输入框支持 URL 格式验证
  
- AC-6.1.2 支持保存配置到浏览器存储
  - 使用 chrome.storage.sync API
  - 配置跨设备同步
  
- AC-6.1.3 验证服务地址的可用性
  - 调用 /api/health 端点验证
  - 显示连接状态（成功/失败）

---

## 模块结构

```
browser-extension/
├── manifest.json           # 插件配置
├── src/
│   ├── background/         # Service Worker
│   │   └── index.ts
│   ├── content/            # Content Script
│   │   ├── index.ts
│   │   ├── ComponentSelector.ts
│   │   ├── ReactDevToolsBridge.ts
│   │   └── Highlighter.ts
│   ├── popup/              # Popup 页面
│   │   ├── App.tsx
│   │   └── Settings.tsx
│   ├── panel/              # Side Panel
│   │   ├── App.tsx
│   │   ├── ResultPanel.tsx
│   │   ├── LoadingState.tsx
│   │   └── ExportButton.tsx
│   ├── shared/             # 共享代码
│   │   ├── types.ts
│   │   ├── api.ts
│   │   └── storage.ts
│   └── styles/
│       └── tailwind.css
└── public/
    └── icons/
```

---

## 对外接口

### 调用后端服务 API

```typescript
// 分析组件请求
POST /api/analyze
Request: AnalyzeRequest
Response: AnalyzeResponse

// 健康检查
GET /api/health
Response: { status: 'ok' }
```

### Chrome Extension APIs

```typescript
// 消息传递
chrome.runtime.sendMessage()
chrome.tabs.sendMessage()

// 存储
chrome.storage.sync.get()
chrome.storage.sync.set()

// Side Panel
chrome.sidePanel.open()
chrome.sidePanel.setOptions()
```

---

## 依赖关系

- **依赖 Unit 2 (后端服务)**: 调用分析 API 获取结果
- **无其他单元依赖此单元**

---

## 开发里程碑

| 里程碑 | 包含功能 | 预计工时 |
|-------|---------|---------|
| M1 | 基础框架 + 组件选择 | 3 天 |
| M2 | React DevTools 集成 | 2 天 |
| M3 | 结果展示面板 | 2 天 |
| M4 | 配置管理 | 1 天 |
| M5 | 导出功能 | 1 天 |
