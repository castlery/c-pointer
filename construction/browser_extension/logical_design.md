# Browser Extension - UI/UX 逻辑设计

## 概述

本文档描述浏览器插件的 UI/UX 优化设计，包括悬浮图标、全高度 Modal 侧边栏以及交互优化。

---

## 组件架构

### 1. FloatingIcon（悬浮图标组件）

**职责**：
- 作为插件的入口点和状态指示器
- 支持拖拽定位
- 提供快速操作按钮

**状态**：
- `position: { x: number, y: number }` - 当前位置
- `isDragging: boolean` - 是否正在拖拽
- `isExpanded: boolean` - Modal 是否展开

**交互行为**：
- 点击图标：展开/收起 Modal
- 拖拽图标：移动位置（位置持久化到 localStorage）
- 点击关闭按钮：关闭插件，退出选择模式

**视觉设计**：
- 尺寸：48x48px 圆形
- 背景：渐变色 (#3B82F6 → #8B5CF6)
- 图标：🔍 或自定义 SVG
- 阴影：0 4px 12px rgba(0,0,0,0.3)
- 关闭按钮：右上角小圆点，hover 时显示

---

### 2. SidePanel（全高度侧边栏 Modal）

**职责**：
- 显示组件分析结果
- 展示代码预览
- 列出子组件

**状态**：
- `isVisible: boolean` - 是否可见
- `isLoading: boolean` - 加载状态
- `content: ModalContent` - 显示内容

**布局结构**：
```
┌─────────────────────────────┐
│ Header (组件名 + 操作按钮)    │
├─────────────────────────────┤
│ GitHub 链接区域              │
├─────────────────────────────┤
│ 子组件列表（可折叠）          │
├─────────────────────────────┤
│ 代码预览区域（可滚动）        │
└─────────────────────────────┘
```

**视觉设计**：
- 位置：页面右侧
- 宽度：400px
- 高度：100vh
- 背景：#1e1e1e
- 动画：从右侧滑入 (transform: translateX)

---

### 3. LoadingOverlay（加载状态组件）

**职责**：
- 显示分析进度
- 提供视觉反馈

**状态展示**：
1. 正在获取组件信息...
2. 正在从 GitHub 获取代码...
3. 正在分析子组件...

**视觉设计**：
- 骨架屏动画
- 进度指示器
- 脉冲动画效果

---

## 状态流转

### 插件生命周期

```
[关闭] → 点击扩展图标 → [激活/显示悬浮图标]
                              ↓
                        点击悬浮图标
                              ↓
                      [展开 Modal/选择模式]
                              ↓
                        选择组件
                              ↓
                      [加载中] → [显示结果]
                              ↓
                        点击 Modal 关闭
                              ↓
                      [收起 Modal/保留图标]
                              ↓
                        点击图标关闭按钮
                              ↓
                          [关闭]
```

### 状态定义

```typescript
type PluginState = 
  | 'closed'           // 插件关闭
  | 'icon-only'        // 仅显示悬浮图标
  | 'expanded'         // Modal 展开
  | 'loading'          // 加载中
  | 'result'           // 显示结果
  | 'error';           // 错误状态
```

---

## 交互设计

### 拖拽行为

1. **开始拖拽**：mousedown 在图标上
2. **拖拽中**：mousemove 更新位置，添加拖拽样式
3. **结束拖拽**：mouseup 保存位置到 localStorage
4. **边界限制**：确保图标不会拖出视口

### 点击判定

- 拖拽距离 < 5px 视为点击
- 拖拽距离 >= 5px 视为拖拽操作

### 键盘支持

- ESC：关闭 Modal（保留图标）
- ESC + ESC：关闭插件

---

## 动画设计

### Modal 展开/收起

- 持续时间：300ms
- 缓动函数：ease-out
- 属性：transform, opacity

### 加载动画

- 骨架屏：shimmer 效果
- 进度条：无限循环
- 图标：脉冲效果

### 高亮效果

- 预览高亮：蓝色虚线边框
- 选中高亮：绿色实线边框 + 脉冲动画

---

## 数据持久化

### localStorage 存储

```typescript
interface PluginStorage {
  iconPosition: { x: number; y: number };
  lastState: 'icon-only' | 'expanded';
}
```

---

## 错误处理

### 错误类型

1. **网络错误**：无法连接后端服务
2. **GitHub 错误**：无法获取代码
3. **解析错误**：无法识别组件

### 错误展示

- 友好的错误消息
- 重试按钮
- 详细错误信息（可展开）

---

## 响应式设计

### 视口适配

- 小屏幕（< 768px）：Modal 宽度 100%
- 中等屏幕（768px - 1024px）：Modal 宽度 350px
- 大屏幕（> 1024px）：Modal 宽度 400px

### 图标位置约束

- 最小边距：10px
- 自动调整：窗口 resize 时重新计算位置

---

## 文件结构

```
packages/browser-extension/src/content/
├── index.tsx              # 主入口（更新）
├── floatingIcon.ts        # 悬浮图标组件（新增）
├── sidePanel.ts           # 侧边栏 Modal（新增）
├── loadingOverlay.ts      # 加载状态组件（新增）
├── highlighter.ts         # 高亮器（保留）
├── componentResolver.ts   # 组件解析器（保留）
├── reactBridge.ts         # React 桥接（保留）
└── modal.ts               # 旧 Modal（废弃）
```
