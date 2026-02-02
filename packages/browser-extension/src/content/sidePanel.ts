/**
 * Fortress Design System - Side Panel (Drawer) Component
 * 
 * 对话式组件分析面板 - 模仿 Cursor/Kiro IDE 交互模式
 * 
 * 布局结构：
 * - Header: Logo + Title + Close Button
 * - Message Area: 对话消息列表（flex: 1, overflow: auto）
 * - Input Area: 组件标签 + 输入框 + 发送按钮（flex-shrink: 0）
 */

// ============ 类型定义 ============

export interface ChildComponent {
  name: string;
  path: string;
  githubUrl: string;
  line?: number;
}

export interface SelectedComponent {
  name: string;
  filePath: string;
  githubUrl: string;
  line?: number;
  code: string;
  childComponents: ChildComponent[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  componentName?: string; // 关联的组件名称
}

export interface AIAnalysisReport {
  summary: string;
  businessLogic: {
    description: string;
    keyFunctions: Array<{ name: string; purpose: string }>;
    dataProcessing?: string;
  };
  interactions: {
    userActions: Array<{ action: string; response: string }>;
    flowDescription: string;
  };
  eventHandling: {
    events: Array<{
      eventName: string;
      handlerName: string;
      description: string;
      sideEffects?: string[];
    }>;
    summary: string;
  };
  stateFlow: {
    states: Array<{
      name: string;
      type: string;
      description: string;
      initialValue?: string;
    }>;
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
      description: string;
    }>;
  };
  suggestions?: string[];
  meta: {
    analyzedAt: string;
    model: string;
    language: string;
    tokensUsed?: number;
    duration?: number;
  };
}

// 面板状态类型
export type PanelStatus = 'idle' | 'selecting' | 'ready' | 'loading' | 'chatting';

export interface PanelState {
  status: PanelStatus;
  selectedComponent: SelectedComponent | null;
  // 当前对话关联的组件（发送后保留用于上下文）
  contextComponent: SelectedComponent | null;
  messages: ChatMessage[];
  inputValue: string;
  tokenUsage: number;
  tokenLimit: number;
  error: string | null;
}

// 兼容旧接口
export interface PanelContent {
  componentName: string;
  filePath: string;
  githubUrl: string;
  line?: number;
  code: string;
  childComponents: ChildComponent[];
  loading?: boolean;
  error?: string;
  onSelectMode?: () => void;
  aiAnalysis?: AIAnalysisReport;
}

export interface HistoryItem {
  id: string;
  componentName: string;
  filePath: string;
  githubUrl: string;
  line?: number;
  code: string;
  childComponents: ChildComponent[];
  timestamp: number;
  aiAnalysis?: AIAnalysisReport;
}

// ============ Design Tokens ============
const DESIGN = {
  colors: {
    terracotta: '#844025',
    orange: '#D25C1B',
    maroon: '#3C101E',
    warmLinen: '#FBF9F4',
    warmLinenLight: '#F6F3E7',
    white: '#FFFFFF',
    mono100: '#EDEDED',
    mono300: '#BEBEBE',
    mono500: '#9E9E9E',
    charcoal: '#323433',
    mono700: '#616161',
    mono900: '#212121',
    fortress: '#8B5CF6',
    business: '#F59E0B',
    shared: '#06B6D4',
    success: '#22C55E',
    info: '#3B82F6',
    error: '#EF4444',
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '32px',
    8: '40px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '60px',
  },
  shadow: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 4px 12px rgba(0, 0, 0, 0.1)',
    lg: '-8px 0 24px rgba(0, 0, 0, 0.12)',
  },
  font: {
    serif: "'Georgia', 'Times New Roman', serif",
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'SF Mono', 'Fira Code', Monaco, Consolas, monospace",
  },
};

const PANEL_WIDTH = 480;
const TOKEN_LIMIT = 8000;

// ============ 状态管理 ============

