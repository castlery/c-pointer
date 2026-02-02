import type { ComponentInfo } from '@component-analyzer/shared';
import { 
  isReactPage, 
  findNearestComponent, 
  extractComponentInfo 
} from './reactBridge';
import {
  showPreviewHighlight,
  hidePreviewHighlight,
  showSelectedHighlight,
  clearAllHighlights,
  removeAllOverlays
} from './highlighter';
import {
  resolveComponent,
  getElementContext,
  findInspectorPath
} from './componentResolver';
import {
  showFloatingIcon,
  hideFloatingIcon,
  removeFloatingIcon,
  setIconState
} from './floatingIcon';
import {
  showPanel,
  hidePanel,
  removePanel,
  isPanelVisible,
  setSelectModeState,
  setSelectedComponent,
  addAssistantMessage,
  setLoadingState,
  setError,
  onSendMessage,
  clearComponent,
  updateStreamingMessage,
  type ChildComponent,
  type SelectedComponent
} from './sidePanel';

// 插件状态
type PluginState = 'closed' | 'icon-only' | 'expanded' | 'selecting';

let pluginState: PluginState = 'closed';
let isSelectionActive = false;
let selectedComponent: ComponentInfo | null = null;
let lastLogTime = 0;

/**
 * 检查元素是否属于我们的 UI
 */
function isOurElement(element: HTMLElement | null): boolean {
  if (!element) return false;
  if (element.id?.startsWith('analyzer-')) return true;
  if (element.closest('#analyzer-side-panel')) return true;
  if (element.closest('#analyzer-floating-icon')) return true;
  if (element.closest('[id^="analyzer-"]')) return true;
  return false;
}

/**
 * 处理鼠标移动 - 高亮预览
 */
function handleMouseMove(event: MouseEvent): void {
  if (!isSelectionActive) return;
  
  const target = event.target as HTMLElement;
  if (isOurElement(target)) return;
  
  const now = Date.now();
  if (!lastLogTime || now - lastLogTime > 1000) {
    console.log('[Component Analyzer] mousemove on:', target.tagName, target.className?.substring?.(0, 30) || '');
    lastLogTime = now;
  }
  
  const result = findNearestComponent(target);
  showPreviewHighlight(result?.element || target);
}

/**
 * 处理点击 - 选中组件
 */
function handleClick(event: MouseEvent): void {
  if (!isSelectionActive) return;
  
  const target = event.target as HTMLElement;
  if (isOurElement(target)) return;
  
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  
  const result = findNearestComponent(target);
  const fiberInfo = result ? {
    displayName: extractComponentInfo(result.fiber).displayName,
    filePath: extractComponentInfo(result.fiber).filePath
  } : undefined;
  
  const resolved = resolveComponent(target, fiberInfo);
  const elementContext = getElementContext(target);
  const inspectorInfo = findInspectorPath(target);
  
  const componentInfo: ComponentInfo = {
    displayName: resolved.displayName,
    fileName: resolved.displayName + '.tsx',
    filePath: resolved.possiblePaths[0] || null,
    componentType: resolved.componentType,
    resolveInfo: {
      confidence: resolved.confidence,
      source: resolved.source,
      possiblePaths: resolved.possiblePaths,
      metadata: resolved.metadata as any
    },
    inspectorInfo: inspectorInfo || undefined,
    elementContext
  };
  
  selectedComponent = componentInfo;
  
  hidePreviewHighlight();
  showSelectedHighlight(result?.element || target, componentInfo.componentType);
  
  // 选中后退出选择模式，让页面可以正常浏览
  deactivateSelection();
  
  // 构建 GitHub URL
  const githubUrl = inspectorInfo 
    ? `https://github.com/castlery/joyboy/blob/master/${inspectorInfo.filePath}#L${inspectorInfo.line}`
    : '';
  
  // 设置已选组件（不自动触发分析）
  const selectedComp: SelectedComponent = {
    name: componentInfo.displayName,
    filePath: inspectorInfo?.filePath || componentInfo.filePath || '',
    githubUrl,
    line: inspectorInfo?.line,
    code: '',
    childComponents: [],
  };
  
  // 更新面板状态
  setSelectedComponent(selectedComp);
  
  // 显示面板
  showPanel({
    componentName: selectedComp.name,
    filePath: selectedComp.filePath,
    githubUrl: selectedComp.githubUrl,
    line: selectedComp.line,
    code: '',
    childComponents: [],
    loading: false,
    onSelectMode: handleToggleSelectMode
  }, handlePanelClose);
  
  pluginState = 'expanded';
  setIconState(true);
  
  // 获取组件代码（后台获取，不阻塞 UI）
  chrome.runtime.sendMessage({
    type: 'GET_COMPONENT_CODE',
    payload: componentInfo
  }, (response) => {
    console.log('[Component Analyzer] GET_COMPONENT_CODE response:', response);
    if (response?.code) {
      // 更新组件代码
      selectedComp.code = response.code;
      selectedComp.childComponents = response.childComponents || [];
      setSelectedComponent(selectedComp);
    }
  });
  
  // 打印日志
  console.log('%c[Component Analyzer] 🎯 Component Selected', 'color: #22C55E; font-weight: bold');
  if (inspectorInfo) {
    console.log('📍 Inspector Path:', inspectorInfo.filePath);
    console.log('📍 GitHub URL:', githubUrl);
  }
}

