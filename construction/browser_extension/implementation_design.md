# Browser Extension - 实现设计

## 项目目录结构

```
packages/browser-extension/
├── src/
│   ├── background/                 # Service Worker
│   │   ├── index.ts               # 入口文件
│   │   └── messageHandler.ts      # 消息处理
│   │
│   ├── content/                    # Content Script
│   │   ├── index.ts               # 入口文件
│   │   ├── componentSelector.ts   # 组件选择器
│   │   ├── reactBridge.ts         # React DevTools 桥接
│   │   ├── highlighter.ts         # 高亮渲染器
│   │   └── styles.css             # 注入样式
│   │
│   ├── popup/                      # Popup 页面
│   │   ├── App.tsx                # 主组件
│   │   ├── main.tsx               # 入口
│   │   └── index.html             # HTML 模板
│   │
│   ├── panel/                      # Side Panel
│   │   ├── App.tsx                # 主组件
│   │   ├── main.tsx               # 入口
│   │   ├── index.html             # HTML 模板
│   │   └── components/            # UI 组件
│   │       ├── ResultPanel.tsx    # 结果展示
│   │       ├── LoadingState.tsx   # 加载状态
│   │       ├── ErrorState.tsx     # 错误状态
│   │       ├── PropsSection.tsx   # Props 展示
│   │       ├── StateSection.tsx   # 状态展示
│   │       ├── DependencyGraph.tsx # 依赖图
│   │       └── CodeSnippet.tsx    # 代码片段
│   │
│   ├── store/                      # Redux Store
│   │   ├── index.ts               # Store 配置
│   │   ├── slices/
│   │   │   ├── sessionSlice.ts    # 会话状态
│   │   │   ├── analysisSlice.ts   # 分析结果
│   │   │   └── configSlice.ts     # 配置状态
│   │   └── middleware/
│   │       └── apiMiddleware.ts   # API 调用中间件
│   │
│   ├── services/                   # 服务层
│   │   ├── apiClient.ts           # API 客户端
│   │   ├── storageService.ts      # Chrome Storage 服务
│   │   └── messageService.ts      # 消息通信服务
│   │
│   ├── hooks/                      # 自定义 Hooks
│   │   ├── useAnalysis.ts         # 分析相关
│   │   └── useConfig.ts           # 配置相关
│   │
│   ├── types/                      # 类型定义
│   │   ├── index.ts               # 导出
│   │   ├── component.ts           # 组件类型
│   │   ├── analysis.ts            # 分析类型
│   │   └── messages.ts            # 消息类型
│   │
│   └── utils/                      # 工具函数
│       ├── componentIdentifier.ts # 组件识别
│       └── exportMarkdown.ts      # Markdown 导出
│
├── public/
│   └── icons/                      # 插件图标
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── manifest.json                   # 插件配置
├── vite.config.ts                  # Vite 配置
├── tailwind.config.js              # Tailwind 配置
├── tsconfig.json                   # TypeScript 配置
└── package.json
```

---

## 组件和模块划分

### Content Script 模块

#### ComponentSelector
负责组件选择交互

**职责**:
- 监听鼠标事件（mouseover, click）
- 调用 ReactBridge 获取组件信息
- 调用 Highlighter 显示高亮

**状态**:
- isActive: boolean - 是否激活选择模式
- hoveredElement: HTMLElement | null - 当前悬停元素
- selectedElement: HTMLElement | null - 当前选中元素

#### ReactBridge
与 React DevTools 交互

**职责**:
- 检测页面是否使用 React
- 从 DOM 元素获取 Fiber 节点
- 提取组件信息（displayName, props, state）

**实现要点**:
- 通过 `__REACT_DEVTOOLS_GLOBAL_HOOK__` 访问 React 内部
- 遍历 Fiber 树查找组件信息
- 处理 React 17/18 版本差异

#### Highlighter
渲染高亮效果

**职责**:
- 创建和管理 overlay DOM 元素
- 显示预览高亮（蓝色虚线）
- 显示选中高亮（绿色实线）
- 显示组件类型标签

---

### Side Panel 组件

#### ResultPanel
分析结果主面板

**Props**:
- result: AnalysisResult | null
- isLoading: boolean
- error: string | null

**子组件**:
- SummaryCard - 功能概述
- PropsSection - Props 列表
- StateSection - 状态管理
- BusinessLogicSection - 业务逻辑
- DependencyGraph - 依赖关系图
- CodeSnippetList - 代码片段

#### LoadingState
加载状态组件

**Props**:
- step: 'fetching' | 'analyzing' | 'formatting'
- onCancel: () => void

#### ErrorState
错误状态组件

**Props**:
- error: AnalysisError
- onRetry: () => void

---

## 状态管理方案 (Redux Toolkit)

### Store 结构

```typescript
interface RootState {
  session: SessionState;
  analysis: AnalysisState;
  config: ConfigState;
}

interface SessionState {
  isActive: boolean;
  status: 'inactive' | 'selecting' | 'selected' | 'analyzing' | 'completed' | 'error';
  selectedComponent: ComponentInfo | null;
}

interface AnalysisState {
  isLoading: boolean;
  currentStep: string | null;
  result: AnalysisResult | null;
  error: AnalysisError | null;
  history: AnalysisHistoryItem[];
}

interface ConfigState {
  backendUrl: string;
  isConnected: boolean;
}
```

