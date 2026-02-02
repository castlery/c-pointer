/**
 * 组件解析器 - 通过多种策略定位组件在 GitHub 中的真实路径
 * 
 * 优先使用 code-inspector-plugin 注入的 data-insp-path 属性
 * 格式: "filePath:line:column:componentName"
 * 示例: "libs/modules/product/components/src/lib/product-dy-promotion/product-dy-promotion.client.tsx:143:13:Swiper"
 */

import type { ComponentInfo, ComponentType } from '@component-analyzer/shared';

/**
 * 解析 data-insp-path 属性
 * 格式: "filePath:line:column:componentName"
 */
export interface InspectorPathInfo {
  filePath: string;
  line: number;
  column: number;
  componentName: string;
}

/**
 * 解析 data-insp-path 属性值
 */
export function parseInspectorPath(dataInspPath: string): InspectorPathInfo | null {
  if (!dataInspPath) return null;
  
  // 格式: "path/to/file.tsx:line:column:ComponentName"
  // 从后往前解析，因为文件路径中可能包含冒号（Windows路径）
  const parts = dataInspPath.split(':');
  
  if (parts.length < 4) {
    console.warn('[ComponentResolver] Invalid data-insp-path format:', dataInspPath);
    return null;
  }
  
  // 最后一个是组件名
  const componentName = parts.pop()!;
  // 倒数第二个是列号
  const column = parseInt(parts.pop()!, 10);
  // 倒数第三个是行号
  const line = parseInt(parts.pop()!, 10);
  // 剩余的是文件路径
  const filePath = parts.join(':');
  
  if (isNaN(line) || isNaN(column)) {
    console.warn('[ComponentResolver] Invalid line/column in data-insp-path:', dataInspPath);
    return null;
  }
  
  return {
    filePath,
    line,
    column,
    componentName
  };
}

/**
 * 从元素或其祖先元素中查找 data-insp-path 属性
 */
export function findInspectorPath(element: HTMLElement, maxDepth = 10): InspectorPathInfo | null {
  let current: HTMLElement | null = element;
  let depth = 0;
  
  while (current && depth < maxDepth) {
    const dataInspPath = current.getAttribute('data-insp-path');
    if (dataInspPath) {
      const parsed = parseInspectorPath(dataInspPath);
      if (parsed) {
        console.log('[ComponentResolver] Found data-insp-path at depth', depth, ':', dataInspPath);
        return parsed;
      }
    }
    current = current.parentElement;
    depth++;
  }
  
  return null;
}

interface ResolvedComponent {
  displayName: string;
  possiblePaths: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'fiber' | 'className' | 'dataAttribute' | 'heuristic' | 'inspector';
  componentType: ComponentType;
  metadata?: Record<string, unknown>;
  // 新增：inspector 路径信息
  inspectorInfo?: InspectorPathInfo;
}

/**
 * 从 CSS 类名推断组件信息
 * 
 * Castlery/Joyboy 项目的类名模式：
 * - MUI 组件: MuiButton-root, MuiCard-root
 * - Joy UI: joy-xxx (自定义样式)
 * - 业务组件: 可能有特定前缀
 */
function parseClassName(className: string): { 
  isMui: boolean; 
  muiComponent?: string;
  customClasses: string[];
  joyClasses: string[];
} {
  const classes = className.split(/\s+/).filter(Boolean);
  const result = {
    isMui: false,
    muiComponent: undefined as string | undefined,
    customClasses: [] as string[],
    joyClasses: [] as string[]
  };

  for (const cls of classes) {
    if (cls.startsWith('Mui')) {
      result.isMui = true;
      // 提取 MUI 组件名: MuiButton-root -> Button
      const match = cls.match(/^Mui(\w+)-/);
      if (match) {
        result.muiComponent = match[1];
      }
    } else if (cls.startsWith('joy-')) {
      result.joyClasses.push(cls);
    } else if (!cls.match(/^[a-z0-9-]+$/)) {
      // 非纯小写的类名可能是自定义组件
      result.customClasses.push(cls);
    }
  }

  return result;
}

/**
 * 从 data 属性中提取组件信息
 * 
 * 很多项目会在元素上添加 data-testid, data-component 等属性
 */