let panelContainer: HTMLDivElement | null = null;
let isVisible = false;
let onCloseCallback: (() => void) | null = null;
let onSelectModeCallback: (() => void) | null = null;
let onSendMessageCallback: ((message: string, component: SelectedComponent) => void) | null = null;

let panelState: PanelState = {
  status: 'idle',
  selectedComponent: null,
  contextComponent: null,
  messages: [],
  inputValue: '',
  tokenUsage: 0,
  tokenLimit: TOKEN_LIMIT,
  error: null,
};

// ============ 工具函数 ============

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ============ 面板容器 ============

function createPanelContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'fortress-analyzer-panel';
  container.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: ${PANEL_WIDTH}px;
    height: 100vh;
    background: ${DESIGN.colors.warmLinen};
    box-shadow: ${DESIGN.shadow.lg};
    z-index: 2147483647;
    font-family: ${DESIGN.font.sans};
    transform: translateX(100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  document.body.appendChild(container);
  return container;
}

// ============ 样式注入 ============

function injectStyles(): void {
  const styleId = 'fortress-panel-styles';
  if (document.getElementById(styleId)) return;
  
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #fortress-message-area::-webkit-scrollbar { width: 4px; }
    #fortress-message-area::-webkit-scrollbar-track { background: transparent; }
    #fortress-message-area::-webkit-scrollbar-thumb { background: ${DESIGN.colors.mono300}; border-radius: 8px; }
    #fortress-message-area::-webkit-scrollbar-thumb:hover { background: ${DESIGN.colors.terracotta}; }
    
    @keyframes fortress-spin { 
      0% { transform: rotate(0deg); } 
      100% { transform: rotate(360deg); } 
    }
    @keyframes fortress-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    @keyframes fortress-fade-in {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes fortress-typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
    }
    
    #fortress-close-btn:hover { 
      color: ${DESIGN.colors.maroon}; 
      background: ${DESIGN.colors.warmLinenLight};
    }
    
    .fortress-input-area {
      background: ${DESIGN.colors.white};
      border-top: 1px solid ${DESIGN.colors.mono100};
      padding: ${DESIGN.spacing[4]};
      flex-shrink: 0;
    }
    
    .fortress-component-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: ${DESIGN.colors.warmLinenLight};
      border: 1px solid ${DESIGN.colors.terracotta};
      border-radius: ${DESIGN.radius.md};
      padding: 6px 10px;
      font-size: 13px;
      color: ${DESIGN.colors.terracotta};
      margin-bottom: ${DESIGN.spacing[3]};
      max-width: 100%;
    }
    
    .fortress-component-tag-close {
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
      flex-shrink: 0;
    }
    .fortress-component-tag-close:hover {
      opacity: 1;
    }
    
    .fortress-input-row {
      display: flex;
      align-items: flex-end;
      gap: ${DESIGN.spacing[2]};
    }
    
    .fortress-select-btn {
      width: 40px;
      height: 40px;
      border-radius: ${DESIGN.radius.md};
      border: 1px solid ${DESIGN.colors.mono300};
      background: ${DESIGN.colors.white};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${DESIGN.colors.mono700};
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .fortress-select-btn:hover {
      border-color: ${DESIGN.colors.terracotta};
      color: ${DESIGN.colors.terracotta};
      background: ${DESIGN.colors.warmLinenLight};
    }
    .fortress-select-btn.active {
      border-color: ${DESIGN.colors.success};
      color: ${DESIGN.colors.success};
      background: rgba(34, 197, 94, 0.1);
    }
    
    .fortress-text-input {
      flex: 1;
      min-height: 40px;
      max-height: 120px;
      padding: 10px 12px;
      border: 1px solid ${DESIGN.colors.mono300};
      border-radius: ${DESIGN.radius.md};
      font-family: ${DESIGN.font.sans};
      font-size: 14px;
      color: ${DESIGN.colors.charcoal};
      resize: none;
      outline: none;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    .fortress-text-input:focus {
      border-color: ${DESIGN.colors.terracotta};
    }
    .fortress-text-input:disabled {
      background: ${DESIGN.colors.warmLinenLight};
      cursor: not-allowed;
    }
    .fortress-text-input::placeholder {
      color: ${DESIGN.colors.mono500};
    }
    
    .fortress-send-btn {
      width: 40px;
      height: 40px;
      border-radius: ${DESIGN.radius.md};
      border: none;
      background: ${DESIGN.colors.terracotta};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${DESIGN.colors.warmLinen};
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .fortress-send-btn:hover {
      background: ${DESIGN.colors.maroon};
    }
    .fortress-send-btn:disabled {
      background: ${DESIGN.colors.mono300};
      cursor: not-allowed;
    }
    
    .fortress-message {
      animation: fortress-fade-in 0.3s ease;
      margin-bottom: ${DESIGN.spacing[3]};
    }
    
    .fortress-message-user {
      display: flex;
      justify-content: flex-end;
    }
    .fortress-message-user .fortress-message-content {
      background: ${DESIGN.colors.terracotta};
      color: ${DESIGN.colors.warmLinen};
      border-radius: ${DESIGN.radius.lg} ${DESIGN.radius.lg} ${DESIGN.radius.sm} ${DESIGN.radius.lg};
      max-width: 85%;
    }
    
    .fortress-message-assistant {
      display: flex;
      justify-content: flex-start;
    }
    .fortress-message-assistant .fortress-message-content {
      background: ${DESIGN.colors.white};
      color: ${DESIGN.colors.charcoal};
      border: 1px solid ${DESIGN.colors.mono100};
      border-radius: ${DESIGN.radius.lg} ${DESIGN.radius.lg} ${DESIGN.radius.lg} ${DESIGN.radius.sm};
      max-width: 90%;
    }
    
    .fortress-message-content {
      padding: ${DESIGN.spacing[3]} ${DESIGN.spacing[4]};
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .fortress-typing-indicator {
      display: flex;
      gap: 4px;
      padding: ${DESIGN.spacing[3]} ${DESIGN.spacing[4]};
    }
    .fortress-typing-dot {
      width: 8px;
      height: 8px;
      background: ${DESIGN.colors.mono500};
      border-radius: 50%;
      animation: fortress-typing 1.4s infinite;
    }
    .fortress-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .fortress-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    
    .fortress-progress-ring {
      transform: rotate(-90deg);
    }
  `;
  document.head.appendChild(style);
}


// ============ 渲染函数 ============

function renderPanel(): void {
  if (!panelContainer) return;

  const headerHtml = renderHeader();
  const messageAreaHtml = renderMessageArea();
  const inputAreaHtml = renderInputArea();

  panelContainer.innerHTML = `
    ${headerHtml}
    ${messageAreaHtml}
    ${inputAreaHtml}
  `;

  injectStyles();
  bindEvents();
  scrollToBottom();
}

function renderHeader(): string {
  return `
    <div id="fortress-panel-header" style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: ${DESIGN.spacing[4]} ${DESIGN.spacing[5]};
      background: ${DESIGN.colors.warmLinen};
      border-bottom: 1px solid ${DESIGN.colors.mono100};
      flex-shrink: 0;
    ">
      <div style="display: flex; align-items: center; gap: ${DESIGN.spacing[3]};">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, ${DESIGN.colors.terracotta} 0%, ${DESIGN.colors.orange} 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${DESIGN.colors.warmLinen}" stroke-width="2">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
        </div>
        <div>
          <h1 style="
            font-family: ${DESIGN.font.serif};
            font-size: 16px;
            font-weight: 400;
            color: ${DESIGN.colors.maroon};
            margin: 0;
          ">Component Analyzer</h1>
          <p style="
            font-size: 11px;
            color: ${DESIGN.colors.mono500};
            margin: 2px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">Fortress DevTools</p>
        </div>
      </div>
      <button id="fortress-close-btn" style="
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${DESIGN.colors.mono500};
        border-radius: 8px;
        transition: all 0.2s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  `;
}

function renderMessageArea(): string {
  const { status, messages } = panelState;
  
  let content = '';
  
  if (messages.length === 0) {
    content = renderWelcomeState();
  } else {
    content = messages.map(msg => renderMessage(msg)).join('');
    
    if (status === 'loading') {
      content += renderTypingIndicator();
    }
  }
  
  if (panelState.tokenUsage > panelState.tokenLimit * 0.8) {
    content += renderTokenWarning();
  }
  
  return `
    <div id="fortress-message-area" style="
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: ${DESIGN.spacing[4]};
    ">
      ${content}
    </div>
  `;
}

function renderWelcomeState(): string {
  const { status } = panelState;
  
  if (status === 'selecting') {
    return `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        padding: ${DESIGN.spacing[6]};
      ">
        <div style="
          width: 80px;
          height: 80px;
          margin-bottom: ${DESIGN.spacing[5]};
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.1);
          border-radius: 50%;
          animation: fortress-pulse 1.5s infinite;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${DESIGN.colors.success}" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h2 style="
          font-family: ${DESIGN.font.serif};
          font-size: 18px;
          font-weight: 400;
          color: ${DESIGN.colors.maroon};
          margin: 0 0 ${DESIGN.spacing[2]} 0;
        ">选择组件中...</h2>
        <p style="
          font-size: 14px;
          color: ${DESIGN.colors.mono700};
          line-height: 1.5;
          margin: 0;
        ">点击页面上的任意组件进行分析</p>
      </div>
    `;
  }
  
  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: ${DESIGN.spacing[6]};
    ">
      <div style="
        width: 80px;
        height: 80px;
        margin-bottom: ${DESIGN.spacing[5]};
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(132, 64, 37, 0.08) 0%, rgba(210, 92, 27, 0.08) 100%);
        border-radius: 50%;
      ">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${DESIGN.colors.terracotta}" stroke-width="1.2">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
          <circle cx="12" cy="12" r="3" fill="${DESIGN.colors.orange}" stroke="none"/>
        </svg>
      </div>
      
      <h2 style="
        font-family: ${DESIGN.font.serif};
        font-size: 18px;
        font-weight: 400;
        color: ${DESIGN.colors.maroon};
        margin: 0 0 ${DESIGN.spacing[2]} 0;
      ">开始分析组件</h2>
      
      <p style="
        font-size: 14px;
        color: ${DESIGN.colors.mono700};
        line-height: 1.5;
        margin: 0 0 ${DESIGN.spacing[4]} 0;
      ">点击左下角的选择按钮，选择页面上的 React 组件</p>
      
      <div style="
        padding: ${DESIGN.spacing[3]};
        background: ${DESIGN.colors.warmLinenLight};
        border-radius: ${DESIGN.radius.md};
        width: 100%;
        max-width: 240px;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 12px; color: ${DESIGN.colors.charcoal};">关闭面板</span>
          <kbd style="
            background: ${DESIGN.colors.white};
            border: 1px solid ${DESIGN.colors.mono300};
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 11px;
            font-family: ${DESIGN.font.mono};
            color: ${DESIGN.colors.mono700};
          ">ESC</kbd>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 12px; color: ${DESIGN.colors.charcoal};">发送消息</span>
          <kbd style="
            background: ${DESIGN.colors.white};
            border: 1px solid ${DESIGN.colors.mono300};
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 11px;
            font-family: ${DESIGN.font.mono};
            color: ${DESIGN.colors.mono700};
          ">Enter</kbd>
        </div>
      </div>
    </div>
  `;
}

function renderMessage(msg: ChatMessage): string {
  const isUser = msg.role === 'user';
  const roleClass = isUser ? 'fortress-message-user' : 'fortress-message-assistant';
  
  const content = msg.isStreaming 
    ? msg.content + '<span style="animation: fortress-pulse 1s infinite;">▊</span>'
    : renderMarkdown(msg.content);
  
  const timeStr = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // 用户消息显示组件名称
  const componentBadge = isUser && msg.componentName ? `
    <div style="
      font-size: 11px;
      color: rgba(255,255,255,0.8);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 4px;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
      ${escapeHtml(msg.componentName)}
    </div>
  ` : '';
  
  return `
    <div class="fortress-message ${roleClass}">
      <div class="fortress-message-content">
        ${componentBadge}
        <div style="word-break: break-word;">${content}</div>
        <div style="
          font-size: 10px;
          color: ${isUser ? 'rgba(255,255,255,0.6)' : DESIGN.colors.mono500};
          margin-top: 6px;
          text-align: ${isUser ? 'right' : 'left'};
        ">${timeStr}</div>
      </div>
    </div>
  `;
}

function renderTypingIndicator(): string {
  return `
    <div class="fortress-message fortress-message-assistant">
      <div class="fortress-message-content fortress-typing-indicator">
        <div class="fortress-typing-dot"></div>
        <div class="fortress-typing-dot"></div>
        <div class="fortress-typing-dot"></div>
      </div>
    </div>
  `;
}

function renderTokenWarning(): string {
  const percentage = Math.round((panelState.tokenUsage / panelState.tokenLimit) * 100);
  const isOverLimit = panelState.tokenUsage >= panelState.tokenLimit;
  
  return `
    <div style="
      margin-top: ${DESIGN.spacing[3]};
      padding: ${DESIGN.spacing[3]};
      background: ${isOverLimit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'};
      border: 1px solid ${isOverLimit ? DESIGN.colors.error : DESIGN.colors.business};
      border-radius: ${DESIGN.radius.md};
      font-size: 12px;
      color: ${isOverLimit ? DESIGN.colors.error : DESIGN.colors.business};
    ">
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <strong>${isOverLimit ? '上下文已超限' : '上下文接近限制'}</strong>
      </div>
      <p style="margin: 0; line-height: 1.4;">
        ${isOverLimit 
          ? '请重新选择组件开始新对话。' 
          : `当前使用 ${percentage}%，建议尽快完成分析。`}
      </p>
    </div>
  `;
}

/**
 * 渲染圆环进度指示器
 */
function renderProgressRing(percentage: number): string {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // 根据百分比确定颜色
  let color = DESIGN.colors.success;
  if (percentage > 80) {
    color = DESIGN.colors.error;
  } else if (percentage > 60) {
    color = DESIGN.colors.business;
  }
  
  return `
    <div style="position: relative; width: ${size}px; height: ${size}px;" title="上下文使用: ${percentage}%">
      <svg class="fortress-progress-ring" width="${size}" height="${size}">
        <!-- 背景圆环 -->
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${DESIGN.colors.mono100}"
          stroke-width="${strokeWidth}"
        />
        <!-- 进度圆环 -->
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius}"
          fill="none"
          stroke="${color}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          stroke-linecap="round"
        />
      </svg>
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 9px;
        font-weight: 600;
        color: ${color};
      ">${percentage}%</div>
    </div>
  `;
}


function renderInputArea(): string {
  const { status, selectedComponent, contextComponent, inputValue, tokenUsage, tokenLimit } = panelState;
  const isDisabled = status === 'loading' || status === 'selecting';
  const hasComponent = selectedComponent !== null;
  const hasContext = contextComponent !== null || hasComponent;
  const canSend = hasContext && status !== 'loading';
  
  // 计算 token 使用百分比
  const tokenPercentage = Math.min(Math.round((tokenUsage / tokenLimit) * 100), 100);
  
  // 组件标签 - 只在选择了新组件且未发送时显示
  const componentTagHtml = hasComponent ? `
    <div class="fortress-component-tag">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 9h6v6H9z"/>
      </svg>
      <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(selectedComponent.name)}
      </span>
      <span id="fortress-component-close" class="fortress-component-tag-close" title="清除组件">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </div>
  ` : '';
  
  // Placeholder 文本
  let placeholder = '请先选择组件...';
  if (status === 'selecting') {
    placeholder = '正在选择组件...';
  } else if (hasComponent) {
    placeholder = '输入问题，或直接发送进行默认分析...';
  } else if (contextComponent) {
    placeholder = '继续提问...';
  }
  
  return `
    <div class="fortress-input-area">
      ${componentTagHtml}
      <div class="fortress-input-row">
        <!-- 选择组件按钮 -->
        <button 
          id="fortress-select-btn" 
          class="fortress-select-btn ${status === 'selecting' ? 'active' : ''}"
          title="${status === 'selecting' ? '选择中...' : '选择组件'}"
          ${isDisabled && status !== 'selecting' ? 'disabled' : ''}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        
        <!-- Token 进度圆环 -->
        ${hasContext ? renderProgressRing(tokenPercentage) : ''}
        
        <!-- 输入框 -->
        <textarea 
          id="fortress-input" 
          class="fortress-text-input"
          placeholder="${placeholder}"
          rows="1"
          ${isDisabled || !hasContext ? 'disabled' : ''}
        >${escapeHtml(inputValue)}</textarea>
        
        <!-- 发送按钮 -->
        <button 
          id="fortress-send-btn" 
          class="fortress-send-btn"
          title="发送"
          ${!canSend ? 'disabled' : ''}
        >
          ${status === 'loading' ? `
            <div style="
              width: 18px;
              height: 18px;
              border: 2px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: fortress-spin 0.8s linear infinite;
            "></div>
          ` : `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `}
        </button>
      </div>
    </div>
  `;
}

/**
 * Markdown 转 HTML
 */
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  let html = text;
  
  // 处理标题 ### 
  html = html.replace(/^###\s+(.+)$/gm, 
    `<div style="color: ${DESIGN.colors.terracotta}; font-weight: 600; margin: 12px 0 6px 0; font-size: 13px;">$1</div>`);
  
  // 处理标题 ## 
  html = html.replace(/^##\s+(.+)$/gm, 
    `<div style="color: ${DESIGN.colors.maroon}; font-weight: 600; margin: 14px 0 8px 0; font-size: 14px;">$1</div>`);
  
  // 粗体 **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, 
    `<strong style="color: ${DESIGN.colors.maroon}; font-weight: 600;">$1</strong>`);
  
  // 代码块 ```code```
  html = html.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
    const escapedCode = escapeHtml(code.trim());
    return `<pre style="
      background: ${DESIGN.colors.mono900};
      color: ${DESIGN.colors.warmLinen};
      padding: 10px;
      border-radius: 6px;
      font-family: ${DESIGN.font.mono};
      font-size: 11px;
      line-height: 1.4;
      overflow-x: auto;
      margin: 8px 0;
      white-space: pre-wrap;
      word-break: break-all;
    "><code>${escapedCode}</code></pre>`;
  });
  
  // 行内代码 \`code\`
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escapedCode = escapeHtml(code);
    return `<code style="
      background: ${DESIGN.colors.mono100};
      padding: 1px 4px;
      border-radius: 3px;
      font-family: ${DESIGN.font.mono};
      font-size: 12px;
      color: ${DESIGN.colors.terracotta};
    ">${escapedCode}</code>`;
  });
  
  // 数字列表 1. 2. 3.
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, 
    `<div style="display: flex; gap: 6px; margin: 4px 0;">
      <span style="color: ${DESIGN.colors.terracotta}; font-weight: 500; min-width: 16px;">$1.</span>
      <span style="flex: 1;">$2</span>
    </div>`);
  
  // 无序列表 - 或 *
  html = html.replace(/^[-*]\s+(.+)$/gm, 
    `<div style="display: flex; gap: 6px; margin: 4px 0;">
      <span style="color: ${DESIGN.colors.terracotta};">•</span>
      <span style="flex: 1;">$1</span>
    </div>`);
  
  // 双换行变段落间距
  html = html.replace(/\n\n+/g, '<div style="height: 10px;"></div>');
  
  // 单换行变 <br>
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