### Slices

#### sessionSlice
```typescript
// Actions
- activate(): 激活选择模式
- deactivate(): 停用选择模式
- selectComponent(component): 选中组件
- clearSelection(): 清除选择
- setStatus(status): 设置状态
```

#### analysisSlice
```typescript
// Actions
- startAnalysis(): 开始分析
- setStep(step): 设置当前步骤
- analysisSuccess(result): 分析成功
- analysisFailure(error): 分析失败
- clearResult(): 清除结果
- addToHistory(item): 添加到历史
```

#### configSlice
```typescript
// Actions
- setBackendUrl(url): 设置后端地址
- setConnectionStatus(status): 设置连接状态
```

### 异步操作 (createAsyncThunk)

```typescript
// 分析组件
export const analyzeComponent = createAsyncThunk(
  'analysis/analyze',
  async (componentInfo: ComponentInfo, { getState, dispatch }) => {
    dispatch(setStep('fetching'));
    const response = await apiClient.analyze(componentInfo);
    return response.result;
  }
);

// 检查后端连接
export const checkConnection = createAsyncThunk(
  'config/checkConnection',
  async (_, { getState }) => {
    const { backendUrl } = getState().config;
    const response = await apiClient.health(backendUrl);
    return response.status === 'ok';
  }
);
```

---

## 消息通信设计

### 消息类型

```typescript
// Content Script → Background
type ContentToBackgroundMessage =
  | { type: 'COMPONENT_SELECTED'; payload: ComponentInfo }
  | { type: 'SELECTION_CLEARED' }
  | { type: 'REQUEST_ANALYSIS'; payload: ComponentInfo };

// Background → Content Script
type BackgroundToContentMessage =
  | { type: 'ACTIVATE_SELECTION' }
  | { type: 'DEACTIVATE_SELECTION' }
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: AnalysisError };

// Popup/Panel → Background
type UIToBackgroundMessage =
  | { type: 'TOGGLE_SELECTION' }
  | { type: 'GET_STATUS' }
  | { type: 'UPDATE_CONFIG'; payload: Partial<ConfigState> };
```

### 通信流程

```
1. 用户点击 Popup 激活按钮
   Popup → Background: { type: 'TOGGLE_SELECTION' }
   Background → Content: { type: 'ACTIVATE_SELECTION' }

2. 用户选中组件
   Content → Background: { type: 'COMPONENT_SELECTED', payload }
   Background 更新 Store
   Side Panel 通过 Store 订阅获取更新

3. 用户请求分析
   Side Panel dispatch analyzeComponent thunk
   API 调用后端服务
   结果更新到 Store
```

---

## 构建和打包配置

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
        panel: 'src/panel/index.html',
      },
    },
  },
});
```

### Manifest V3 配置

```json
{
  "manifest_version": 3,
  "name": "Component Code Analyzer",
  "version": "1.0.0",
  "description": "分析 React 组件代码的浏览器插件",
  
  "permissions": [
    "activeTab",
    "storage",
    "sidePanel"
  ],
  
  "host_permissions": [
    "https://test.castlery.com/*",
    "https://uat.castlery.com/*",
    "http://localhost:*/*"
  ],
  
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": [
        "https://test.castlery.com/*",
        "https://uat.castlery.com/*",
        "http://localhost:*/*"
      ],
      "js": ["src/content/index.ts"],
      "css": ["src/content/styles.css"]
    }
  ],
  
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "public/icons/icon16.png",
      "48": "public/icons/icon48.png",
      "128": "public/icons/icon128.png"
    }
  },
  
  "side_panel": {
    "default_path": "src/panel/index.html"
  },
  
  "icons": {
    "16": "public/icons/icon16.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
}
```

---

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（热重载）
pnpm dev

# 构建生产版本
pnpm build

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test
```

---

## 关键实现要点

### 1. React Fiber 访问

```typescript
// 获取 React 内部 Hook
const getReactFiber = (element: HTMLElement) => {
  const key = Object.keys(element).find(
    key => key.startsWith('__reactFiber$') || 
           key.startsWith('__reactInternalInstance$')
  );
  return key ? (element as any)[key] : null;
};
```

### 2. 组件类型识别

```typescript
const identifyComponentType = (filePath: string): ComponentType => {
  if (filePath.includes('libs/fortress')) return 'fortress';
  if (filePath.includes('libs/modules')) return 'business';
  if (filePath.includes('libs/shared')) return 'shared';
  return 'unknown';
};
```

### 3. 高亮 Overlay 实现

```typescript
// 创建 overlay 元素
const createOverlay = (rect: DOMRect, style: HighlightStyle) => {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: ${style.borderWidth}px ${style.borderStyle} ${style.borderColor};
    pointer-events: none;
    z-index: 9999;
  `;
  document.body.appendChild(overlay);
  return overlay;
};
```

---

## 测试策略

### 单元测试

- componentIdentifier.ts - 组件类型识别逻辑
- exportMarkdown.ts - Markdown 导出格式
- Redux slices - 状态管理逻辑

### 集成测试

- 消息通信流程
- API 调用和错误处理

### E2E 测试

- 完整的组件选择和分析流程
- 使用 Puppeteer 或 Playwright
