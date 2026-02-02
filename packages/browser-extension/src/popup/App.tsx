import React, { useEffect, useState } from 'react';
import type { ComponentInfo } from '@component-analyzer/shared';

interface Status {
  isActive: boolean;
  selectedComponent: ComponentInfo | null;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<Status>({
    isActive: false,
    selectedComponent: null
  });
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 获取当前状态
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response) {
        setStatus({
          isActive: response.isActive || false,
          selectedComponent: response.selectedComponent || null
        });
      }
    });

    // 获取配置
    chrome.storage.sync.get('backendUrl', (result) => {
      if (result.backendUrl) {
        setBackendUrl(result.backendUrl);
      }
    });

    // 检查连接
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/health`);
      setIsConnected(response.ok);
    } catch {
      setIsConnected(false);
    }
  };

  const handleToggle = () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_SELECTION' }, (response) => {
      if (response) {
        setStatus(prev => ({ ...prev, isActive: response.isActive }));
      }
    });
  };

  const handleSaveSettings = () => {
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_CONFIG', 
      payload: { backendUrl } 
    }, () => {
      checkConnection();
      setShowSettings(false);
    });
  };

  return (
    <div className="w-80 p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-800">组件分析器</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          ⚙️
        </button>
      </div>

      {showSettings ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              后端服务地址
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="http://localhost:3001"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveSettings}
              className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
            >
              保存
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? '服务已连接' : '服务未连接'}
            </span>
          </div>

          <button
            onClick={handleToggle}
            disabled={!isConnected}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              status.isActive
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            } ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {status.isActive ? '🔴 停止选择' : '🎯 开始选择组件'}
          </button>

          {status.selectedComponent && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">已选中组件:</p>
              <p className="text-sm text-blue-600 font-mono">
                {status.selectedComponent.displayName}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                类型: {status.selectedComponent.componentType}
              </p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center">
            点击页面上的组件进行分析
          </p>
        </div>
      )}
    </div>
  );
};

export default App;