// ============ 事件绑定 ============

function bindEvents(): void {
  const closeBtn = document.getElementById('fortress-close-btn');
  closeBtn?.addEventListener('click', () => {
    hidePanel();
    onCloseCallback?.();
  });

  const selectBtn = document.getElementById('fortress-select-btn');
  selectBtn?.addEventListener('click', () => {
    if (panelState.status === 'selecting') {
      panelState.status = panelState.selectedComponent ? 'ready' : (panelState.contextComponent ? 'chatting' : 'idle');
    } else {
      panelState.status = 'selecting';
    }
    renderPanel();
    onSelectModeCallback?.();
  });

  const componentClose = document.getElementById('fortress-component-close');
  componentClose?.addEventListener('click', () => {
    // 只清除待发送的组件，不清除上下文
    panelState.selectedComponent = null;
    panelState.status = panelState.contextComponent ? 'chatting' : 'idle';
    renderPanel();
  });

  const input = document.getElementById('fortress-input') as HTMLTextAreaElement;
  if (input) {
    input.addEventListener('input', () => {
      panelState.inputValue = input.value;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
  }

  const sendBtn = document.getElementById('fortress-send-btn');
  sendBtn?.addEventListener('click', handleSend);
}

function handleSend(): void {
  const { selectedComponent, contextComponent, inputValue, status } = panelState;
  
  // 使用当前选择的组件，或者上下文中的组件
  const componentToUse = selectedComponent || contextComponent;
  
  if (!componentToUse || status === 'loading') return;
  
  const question = inputValue.trim();
  
  // 添加用户消息，包含组件名称
  const userMessage: ChatMessage = {
    id: generateId(),
    role: 'user',
    content: question || '请分析这个组件',
    timestamp: Date.now(),
    componentName: selectedComponent?.name, // 只有新选择的组件才显示名称
  };
  panelState.messages.push(userMessage);
  
  // 发送后：
  // 1. 将选择的组件设为上下文组件
  // 2. 清空当前选择的组件（不再显示标签）
  // 3. 清空输入框
  if (selectedComponent) {
    panelState.contextComponent = selectedComponent;
    panelState.selectedComponent = null;
  }
  panelState.inputValue = '';
  panelState.status = 'loading';
  
  renderPanel();
  
  // 调用回调发送消息
  if (onSendMessageCallback) {
    onSendMessageCallback(question, componentToUse);
  }
}

function scrollToBottom(): void {
  const messageArea = document.getElementById('fortress-message-area');
  if (messageArea) {
    messageArea.scrollTop = messageArea.scrollHeight;
  }
}

// ============ 公共 API ============

export function showPanel(content: PanelContent, onClose?: () => void): void {
  if (!panelContainer) {
    panelContainer = createPanelContainer();
  }
  
  onCloseCallback = onClose || null;
  onSelectModeCallback = content.onSelectMode || null;
  
  if (content.componentName && content.componentName !== '') {
    panelState.selectedComponent = {
      name: content.componentName,
      filePath: content.filePath,
      githubUrl: content.githubUrl,
      line: content.line,
      code: content.code,
      childComponents: content.childComponents,
    };
    panelState.status = content.loading ? 'loading' : 'ready';
  }
  
  renderPanel();
  
  requestAnimationFrame(() => {
    if (panelContainer) {
      panelContainer.style.transform = 'translateX(0)';
    }
  });
  isVisible = true;
}

export function hidePanel(): void {
  if (panelContainer) {
    panelContainer.style.transform = 'translateX(100%)';
  }
  isVisible = false;
}

export function removePanel(): void {
  panelContainer?.remove();
  panelContainer = null;
  isVisible = false;
  onCloseCallback = null;
  onSelectModeCallback = null;
  onSendMessageCallback = null;
  
  panelState = {
    status: 'idle',
    selectedComponent: null,
    contextComponent: null,
    messages: [],
    inputValue: '',
    tokenUsage: 0,
    tokenLimit: TOKEN_LIMIT,
    error: null,
  };
  
  const style = document.getElementById('fortress-panel-styles');
  style?.remove();
}

export function isPanelVisible(): boolean {
  return isVisible;
}

export function setSelectModeState(active: boolean): void {
  panelState.status = active ? 'selecting' : (panelState.selectedComponent ? 'ready' : (panelState.contextComponent ? 'chatting' : 'idle'));
  if (panelContainer) {
    renderPanel();
  }
}

export function setSelectedComponent(component: SelectedComponent | null): void {
  if (component) {
    // 如果是新组件，清空之前的对话
    if (!panelState.contextComponent || panelState.contextComponent.name !== component.name) {
      panelState.messages = [];
      panelState.tokenUsage = 0;
    }
    panelState.selectedComponent = component;
    panelState.status = 'ready';
    panelState.error = null;
  } else {
    clearComponent();
  }
  
  if (panelContainer) {
    renderPanel();
  }
}

export function clearComponent(): void {
  panelState.selectedComponent = null;
  panelState.contextComponent = null;
  panelState.messages = [];
  panelState.status = 'idle';
  panelState.inputValue = '';
  panelState.tokenUsage = 0;
  panelState.error = null;
  
  if (panelContainer) {
    renderPanel();
  }
}

export function addAssistantMessage(content: string, tokenUsage?: number): void {
  const message: ChatMessage = {
    id: generateId(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
  };
  panelState.messages.push(message);
  panelState.status = 'chatting';
  
  if (tokenUsage) {
    panelState.tokenUsage += tokenUsage;
  }
  
  if (panelContainer) {
    renderPanel();
    scrollToBottom();
  }
}

export function updateStreamingMessage(content: string, isComplete: boolean = false): void {
  const lastMessage = panelState.messages[panelState.messages.length - 1];
  
  if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
    lastMessage.content = content;
    lastMessage.isStreaming = !isComplete;
    if (isComplete) {
      panelState.status = 'chatting';
    }
  } else if (!isComplete) {
    const message: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
      isStreaming: true,
    };
    panelState.messages.push(message);
  }
  
  if (panelContainer) {
    renderPanel();
    scrollToBottom();
  }
}

export function setLoadingState(loading: boolean): void {
  panelState.status = loading ? 'loading' : (panelState.messages.length > 0 ? 'chatting' : 'ready');
  if (panelContainer) {
    renderPanel();
  }
}

export function setError(error: string | null): void {
  panelState.error = error;
  panelState.status = panelState.messages.length > 0 ? 'chatting' : 'ready';
  
  if (error) {
    const errorMessage: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: `⚠️ ${error}`,
      timestamp: Date.now(),
    };
    panelState.messages.push(errorMessage);
  }
  
  if (panelContainer) {
    renderPanel();
    scrollToBottom();
  }
}

