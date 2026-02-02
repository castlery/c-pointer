import React, { useState } from 'react';
import type { ComponentInfo, AnalysisResult } from '@component-analyzer/shared';

interface ResultPanelProps {
  component: ComponentInfo;
  result: AnalysisResult | null;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ component, result }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'props', 'state'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const typeColors: Record<string, string> = {
    fortress: 'bg-purple-100 text-purple-800',
    business: 'bg-amber-100 text-amber-800',
    shared: 'bg-cyan-100 text-cyan-800',
    unknown: 'bg-gray-100 text-gray-800'
  };

  if (!result) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold">{component.displayName}</h2>
          <span className={`inline-block px-2 py-1 rounded text-xs mt-2 ${typeColors[component.componentType]}`}>
            {component.componentType}
          </span>
          <p className="text-gray-500 mt-4">等待分析结果...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* 头部 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{result.componentName}</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">{result.componentPath}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeColors[result.componentType]}`}>
            {result.componentType}
          </span>
        </div>
        {result.moduleName && (
          <p className="text-sm text-gray-600 mt-2">
            模块: <span className="font-medium">{result.moduleName}</span>
          </p>
        )}
      </div>

      {/* 功能概述 */}
      <Section
        title="📝 功能概述"
        isExpanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
      >
        <p className="text-gray-700 leading-relaxed">{result.summary}</p>
      </Section>

      {/* Props */}
      <Section
        title="📥 Props"
        isExpanded={expandedSections.has('props')}
        onToggle={() => toggleSection('props')}
        badge={result.props.length}
      >
        {result.props.length > 0 ? (
          <div className="space-y-3">
            {result.props.map((prop, index) => (
              <div key={index} className="border-l-2 border-blue-300 pl-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-blue-600">
                    {prop.name}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {prop.type}
                  </span>
                  {prop.required && (
                    <span className="text-xs text-red-500">*必填</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{prop.description}</p>
                {prop.defaultValue && (
                  <p className="text-xs text-gray-400 mt-1">
                    默认值: <code className="bg-gray-100 px-1 rounded">{prop.defaultValue}</code>
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">无 Props</p>
        )}
      </Section>

      {/* 状态管理 */}
      <Section
        title="🔄 状态管理"
        isExpanded={expandedSections.has('state')}
        onToggle={() => toggleSection('state')}
      >
        {result.stateManagement.localState.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">本地状态</h4>
            <div className="space-y-2">
              {result.stateManagement.localState.map((state, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded">
                  <span className="font-mono text-sm text-green-600">{state.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{state.type}</span>
                  <p className="text-xs text-gray-600 mt-1">{state.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {result.stateManagement.reduxState.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Redux 状态</h4>
            <div className="space-y-2">
              {result.stateManagement.reduxState.map((state, index) => (
                <div key={index} className="bg-purple-50 p-2 rounded">
                  <span className="font-mono text-sm text-purple-600">{state.selector}</span>
                  <span className="text-xs text-gray-500 ml-2">({state.slice})</span>
                  <p className="text-xs text-gray-600 mt-1">{state.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.stateManagement.localState.length === 0 && 
         result.stateManagement.reduxState.length === 0 && (
          <p className="text-gray-500 text-sm">无状态管理</p>
        )}
      </Section>

      {/* 业务逻辑 */}
      <Section
        title="💡 业务逻辑"
        isExpanded={expandedSections.has('logic')}
        onToggle={() => toggleSection('logic')}
      >
        <ul className="space-y-2">
          {result.businessLogic.map((logic, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span className="text-gray-700 text-sm">{logic}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* 数据流 */}
      <Section
        title="📊 数据流向"
        isExpanded={expandedSections.has('dataflow')}
        onToggle={() => toggleSection('dataflow')}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-green-600 mb-2">输入</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {result.dataFlow.inputs.map((input, i) => (
                <li key={i}>→ {input}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-600 mb-2">输出</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {result.dataFlow.outputs.map((output, i) => (
                <li key={i}>← {output}</li>
              ))}
            </ul>
          </div>
        </div>
        {result.dataFlow.sideEffects.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-amber-600 mb-2">副作用</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {result.dataFlow.sideEffects.map((effect, i) => (
                <li key={i}>⚡ {effect}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* 依赖关系 */}
      <Section
        title="🔗 依赖关系"
        isExpanded={expandedSections.has('deps')}
        onToggle={() => toggleSection('deps')}
        badge={result.dependencies.length}
      >
        <div className="space-y-2">
          {result.dependencies.map((dep, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs ${
                dep.type === 'external' ? 'bg-gray-100 text-gray-600' :
                dep.type === 'component' ? 'bg-blue-100 text-blue-600' :
                dep.type === 'service' ? 'bg-green-100 text-green-600' :
                'bg-purple-100 text-purple-600'
              }`}>
                {dep.type}
              </span>
              <span className="font-mono text-gray-700">{dep.name}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 代码片段 */}
      {result.codeSnippets && result.codeSnippets.length > 0 && (
        <Section
          title="📄 代码片段"
          isExpanded={expandedSections.has('code')}
          onToggle={() => toggleSection('code')}
        >
          {result.codeSnippets.map((snippet, index) => (
            <div key={index} className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{snippet.title}</h4>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
                <code>{snippet.code}</code>
              </pre>
              {snippet.explanation && (
                <p className="text-xs text-gray-500 mt-2">{snippet.explanation}</p>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};

interface SectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ 
  title, 
  isExpanded, 
  onToggle, 
  badge,
  children 
}) => (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-700">{title}</span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
            {badge}
          </span>
        )}
      </div>
      <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
    </button>
    {isExpanded && (
      <div className="p-4 border-t border-gray-100">
        {children}
      </div>
    )}
  </div>
);

export default ResultPanel;
