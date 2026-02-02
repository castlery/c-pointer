# Browser Extension - 领域模型设计

## 限界上下文

**上下文名称**: Component Selection Context (组件选择上下文)

**职责**: 负责页面组件的选择、识别和分析结果的展示

**与其他上下文的关系**:
- 下游依赖 Backend Service Context (通过 REST API)

---

## 聚合 (Aggregates)

### 聚合 1: SelectionSession (选择会话)

**聚合根**: SelectionSession

**职责**: 管理一次组件选择会话的完整生命周期，从激活选择模式到获取分析结果

**不变量 (Invariants)**:
- 同一时间只能有一个活跃的选择会话
- 选中的组件必须是有效的 React 组件
- 分析请求必须在组件选中后才能发起

#### 实体 (Entities)

**SelectionSession**
| 属性 | 类型 | 说明 |
|------|------|------|
| sessionId | SessionId | 会话唯一标识 |
| status | SessionStatus | 会话状态 |
| selectedComponent | SelectedComponent | 当前选中的组件 |
| analysisResult | AnalysisResult | 分析结果 |
| createdAt | Timestamp | 创建时间 |
| updatedAt | Timestamp | 更新时间 |

**行为**:
- activate(): 激活选择模式
- deactivate(): 停用选择模式
- selectComponent(component): 选中组件
- clearSelection(): 清除选择
- requestAnalysis(): 请求分析
- receiveAnalysisResult(result): 接收分析结果

---

### 聚合 2: SelectedComponent (选中组件)

**聚合根**: SelectedComponent

**职责**: 表示用户在页面上选中的 React 组件

#### 实体 (Entities)

**SelectedComponent**
| 属性 | 类型 | 说明 |
|------|------|------|
| componentId | ComponentId | 组件唯一标识 |
| componentInfo | ComponentInfo | 组件基本信息 |
| domElement | DOMReference | DOM 元素引用 |
| fiberNode | FiberNodeInfo | React Fiber 节点信息 |
| boundingRect | BoundingRect | 组件边界矩形 |

**行为**:
- extractInfo(): 提取组件信息
- highlight(): 高亮显示
- clearHighlight(): 清除高亮

---

## 值对象 (Value Objects)

### SessionId
会话唯一标识符
| 属性 | 类型 |
|------|------|
| value | UUID |

### SessionStatus
会话状态枚举
| 值 | 说明 |
|----|------|
| INACTIVE | 未激活 |
| SELECTING | 选择中 |
| SELECTED | 已选中 |
| ANALYZING | 分析中 |
| COMPLETED | 已完成 |
| ERROR | 错误 |

### ComponentId
组件唯一标识符
| 属性 | 类型 |
|------|------|
| value | string |

### ComponentInfo
组件基本信息
| 属性 | 类型 | 说明 |
|------|------|------|
| displayName | string | 组件显示名称 |
| fileName | string | 源文件名 |
| filePath | string | 源文件路径 |
| componentType | ComponentType | 组件类型 |

### ComponentType
组件类型枚举
| 值 | 说明 |
|----|------|
| FORTRESS | Fortress 组件库组件 |
| BUSINESS | 业务模块组件 |
| SHARED | 共享组件 |
| UNKNOWN | 未知类型 |

### FiberNodeInfo
React Fiber 节点信息
| 属性 | 类型 | 说明 |
|------|------|------|
| tag | number | Fiber 标签 |
| type | string | 组件类型 |
| key | string | 组件 key |
| debugSource | DebugSource | 调试源信息 |

### DebugSource
调试源信息
| 属性 | 类型 |
|------|------|
| fileName | string |
| lineNumber | number |
| columnNumber | number |

### BoundingRect
边界矩形
| 属性 | 类型 |
|------|------|
| top | number |
| left | number |
| width | number |
| height | number |

### HighlightStyle
高亮样式
| 属性 | 类型 | 说明 |
|------|------|------|
| borderColor | Color | 边框颜色 |
| borderStyle | string | 边框样式 (solid/dashed) |
| borderWidth | number | 边框宽度 |

### AnalysisResult
分析结果（从后端返回）
| 属性 | 类型 |
|------|------|
| componentName | string |
| componentPath | string |
| summary | string |
| props | PropDescription[] |
| stateManagement | StateDescription |
| businessLogic | string[] |
| dataFlow | DataFlowDescription |
| dependencies | DependencyInfo[] |
| codeSnippets | CodeSnippet[] |