export function onSendMessage(callback: (message: string, component: SelectedComponent) => void): void {
  onSendMessageCallback = callback;
}

export function getPanelState(): PanelState {
  return { ...panelState };
}

// ============ 兼容旧 API ============

export function addToHistory(content: PanelContent): void {
  if (!content.componentName || content.loading || content.error) {
    return;
  }
  
  setSelectedComponent({
    name: content.componentName,
    filePath: content.filePath,
    githubUrl: content.githubUrl,
    line: content.line,
    code: content.code,
    childComponents: content.childComponents,
  });
  
  if (content.aiAnalysis) {
    let analysisContent = '';
    
    if (content.aiAnalysis.summary) {
      analysisContent += `## 概述\n${content.aiAnalysis.summary}\n\n`;
    }
    if (content.aiAnalysis.businessLogic?.description) {
      analysisContent += `## 业务逻辑\n${content.aiAnalysis.businessLogic.description}\n\n`;
    }
    if (content.aiAnalysis.interactions?.flowDescription) {
      analysisContent += `## 交互逻辑\n${content.aiAnalysis.interactions.flowDescription}`;
    }
    
    if (analysisContent) {
      addAssistantMessage(analysisContent, content.aiAnalysis.meta?.tokensUsed);
    }
  }
}

export function updateLoadingState(loading: boolean): void {
  setLoadingState(loading);
}

export function clearHistory(): void {
  clearComponent();
}