function extractDataAttributes(element: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  
  // 常见的组件标识属性
  const relevantAttrs = [
    'data-testid',
    'data-component',
    'data-module',
    'data-cy',
    'data-qa',
    'data-analytics',
    'data-track'
  ];

  for (const attr of relevantAttrs) {
    const value = element.getAttribute(attr);
    if (value) {
      attrs[attr] = value;
    }
  }

  return attrs;
}

/**
 * 向上遍历 DOM 树，收集组件线索
 */
function collectAncestorClues(element: HTMLElement, maxDepth = 10): {
  componentHints: string[];
  moduleHints: string[];
  dataAttributes: Record<string, string>;
} {
  const result = {
    componentHints: [] as string[],
    moduleHints: [] as string[],
    dataAttributes: {} as Record<string, string>
  };

  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && depth < maxDepth) {
    // 收集 data 属性
    const attrs = extractDataAttributes(current);
    Object.assign(result.dataAttributes, attrs);

    // 从 testid 推断组件名
    if (attrs['data-testid']) {
      const testId = attrs['data-testid'];
      // 常见模式: product-card, ProductCard, product_card
      const componentName = testId
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join('');
      result.componentHints.push(componentName);
    }

    // 从类名推断
    if (current.className) {
      const parsed = parseClassName(current.className);
      if (parsed.customClasses.length > 0) {
        result.componentHints.push(...parsed.customClasses);
      }
    }

    current = current.parentElement;
    depth++;
  }

  return result;
}

/**
 * 根据组件名推断可能的文件路径
 * 
 * 基于 Joyboy 项目结构:
 * - libs/modules/{module}/components/src/lib/{component}/
 * - libs/shared/components/src/lib/{component}/
 * - libs/fortress/src/components/{component}/
 */
function inferPossiblePaths(componentName: string): string[] {
  const paths: string[] = [];
  
  // 转换为 kebab-case
  const kebabName = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // 常见的模块名
  const modules = ['cms', 'product', 'cart', 'checkout', 'search', 'account', 'order'];

  // 1. Shared components
  paths.push(`libs/shared/components/src/lib/${kebabName}/${kebabName}.tsx`);
  paths.push(`libs/shared/components/src/lib/${kebabName}/index.tsx`);

  // 2. Module components
  for (const mod of modules) {
    paths.push(`libs/modules/${mod}/components/src/lib/${kebabName}/${kebabName}.tsx`);
    paths.push(`libs/modules/${mod}/components/src/lib/${kebabName}/index.tsx`);
  }

  // 3. Fortress UI components
  paths.push(`libs/fortress/src/components/${kebabName}/${kebabName}.tsx`);
  paths.push(`libs/fortress/src/components/${componentName}/${componentName}.tsx`);

  // 4. 直接文件名匹配
  paths.push(`**/${componentName}.tsx`);
  paths.push(`**/${kebabName}.tsx`);

  return paths;
}

/**
 * 主解析函数 - 综合多种策略解析组件
 * 
 * 优先级：
 * 1. data-insp-path 属性（最准确）
 * 2. React Fiber _debugSource
 * 3. data-testid 等属性
 * 4. CSS 类名推断
 */
