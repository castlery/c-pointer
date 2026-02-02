import type { ComponentInfo, ComponentType } from '@component-analyzer/shared';

interface FiberNode {
  tag: number;
  type: any;
  key: string | null;
  stateNode: any;
  return: FiberNode | null;
  _debugSource?: {
    fileName: string;
    lineNumber: number;
    columnNumber: number;
  };
}

/**
 * 检测页面是否使用 React
 */
export function isReactPage(): boolean {
  return !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
}

/**
 * 获取 React 版本
 */
export function getReactVersion(): string | null {
  const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!hook) return null;
  
  const renderers = hook.renderers;
  if (renderers && renderers.size > 0) {
    const renderer = renderers.values().next().value;
    return renderer?.version || null;
  }
  return null;
}

/**
 * 从 DOM 元素获取 React Fiber 节点
 */
export function getFiberFromElement(element: HTMLElement): FiberNode | null {
  // React 17+ 使用 __reactFiber$ 前缀
  // React 16 使用 __reactInternalInstance$ 前缀
  const key = Object.keys(element).find(
    k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  
  if (!key) return null;
  return (element as any)[key] as FiberNode;
}

/**
 * 向上查找最近的 React 组件
 */
export function findNearestComponent(element: HTMLElement): { fiber: FiberNode; element: HTMLElement } | null {
  let current: HTMLElement | null = element;
  let maxDepth = 20;
  
  while (current && maxDepth > 0) {
    const fiber = getFiberFromElement(current);
    if (fiber && isComponentFiber(fiber)) {
      return { fiber, element: current };
    }
    current = current.parentElement;
    maxDepth--;
  }
  
  return null;
}

/**
 * 判断 Fiber 是否是组件（而不是 DOM 元素）
 */
function isComponentFiber(fiber: FiberNode): boolean {
  // tag 0 = FunctionComponent, 1 = ClassComponent
  return fiber.tag === 0 || fiber.tag === 1;
}

/**
 * 获取组件显示名称
 */
function getComponentDisplayName(fiber: FiberNode): string {
  const type = fiber.type;
  if (!type) return 'Unknown';
  
  if (typeof type === 'function') {
    return type.displayName || type.name || 'Anonymous';
  }
  
  if (typeof type === 'object' && type !== null) {
    return type.displayName || type.name || 'Anonymous';
  }
  
  return String(type);
}

/**
 * 识别组件类型
 */
function identifyComponentType(filePath: string | null): ComponentType {
  if (!filePath) return 'unknown';
  
  if (filePath.includes('libs/fortress') || filePath.includes('fortress')) {
    return 'fortress';
  }
  if (filePath.includes('libs/modules') || filePath.includes('modules')) {
    return 'business';
  }
  if (filePath.includes('libs/shared') || filePath.includes('shared')) {
    return 'shared';
  }
  
  return 'unknown';
}

/**
 * 从 Fiber 提取组件信息
 */
export function extractComponentInfo(fiber: FiberNode): ComponentInfo {
  const displayName = getComponentDisplayName(fiber);
  const debugSource = fiber._debugSource;
  
  const filePath = debugSource?.fileName || null;
  const fileName = filePath ? filePath.split('/').pop() || displayName + '.tsx' : displayName + '.tsx';
  
  return {
    displayName,
    fileName,
    filePath,
    componentType: identifyComponentType(filePath)
  };
}

/**
 * 获取组件的 props
 */
export function getComponentProps(fiber: FiberNode): Record<string, unknown> {
  if (fiber.tag === 0 || fiber.tag === 1) {
    const memoizedProps = (fiber as any).memoizedProps;
    if (memoizedProps) {
      const props: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(memoizedProps)) {
        if (key !== 'children' && typeof value !== 'function') {
          props[key] = value;
        }
      }
      return props;
    }
  }
  return {};
}
