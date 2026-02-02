import type { ComponentInfo, AnalysisResult } from '@component-analyzer/shared';
import { apiClient } from '../services/apiClient';
import { storageService } from '../services/storageService';

let isActive = false;
let selectedComponent: ComponentInfo | null = null;
let analysisResult: AnalysisResult | null = null;

// 对话会话状态
interface ChatSession {
  componentName: string;
  componentCode: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  tokenUsage: number;
}

let chatSession: ChatSession | null = null;

/**
 * 初始化
 */
async function initialize(): Promise<void> {
  const backendUrl = await storageService.getBackendUrl();
  apiClient.setBackendUrl(backendUrl);
  console.log('[Background] Initialized with backend URL:', backendUrl);
}

initialize();

/**
 * 获取当前活动标签页
 */
async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

/**
 * 向当前标签页发送消息
 */
async function sendToActiveTab(message: any): Promise<any> {
  const tab = await getActiveTab();
  if (!tab?.id) return null;
  
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error('[Background] Failed to send message to tab:', error);
    return null;
  }
}

/**
 * 切换选择模式
 */
async function toggleSelection(): Promise<void> {
  isActive = !isActive;
  
  if (isActive) {
    await sendToActiveTab({ type: 'ACTIVATE_SELECTION' });
    // 打开 Side Panel
    const tab = await getActiveTab();
    if (tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  } else {
    await sendToActiveTab({ type: 'DEACTIVATE_SELECTION' });
    selectedComponent = null;
    analysisResult = null;
  }
  
  await storageService.setIsActive(isActive);
}

/**
 * 执行分析
 */
async function performAnalysis(): Promise<void> {
  if (!selectedComponent) {
    console.warn('[Background] No component selected');
    return;
  }
  
  const tab = await getActiveTab();
  const tabId = tab?.id; // 保存 tabId
  const pageUrl = tab?.url || 'http://localhost:3000';
  
  if (!tabId) {
    console.error('[Background] No active tab');
    return;
  }
  
  try {
    console.log('[Background] Starting analysis for:', selectedComponent.displayName);
    console.log('[Background] Tab ID:', tabId);
    
    const response = await apiClient.analyze(selectedComponent, pageUrl);
    
    if (response.success && response.result) {
      analysisResult = response.result;
      console.log('[Background] Analysis completed:', response.result.componentName);
      console.log('[Background] Has AI analysis:', !!response.result.aiAnalysis);
      
      // 发送结果到 content script（使用保存的 tabId）
      const resultPayload = {
        componentName: response.result.componentName,
        filePath: response.result.componentPath,
        githubUrl: response.meta?.githubUrl || '',
        line: response.meta?.line,
        code: response.result.codeSnippets?.[0]?.code || '',
        childComponents: response.result.childComponents || [],
        aiAnalysis: response.result.aiAnalysis
      };
      
      console.log('[Background] Sending result to tab:', tabId);
      
      chrome.tabs.sendMessage(tabId, {
        type: 'ANALYSIS_RESULT',
        payload: resultPayload
      }).then(() => {
        console.log('[Background] Result sent successfully');
      }).catch(err => {
        console.error('[Background] Failed to send result:', err);
      });
    } else {
      console.error('[Background] Analysis failed:', response.error);
      // 发送错误到 content script
      chrome.tabs.sendMessage(tabId, {
        type: 'ANALYSIS_RESULT',
        payload: null
      }).catch(() => {});
    }
  } catch (error) {
    console.error('[Background] Analysis error:', error);
    // 发送错误到 content script
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: 'ANALYSIS_RESULT',
        payload: null
      }).catch(() => {});
    }
  }
}

/**
 * 处理聊天消息
 */
