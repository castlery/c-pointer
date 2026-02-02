import React, { useEffect, useState } from 'react';
import type { ComponentInfo, AnalysisResult } from '@component-analyzer/shared';
import ResultPanel from './components/ResultPanel';

const App: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 获取初始状态
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response) {
        setSelectedComponent(response.selectedComponent || null);
        setAnalysisResult(response.analysisResult || null);
      }
    });

    // 监听消息
    const handleMessage = (message: any) => {
      console.log('[Panel] Received message:', message.type);
      
      if (message.type === 'ANALYSIS_COMPLETED' && message.payload) {
        setAnalysisResult(message.payload);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // 定期轮询状态
    const interval = setInterval(() => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response) {
          if (response.selectedComponent?.displayName !== selectedComponent?.displayName) {
            setSelectedComponent(response.selectedComponent || null);
            setIsLoading(true);
            setError(null);
          }
          if (response.analysisResult) {
            setAnalysisResult(response.analysisResult);
            setIsLoading(false);
          }
        }
      });
    }, 1000);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(interval);
    };
  }, [selectedComponent?.displayName]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    chrome.runtime.sendMessage({ type: 'REQUEST_ANALYSIS' }, (response) => {
      if (response?.result) {
        setAnalysisResult(response.result);
      } else if (response?.error) {
        setError(response.error.message || '分析失败');
      }
      setIsLoading(false);
    });
  };

  if (!selectedComponent) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            请选择一个组件
          </h2>
          <p className="text-gray-500">
            点击页面上的 React 组件开始分析
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            正在分析组件...
          </h2>
          <p className="text-gray-500">
            {selectedComponent.displayName}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-red-600 mb-2">
            分析失败
          </h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-auto">
      <ResultPanel 
        component={selectedComponent} 
        result={analysisResult} 
      />
    </div>
  );
};

export default App;