---

## 领域事件 (Domain Events)

### SelectionModeActivated
选择模式激活事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| activatedAt | Timestamp |

### SelectionModeDeactivated
选择模式停用事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| deactivatedAt | Timestamp |

### ComponentHovered
组件悬停事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| componentInfo | ComponentInfo |
| boundingRect | BoundingRect |

### ComponentSelected
组件选中事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| selectedComponent | SelectedComponent |
| selectedAt | Timestamp |

### SelectionCleared
选择清除事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| clearedAt | Timestamp |

### AnalysisRequested
分析请求事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| componentInfo | ComponentInfo |
| requestedAt | Timestamp |

### AnalysisCompleted
分析完成事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| analysisResult | AnalysisResult |
| completedAt | Timestamp |

### AnalysisFailed
分析失败事件
| 属性 | 类型 |
|------|------|
| sessionId | SessionId |
| errorCode | ErrorCode |
| errorMessage | string |
| failedAt | Timestamp |

---

## 领域服务 (Domain Services)

### ReactDevToolsBridge
React DevTools 桥接服务

**职责**: 与 React DevTools 协议交互，获取组件 Fiber 信息

**接口**:
- isReactPage(): boolean - 检测页面是否使用 React
- getReactVersion(): string - 获取 React 版本
- getFiberFromElement(element: DOMElement): FiberNodeInfo - 从 DOM 获取 Fiber
- getComponentProps(fiber: FiberNodeInfo): Props - 获取组件 props
- getComponentState(fiber: FiberNodeInfo): State - 获取组件 state

### ComponentIdentifier
组件识别服务

**职责**: 识别组件类型和提取组件信息

**接口**:
- identifyComponentType(filePath: string): ComponentType - 识别组件类型
- extractComponentInfo(fiber: FiberNodeInfo): ComponentInfo - 提取组件信息
- findParentComponent(element: DOMElement): SelectedComponent - 查找父组件

### HighlightRenderer
高亮渲染服务

**职责**: 在页面上渲染组件高亮效果

**接口**:
- showPreviewHighlight(rect: BoundingRect): void - 显示预览高亮
- showSelectionHighlight(rect: BoundingRect, type: ComponentType): void - 显示选中高亮
- clearHighlight(): void - 清除高亮
- showTypeLabel(rect: BoundingRect, type: ComponentType): void - 显示类型标签

### AnalysisApiClient
分析 API 客户端服务

**职责**: 与后端分析服务通信

**接口**:
- analyze(request: AnalyzeRequest): Promise<AnalysisResult> - 发起分析请求
- checkHealth(): Promise<HealthStatus> - 健康检查
- cancelAnalysis(requestId: string): void - 取消分析

---

## 存储库 (Repositories)

### SessionRepository
会话存储库

**职责**: 管理选择会话的持久化（使用浏览器内存）

**接口**:
- getCurrentSession(): SelectionSession - 获取当前会话
- saveSession(session: SelectionSession): void - 保存会话
- clearSession(): void - 清除会话

### ConfigRepository
配置存储库

**职责**: 管理插件配置的持久化（使用 Chrome Storage）

**接口**:
- getBackendUrl(): string - 获取后端服务地址
- setBackendUrl(url: string): void - 设置后端服务地址
- getConfig(): ExtensionConfig - 获取完整配置
- saveConfig(config: ExtensionConfig): void - 保存配置

---

## 上下文映射 (Context Map)

```
┌─────────────────────────────────────────────────────────────┐
│              Component Selection Context                     │
│                   (Browser Extension)                        │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ Selection   │    │  Selected   │    │  Analysis   │    │
│  │  Session    │───▶│  Component  │───▶│   Result    │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                              ▲              │
└──────────────────────────────────────────────│──────────────┘ 
                                               │
                                    Customer/Supplier
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Code Analysis Context                         │
│                  (Backend Service)                           │
└─────────────────────────────────────────────────────────────┘
```

**关系类型**: Customer/Supplier (客户/供应商)
- Browser Extension 是下游客户
- Backend Service 是上游供应商
- 通过 REST API 进行防腐层隔离