async function handleChatMessage(
  question: string,
  component: { name: string; filePath: string; code: string; githubUrl?: string; line?: number }
): Promise<{ answer?: string; error?: string; tokenUsage?: { total: number } }> {
  try {
    console.log('[Background] handleChatMessage:', question || '(default analysis)', 'for:', component.name);
    
    // 初始化或更新会话
    if (!chatSession || chatSession.componentName !== component.name) {
      chatSession = {
        componentName: component.name,
        componentCode: component.code || '',
        history: [],
        tokenUsage: 0,
      };
    }
    
    // 调用后端 Chat API
    const response = await apiClient.chat({
      question: question || '', // 空字符串表示默认分析
      component: {
        name: component.name,
        filePath: component.filePath,
        code: component.code || '',
      },
      history: chatSession.history,
    });
    
    if (response.success && response.answer) {
      // 更新会话历史
      chatSession.history.push({ role: 'user', content: question || '请分析这个组件' });
      chatSession.history.push({ role: 'assistant', content: response.answer });
      chatSession.tokenUsage += response.tokenUsage?.total || 0;
      
      return {
        answer: response.answer,
        tokenUsage: response.tokenUsage,
      };
    } else {
      return {
        error: response.error || '分析失败，请重试',
      };
    }
  } catch (error) {
    console.error('[Background] Chat error:', error);
    return {
      error: error instanceof Error ? error.message : '网络错误，请检查后端服务',
    };
  }
}

/**
 * 获取组件代码
 */
async function getComponentCode(componentInfo: ComponentInfo): Promise<{ code?: string; childComponents?: any[]; error?: string }> {
  try {
    const tab = await getActiveTab();
    const pageUrl = tab?.url || 'http://localhost:3000';
    
    // 调用后端获取组件代码
    const response = await apiClient.getComponentCode(componentInfo, pageUrl);
    
    if (response.success) {
      return {
        code: response.code || '',
        childComponents: response.childComponents || [],
      };
    } else {
      return { error: response.error || '获取代码失败' };
    }
  } catch (error) {
    console.error('[Background] Get component code error:', error);
    return { error: '获取组件代码失败' };
  }
}

/**
 * 监听消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message.type);
  
  (async () => {
    switch (message.type) {
      case 'TOGGLE_SELECTION':
        await toggleSelection();
        sendResponse({ isActive });
        break;
        
      case 'GET_STATUS':
        sendResponse({
          isActive,
          selectedComponent,
          analysisResult
        });
        break;
        
      case 'COMPONENT_SELECTED':
        console.log('[Background] COMPONENT_SELECTED received:', message.payload?.displayName);
        selectedComponent = message.payload;
        analysisResult = null;
        sendResponse({ success: true });
        
        // 自动开始分析（不等待完成）
        performAnalysis()
          .then(() => {
            console.log('[Background] Analysis promise resolved');
          })
          .catch(err => {
            console.error('[Background] Analysis promise rejected:', err);
          });
        break;
        
      case 'SELECTION_CLEARED':
        selectedComponent = null;
        analysisResult = null;
        chatSession = null; // 清空聊天会话
        sendResponse({ success: true });
        break;
        
      case 'REQUEST_ANALYSIS':
        await performAnalysis();
        sendResponse({ result: analysisResult });
        break;
        
      case 'GET_SELECTED_COMPONENT':
        sendResponse({ component: selectedComponent });
        break;
        
      case 'GET_ANALYSIS_RESULT':
        sendResponse({ result: analysisResult });
        break;
      
      case 'GET_COMPONENT_CODE':
        // 获取组件代码
        const codeResult = await getComponentCode(message.payload);
        sendResponse(codeResult);
        break;
      
      case 'CHAT_SEND_MESSAGE':
        // 处理聊天消息
        const { question, component } = message.payload;
        const chatResult = await handleChatMessage(question, component);
        sendResponse(chatResult);
        break;
      
      case 'CHAT_CLEAR_SESSION':
        // 清空聊天会话
        chatSession = null;
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_CONFIG':
        if (message.payload?.backendUrl) {
          await storageService.setBackendUrl(message.payload.backendUrl);
          apiClient.setBackendUrl(message.payload.backendUrl);
        }
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  
  return true; // 保持消息通道开放
});

// 监听标签页更新，重置状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    isActive = false;
    selectedComponent = null;
    analysisResult = null;
  }
});

console.log('[Background] Service worker started');