/**
 * 处理键盘事件
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (isPanelVisible()) {
      // 第一次 ESC：关闭面板
      hidePanel();
      pluginState = 'icon-only';
      setIconState(false);
      clearAllHighlights();
    } else if (pluginState !== 'closed') {
      // 第二次 ESC：关闭插件
      deactivatePlugin();
    }
  }
}

/**
 * 阻止事件
 */
function blockEvent(event: Event): void {
  if (!isSelectionActive) return;
  const target = event.target as HTMLElement;
  if (isOurElement(target)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}

/**
 * 激活选择模式
 */
function activateSelection(): void {
  if (isSelectionActive) return;
  
  isSelectionActive = true;
  document.body.style.cursor = 'crosshair';
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  ['mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick'].forEach(type => {
    document.addEventListener(type, blockEvent, true);
  });
  
  // 同步面板按钮状态
  setSelectModeState(true);
  
  console.log('%c[Component Analyzer] ✅ Selection mode ACTIVATED', 'color: #22C55E; font-weight: bold');
}

/**
 * 停用选择模式
 */
function deactivateSelection(): void {
  if (!isSelectionActive) return;
  
  isSelectionActive = false;
  document.body.style.cursor = '';
  
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  
  ['mousedown', 'mouseup', 'dblclick', 'contextmenu', 'auxclick'].forEach(type => {
    document.removeEventListener(type, blockEvent, true);
  });
  
  clearAllHighlights();
  
  // 同步面板按钮状态
  setSelectModeState(false);
}

/**
 * 激活插件
 */
function activatePlugin(): void {
  if (pluginState !== 'closed') return;
  
  pluginState = 'icon-only';
  
  showFloatingIcon(
    handleIconClick,
    handleIconClose
  );
  
  console.log('%c[Component Analyzer] 🚀 Plugin ACTIVATED', 'color: #3B82F6; font-weight: bold');
}

/**
 * 停用插件
 */
function deactivatePlugin(): void {
  deactivateSelection();
  hidePanel();
  removeFloatingIcon();
  removePanel();
  selectedComponent = null;
  pluginState = 'closed';
  
  chrome.runtime.sendMessage({ type: 'SELECTION_CLEARED' });
  console.log('%c[Component Analyzer] ❌ Plugin DEACTIVATED', 'color: #EF4444; font-weight: bold');
}

/**
 * 处理悬浮图标点击 - 打开/关闭 modal
 */
function handleIconClick(): void {
  if (isPanelVisible()) {
    // 收起面板
    hidePanel();
    pluginState = 'icon-only';
    setIconState(false);
  } else {
    // 展开面板
    pluginState = 'expanded';
    setIconState(true);
    
    // 设置消息发送回调
    onSendMessage(handleSendChatMessage);
    
    showPanel({
      componentName: '',
      filePath: '',
      githubUrl: '',
      code: '',
      childComponents: [],
      loading: false,
      onSelectMode: handleToggleSelectMode
    }, handlePanelClose);
  }
}

/**
 * 处理发送聊天消息
 */
function handleSendChatMessage(question: string, component: SelectedComponent): void {
  console.log('[Component Analyzer] Sending chat message:', question, 'for component:', component.name);
  
  // 发送到 background script
  chrome.runtime.sendMessage({
    type: 'CHAT_SEND_MESSAGE',
    payload: {
      question: question || '', // 空字符串表示使用默认分析
      component: {
        name: component.name,
        filePath: component.filePath,
        githubUrl: component.githubUrl,
        line: component.line,
        code: component.code,
      }
    }
  }, (response) => {
    console.log('[Component Analyzer] CHAT_SEND_MESSAGE response:', response);
    
    if (response?.error) {
      setError(response.error);
    } else if (response?.answer) {
      addAssistantMessage(response.answer, response.tokenUsage?.total);
    }
  });
}

/**
 * 处理悬浮图标关闭
 */
function handleIconClose(): void {
  deactivatePlugin();
}

/**
 * 处理面板关闭
 */
function handlePanelClose(): void {
  pluginState = 'icon-only';
  setIconState(false);
  deactivateSelection();
  clearAllHighlights();
}

/**
 * 处理切换选择模式（从 Modal 按钮触发）
 */
function handleToggleSelectMode(): void {
  if (isSelectionActive) {
    // 退出选择模式
    deactivateSelection();
    clearAllHighlights();
  } else {
    // 进入选择模式
    activateSelection();
  }
}

/**
 * 处理分析结果（兼容旧的 ANALYSIS_RESULT 消息）
 */
function handleAnalysisResult(result: any): void {
  console.log('[Component Analyzer] handleAnalysisResult called:', result);
  
  if (!result) {
    console.log('[Component Analyzer] No result received');
    return;
  }
  
  // 如果有 AI 分析结果，添加为消息
  if (result.aiAnalysis) {
    let analysisContent = '';
    
    if (result.aiAnalysis.summary) {
      analysisContent += `## 概述\n${result.aiAnalysis.summary}\n\n`;
    }
    if (result.aiAnalysis.businessLogic?.description) {
      analysisContent += `## 业务逻辑\n${result.aiAnalysis.businessLogic.description}\n\n`;
    }
    if (result.aiAnalysis.interactions?.flowDescription) {
      analysisContent += `## 交互逻辑\n${result.aiAnalysis.interactions.flowDescription}`;
    }
    
    if (analysisContent) {
      addAssistantMessage(analysisContent, result.aiAnalysis.meta?.tokensUsed);
    }
    
    console.log('%c[Component Analyzer] 🤖 AI analysis added to chat', 'color: #22C55E');
  }
}

// ============ 消息监听 ============

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[Component Analyzer] Message received:', message.type);
  
  switch (message.type) {
    case 'ACTIVATE_SELECTION':
      activatePlugin();
      handleIconClick(); // 自动展开并开始选择
      sendResponse({ success: true, isActive: true });
      break;
      
    case 'DEACTIVATE_SELECTION':
      deactivatePlugin();
      sendResponse({ success: true, isActive: false });
      break;
      
    case 'GET_STATUS':
      sendResponse({
        isActive: pluginState !== 'closed',
        isReactPage: isReactPage(),
        selectedComponent,
        pluginState
      });
      break;
      
    case 'ANALYSIS_RESULT':
      handleAnalysisResult(message.payload);
      sendResponse({ success: true });
      break;
    
    case 'CHAT_MESSAGE_RESPONSE':
      // 处理聊天响应
      if (message.payload?.error) {
        setError(message.payload.error);
      } else if (message.payload?.answer) {
        addAssistantMessage(message.payload.answer, message.payload.tokenUsage?.total);
      }
      sendResponse({ success: true });
      break;
    
    case 'CHAT_STREAM_CHUNK':
      // 处理流式响应
      if (message.payload?.content) {
        const { content, isComplete } = message.payload;
        updateStreamingMessage(content, isComplete);
      }
      sendResponse({ success: true });
      break;
    
    case 'CHAT_TOKEN_WARNING':
      // Token 超限警告
      setError(message.payload?.message || '上下文已超出限制，请重新选择组件');
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true;
});