export function resolveComponent(
  element: HTMLElement,
  fiberInfo?: { displayName: string; filePath: string | null }
): ResolvedComponent {
  // 1. 优先使用 data-insp-path（code-inspector-plugin 注入）
  const inspectorInfo = findInspectorPath(element);
  if (inspectorInfo) {
    console.log('%c[ComponentResolver] ✅ Found inspector path!', 'color: #22C55E; font-weight: bold');
    console.log('  File:', inspectorInfo.filePath);
    console.log('  Line:', inspectorInfo.line);
    console.log('  Column:', inspectorInfo.column);
    console.log('  Component:', inspectorInfo.componentName);
    
    return {
      displayName: inspectorInfo.componentName,
      possiblePaths: [inspectorInfo.filePath],
      confidence: 'high',
      source: 'inspector',
      componentType: inferComponentType(inspectorInfo.filePath),
      inspectorInfo,
      metadata: {
        line: inspectorInfo.line,
        column: inspectorInfo.column,
        rawPath: `${inspectorInfo.filePath}:${inspectorInfo.line}:${inspectorInfo.column}`
      }
    };
  }

  // 2. 如果有 Fiber 信息且有文件路径，使用它
  if (fiberInfo?.filePath) {
    return {
      displayName: fiberInfo.displayName,
      possiblePaths: [fiberInfo.filePath],
      confidence: 'high',
      source: 'fiber',
      componentType: inferComponentType(fiberInfo.filePath)
    };
  }

  // 3. 收集各种线索（降级方案）
  const className = element.className || '';
  const parsedClass = parseClassName(className);
  const dataAttrs = extractDataAttributes(element);
  const ancestorClues = collectAncestorClues(element);

  // 4. 确定组件名
  let displayName = '';
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let source: ResolvedComponent['source'] = 'heuristic';

  // 优先使用 data-testid
  if (dataAttrs['data-testid']) {
    displayName = normalizeComponentName(dataAttrs['data-testid']);
    confidence = 'medium';
    source = 'dataAttribute';
  } 
  // 其次使用 data-component
  else if (dataAttrs['data-component']) {
    displayName = dataAttrs['data-component'];
    confidence = 'medium';
    source = 'dataAttribute';
  }
  // 使用祖先元素的线索
  else if (ancestorClues.componentHints.length > 0) {
    displayName = ancestorClues.componentHints[0];
    confidence = 'low';
    source = 'dataAttribute';
  }
  // 使用 Fiber displayName（即使没有路径）
  else if (fiberInfo?.displayName && !fiberInfo.displayName.includes('.')) {
    displayName = fiberInfo.displayName;
    confidence = 'low';
    source = 'fiber';
  }
  // 最后使用类名
  else if (parsedClass.customClasses.length > 0) {
    displayName = parsedClass.customClasses[0];
    confidence = 'low';
    source = 'className';
  } else {
    displayName = element.tagName.toLowerCase();
    confidence = 'low';
    source = 'heuristic';
  }

  // 5. 推断可能的路径
  const possiblePaths = inferPossiblePaths(displayName);

  // 6. 确定组件类型
  let componentType: ComponentType = 'unknown';
  if (parsedClass.isMui) {
    componentType = 'fortress';
  } else if (displayName.toLowerCase().includes('product') || 
             displayName.toLowerCase().includes('cart') ||
             displayName.toLowerCase().includes('checkout')) {
    componentType = 'business';
  }

  return {
    displayName,
    possiblePaths,
    confidence,
    source,
    componentType,
    metadata: {
      className,
      dataAttributes: { ...dataAttrs, ...ancestorClues.dataAttributes },
      isMuiComponent: parsedClass.isMui,
      muiComponentName: parsedClass.muiComponent,
      ancestorHints: ancestorClues.componentHints
    }
  };
}

/**
 * 标准化组件名
 */
function normalizeComponentName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

/**
 * 从文件路径推断组件类型
 */
function inferComponentType(filePath: string): ComponentType {
  if (filePath.includes('fortress') || filePath.includes('@mui')) {
    return 'fortress';
  }
  if (filePath.includes('modules/')) {
    return 'business';
  }
  if (filePath.includes('shared/')) {
    return 'shared';
  }
  return 'unknown';
}

/**
 * 获取元素的完整上下文信息（用于发送给后端）
 */
export function getElementContext(element: HTMLElement): {
  tagName: string;
  className: string;
  id: string;
  dataAttributes: Record<string, string>;
  ancestorPath: string[];
  textContent: string;
} {
  const ancestorPath: string[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current && depth < 5) {
    const tag = current.tagName.toLowerCase();
    const cls = current.className ? `.${current.className.split(' ')[0]}` : '';
    const id = current.id ? `#${current.id}` : '';
    ancestorPath.push(`${tag}${id}${cls}`);
    current = current.parentElement;
    depth++;
  }

  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className || '',
    id: element.id || '',
    dataAttributes: extractDataAttributes(element),
    ancestorPath: ancestorPath.reverse(),
    textContent: (element.textContent || '').substring(0, 100).trim()
  };
}