// ============ 初始化 ============

/**
 * 检查是否为 Castlery 测试环境
 */
function isCastleryTestEnvironment(): boolean {
  const hostname = window.location.hostname;
  const isCastlery = hostname.includes('www-test.castlery.com') || 
         hostname.includes('castlery.com') ||
         hostname.includes('localhost');
  console.log('[Component Analyzer] Environment check:', hostname, 'isCastlery:', isCastlery);
  return isCastlery;
}

/**
 * 延迟初始化 - 不影响页面渲染性能
 */
function initializePlugin(): void {
  console.log('[Component Analyzer] initializePlugin called, current state:', pluginState);
  
  // 如果已经激活，不重复初始化
  if (pluginState !== 'closed') {
    console.log('[Component Analyzer] Plugin already active, skipping init');
    return;
  }
  
  if (isCastleryTestEnvironment()) {
    console.log('%c[Component Analyzer] 🏠 Castlery environment detected, activating...', 'color: #844025; font-weight: bold');
    // 自动激活插件（仅显示悬浮图标，不自动展开）
    activatePlugin();
  } else {
    console.log('%c[Component Analyzer] ⏸️ Non-Castlery environment, plugin standby', 'color: #9E9E9E');
  }
}

window.addEventListener('beforeunload', () => {
  removeAllOverlays();
  removeFloatingIcon();
  removePanel();
});

// 立即初始化（不等待 idle）
console.log('[Component Analyzer] Setting up initialization...');
console.log('[Component Analyzer] document.readyState:', document.readyState);

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // 页面已加载，延迟一小段时间后初始化
  setTimeout(initializePlugin, 500);
} else {
  // 等待 DOM 加载完成
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializePlugin, 500);
  });
}

console.log('%c[Component Analyzer] 📦 Content script loaded', 'color: #8B5CF6; font-weight: bold');
console.log('Page URL:', window.location.href);
