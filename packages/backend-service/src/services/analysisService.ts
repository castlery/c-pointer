import { v4 as uuidv4 } from 'uuid';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisResult,
  ComponentInfo,
  ChildComponentInfo
} from '@component-analyzer/shared';
import { configManager } from '../infrastructure/config/configManager.js';
import { MemoryCache } from '../infrastructure/cache/memoryCache.js';
import { logger } from '../infrastructure/logging/logger.js';
import { githubService } from './githubService.js';
import { 
  analyzeComponentCode, 
  initAIService, 
  isAIServiceAvailable,
  getAIServiceStatus,
  type AnalysisContext 
} from './ai/index.js';

// 创建缓存实例
const cacheConfig = configManager.getCacheConfig();
const cache = new MemoryCache({
  ttlSeconds: cacheConfig.ttlSeconds,
  maxSize: cacheConfig.maxSize
});

/**
 * 从 GitHub 获取组件源代码
 */
async function fetchComponentCode(
  componentInfo: ComponentInfo, 
  branch: string
): Promise<{ code: string; sha: string; githubUrl: string; line?: number } | null> {
  console.log('\n🔍 [FETCH CODE] Starting...');
  console.log('  Component:', componentInfo.displayName);
  console.log('  Branch:', branch);
  
  // 优先使用 inspector 信息（来自 code-inspector-plugin）
  if (componentInfo.inspectorInfo) {
    const { filePath, line, column, componentName } = componentInfo.inspectorInfo;
    console.log('%c  ✅ Using Inspector Path (code-inspector-plugin)', 'color: #22C55E; font-weight: bold');
    console.log('    File:', filePath);
    console.log('    Line:', line);
    console.log('    Column:', column);
    console.log('    Component:', componentName);
    
    try {
      const fileContent = await githubService.getFileContent(filePath, branch);
      const githubUrl = githubService.getFileUrl(filePath, branch, line);
      
      console.log('  ✅ Code fetched successfully!');
      console.log('  📎 GitHub URL:', githubUrl);
      console.log('  📏 Code size:', fileContent.content.length, 'bytes');
      
      return {
        code: fileContent.content,
        sha: fileContent.sha,
        githubUrl,
        line
      };
    } catch (error) {
      console.error('  ❌ Failed to fetch file via inspector path:', error);
      // 继续尝试其他方法
    }
  }
  
  // 打印解析信息
  if (componentInfo.resolveInfo) {
    console.log('  Resolve confidence:', componentInfo.resolveInfo.confidence);
    console.log('  Resolve source:', componentInfo.resolveInfo.source);
    console.log('  Possible paths:', componentInfo.resolveInfo.possiblePaths?.slice(0, 5));
  }
  
  if (componentInfo.elementContext) {
    console.log('  Element context:');
    console.log('    Tag:', componentInfo.elementContext.tagName);
    console.log('    Class:', componentInfo.elementContext.className?.substring(0, 50));
  }

  if (!githubService.isConfigured()) {
    console.log('  ⚠️ GitHub not configured, using mock data');
    return null;
  }

  // 策略1: 使用提供的 filePath
  let filePath = componentInfo.filePath;
  
  // 策略2: 尝试 possiblePaths
  if (!filePath && componentInfo.resolveInfo?.possiblePaths?.length) {
    console.log('  📂 Trying possible paths...');
    for (const possiblePath of componentInfo.resolveInfo.possiblePaths.slice(0, 10)) {
      // 跳过通配符路径
      if (possiblePath.includes('**')) continue;
      
      console.log('    Checking:', possiblePath);
      const exists = await githubService.fileExists(possiblePath, branch);
      if (exists) {
        filePath = possiblePath;
        console.log('    ✅ Found!');
        break;
      }
    }
  }
  
  // 策略3: 使用 GitHub 搜索
  if (!filePath) {
    console.log('  🔎 Searching GitHub for component...');
    const foundPath = await githubService.findComponentFile(componentInfo.displayName);
    if (foundPath) {
      filePath = foundPath;
    }
  }
  
  if (!filePath) {
    console.log('  ❌ Could not locate component file');
    return null;
  }

  // 清理文件路径
  filePath = cleanFilePath(filePath);
  console.log('  📁 Final file path:', filePath);

  try {
    const fileContent = await githubService.getFileContent(filePath, branch);
    const githubUrl = githubService.getFileUrl(filePath, branch);
    
    console.log('  ✅ Code fetched successfully!');
    console.log('  📎 GitHub URL:', githubUrl);
    console.log('  📏 Code size:', fileContent.content.length, 'bytes');
    
    return {
      code: fileContent.content,
      sha: fileContent.sha,
      githubUrl
    };
  } catch (error) {
    console.error('  ❌ Failed to fetch file:', error);
    return null;
  }
}

/**
 * 清理文件路径，移除 webpack/bundler 添加的前缀
 */
function cleanFilePath(filePath: string): string {
  // 移除 webpack:// 前缀
  let cleaned = filePath.replace(/^webpack:\/\/[^/]*\//, '');
  
  // 移除 ./ 前缀
  cleaned = cleaned.replace(/^\.\//, '');
  
  // 移除 node_modules 路径（如果是内部组件）
  if (cleaned.includes('node_modules') && cleaned.includes('@castlery')) {
    // 尝试提取真实路径
    const match = cleaned.match(/@castlery\/([^/]+)\/(.+)/);
    if (match) {
      cleaned = `libs/${match[1]}/src/${match[2]}`;
    }
  }
  
  return cleaned;
}


/**
 * 解析组件代码，提取基本信息
 */
function parseComponentCode(code: string, componentName: string): Partial<AnalysisResult> {
  const result: Partial<AnalysisResult> = {
    props: [],
    stateManagement: { localState: [], reduxState: [] },
    businessLogic: [],
    dependencies: []
  };

  // 提取 imports
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const imports = match[1] || match[2];
    const path = match[3];
    
    if (path.startsWith('.') || path.startsWith('@')) {
      result.dependencies!.push({
        name: imports.split(',')[0].trim(),
        type: path.includes('components') ? 'component' : 'internal',
        path,
        description: `从 ${path} 导入`
      });
    } else {
      result.dependencies!.push({
        name: imports.split(',')[0].trim(),
        type: 'external',
        path,
        description: `外部依赖 ${path}`
      });
    }
  }

  // 提取 useState
  const useStateRegex = /const\s+\[(\w+),\s*set\w+\]\s*=\s*useState[<\w>]*\(([^)]*)\)/g;
  while ((match = useStateRegex.exec(code)) !== null) {
    result.stateManagement!.localState.push({
      name: match[1],
      type: 'unknown',
      description: `本地状态 ${match[1]}`,
      initialValue: match[2] || 'undefined'
    });
  }

  // 提取 useSelector
  const useSelectorRegex = /useSelector\((\w+)\)/g;
  while ((match = useSelectorRegex.exec(code)) !== null) {
    result.stateManagement!.reduxState.push({
      selector: match[1],
      slice: 'unknown',
      description: `Redux selector ${match[1]}`
    });
  }

  // 提取 Props interface
  const propsInterfaceRegex = new RegExp(`interface\\s+${componentName}Props\\s*{([^}]+)}`, 's');
  const propsMatch = code.match(propsInterfaceRegex);
  if (propsMatch) {
    const propsContent = propsMatch[1];
    const propRegex = /(\w+)(\?)?:\s*([^;]+);/g;
    while ((match = propRegex.exec(propsContent)) !== null) {
      result.props!.push({
        name: match[1],
        type: match[3].trim(),
        required: !match[2],
        description: `Prop ${match[1]}`
      });
    }
  }

  return result;
}

/**
 * 从代码中提取子组件引用
 */
async function extractChildComponents(
  code: string, 
  currentFilePath: string,
  branch: string
): Promise<ChildComponentInfo[]> {
  const childComponents: ChildComponentInfo[] = [];
  const seenComponents = new Set<string>();
  
  console.log('\n📦 [CHILD COMPONENTS] Extracting...');
  
  // 1. 提取 import 的组件
  const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(code)) !== null) {
    const imports = match[1] || match[2];
    const importPath = match[3];
    
    // 只处理相对路径和 @castlery 包的导入
    if (!importPath.startsWith('.') && !importPath.startsWith('@castlery')) {
      continue;
    }
    
    // 解析导入的组件名
    const componentNames = imports.split(',').map(s => s.trim()).filter(s => {
      // 过滤掉非组件（小写开头的通常是函数或常量）
      return /^[A-Z]/.test(s) && !s.includes(' as ');
    });
    
    for (const componentName of componentNames) {
      if (seenComponents.has(componentName)) continue;
      seenComponents.add(componentName);
      
      // 解析实际文件路径
      const resolvedPath = resolveImportPath(importPath, currentFilePath);
      if (!resolvedPath) continue;
      
      // 尝试查找组件文件
      const componentPath = await findComponentPath(resolvedPath, componentName, branch);
      if (componentPath) {
        const githubUrl = githubService.getFileUrl(componentPath, branch);
        childComponents.push({
          name: componentName,
          path: componentPath,
          githubUrl
        });
        console.log(`  ✅ ${componentName}: ${componentPath}`);
      }
    }
  }
  
  // 2. 提取 JSX 中使用的组件（大写开头的标签）
  const jsxComponentRegex = /<([A-Z][a-zA-Z0-9]*)/g;
  while ((match = jsxComponentRegex.exec(code)) !== null) {
    const componentName = match[1];
    
    // 跳过已处理的和常见的 HTML 组件
    if (seenComponents.has(componentName)) continue;
    if (['Fragment', 'Suspense', 'StrictMode'].includes(componentName)) continue;
    
    seenComponents.add(componentName);
    
    // 尝试在 GitHub 中搜索组件
    const searchResult = await githubService.findComponentFile(componentName);
    if (searchResult) {
      const githubUrl = githubService.getFileUrl(searchResult, branch);
      childComponents.push({
        name: componentName,
        path: searchResult,
        githubUrl
      });
      console.log(`  ✅ ${componentName} (JSX): ${searchResult}`);
    }
  }
  
  console.log(`  Total child components found: ${childComponents.length}`);
  
  return childComponents;
}

/**
 * 解析 import 路径为实际文件路径
 */
function resolveImportPath(importPath: string, currentFilePath: string): string | null {
  // 处理 @castlery 包
  if (importPath.startsWith('@castlery/')) {
    const packageMatch = importPath.match(/@castlery\/([^/]+)(?:\/(.*))?/);
    if (packageMatch) {
      const packageName = packageMatch[1];
      const subPath = packageMatch[2] || '';
      
      // 映射包名到实际路径
      const packageMappings: Record<string, string> = {
        'fortress': 'libs/fortress/src',
        'shared-components': 'libs/shared/components/src',
        'modules-product-components': 'libs/modules/product/components/src',
        'modules-cms-components': 'libs/modules/cms/components/src',
        'modules-checkout-components': 'libs/modules/checkout/components/src',
        'modules-search-components': 'libs/modules/search/components/src',
        'modules-user-components': 'libs/modules/user/components/src',
        'modules-order-components': 'libs/modules/order/components/src',
      };
      
      const basePath = packageMappings[packageName];
      if (basePath) {
        return subPath ? `${basePath}/${subPath}` : basePath;
      }
    }
    return null;
  }
  
  // 处理相对路径
  if (importPath.startsWith('.')) {
    const currentDir = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));
    
    // 简单的路径解析
    let resolved = importPath;
    if (importPath.startsWith('./')) {
      resolved = `${currentDir}/${importPath.substring(2)}`;
    } else if (importPath.startsWith('../')) {
      const parts = currentDir.split('/');
      let upCount = 0;
      let remaining = importPath;
      while (remaining.startsWith('../')) {
        upCount++;
        remaining = remaining.substring(3);
      }
      parts.splice(-upCount);
      resolved = `${parts.join('/')}/${remaining}`;
    }
    
    return resolved;
  }
  
  return null;
}

/**
 * 查找组件的实际文件路径
 */
async function findComponentPath(
  basePath: string, 
  componentName: string,
  branch: string
): Promise<string | null> {
  // 可能的文件路径模式
  const possiblePaths = [
    `${basePath}.tsx`,
    `${basePath}/index.tsx`,
    `${basePath}/${componentName}.tsx`,
    `${basePath}/${toKebabCase(componentName)}.tsx`,
    `${basePath}/${toKebabCase(componentName)}/${toKebabCase(componentName)}.tsx`,
  ];
  
  for (const path of possiblePaths) {
    const exists = await githubService.fileExists(path, branch);
    if (exists) {
      return path;
    }
  }
  
  return null;
}

/**
 * 转换为 kebab-case
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * 生成分析结果（结合 GitHub 代码和解析）
 */
async function generateAnalysisResult(
  componentInfo: ComponentInfo,
  codeInfo: { code: string; sha: string; githubUrl: string; line?: number } | null,
  branch: string
): Promise<AnalysisResult> {
  const { displayName, filePath, componentType } = componentInfo;
  
  // 基础信息
  const isBusiness = componentType === 'business';
  const moduleName = isBusiness && filePath 
    ? extractModuleName(filePath) 
    : undefined;

  // 如果有真实代码，解析它
  let parsedInfo: Partial<AnalysisResult> = {};
  let childComponents: ChildComponentInfo[] = [];
  
  if (codeInfo?.code) {
    parsedInfo = parseComponentCode(codeInfo.code, displayName);
    
    // 提取子组件
    const currentPath = componentInfo.inspectorInfo?.filePath || filePath || '';
    if (currentPath) {
      childComponents = await extractChildComponents(codeInfo.code, currentPath, branch);
    }
  }

  // AI 分析
  let aiAnalysis = undefined;
  if (codeInfo?.code && isAIServiceAvailable()) {
    console.log('\n🤖 [AI] Starting AI analysis...');
    const aiContext: AnalysisContext = {
      sourceCode: codeInfo.code,
      componentName: displayName,
      filePath: componentInfo.inspectorInfo?.filePath || filePath || '',
      componentType,
      childComponents: childComponents.map(c => c.name),
      language: 'zh', // 默认中文，后续可从配置读取
    };
    
    const aiResult = await analyzeComponentCode(aiContext);
    if (aiResult.success && aiResult.report) {
      aiAnalysis = aiResult.report;
      console.log('🤖 [AI] Analysis completed successfully');
    } else {
      console.log('🤖 [AI] Analysis failed or returned fallback:', aiResult.error?.message);
      // 即使失败也返回 fallback 报告
      if (aiResult.fallback && aiResult.report) {
        aiAnalysis = aiResult.report;
      }
    }
  }

  // 生成代码片段
  const codeSnippets: Array<{
    title: string;
    code: string;
    language: 'typescript' | 'javascript' | 'tsx' | 'jsx';
    filePath: string;
    lineStart: number;
    lineEnd: number;
    explanation?: string;
  }> = [];
  
  if (codeInfo?.code) {
    codeSnippets.push({
      title: '完整组件代码',
      code: codeInfo.code,
      language: 'tsx',
      filePath: filePath || `components/${displayName}.tsx`,
      lineStart: 1,
      lineEnd: codeInfo.code.split('\n').length,
      explanation: `GitHub: ${codeInfo.githubUrl}`
    });
  } else {
    // Mock 代码片段
    codeSnippets.push({
      title: '组件定义 (Mock)',
      code: `export const ${displayName}: React.FC<${displayName}Props> = (props) => {\n  // 组件实现\n  return <div>...</div>;\n};`,
      language: 'typescript',
      filePath: filePath || `components/${displayName}.tsx`,
      lineStart: 1,
      lineEnd: 5,
      explanation: '⚠️ 无法获取真实代码，显示 Mock 数据'
    });
  }

  return {
    componentName: displayName,
    componentPath: filePath || `libs/modules/unknown/src/components/${displayName}.tsx`,
    componentType,
    moduleName,
    summary: aiAnalysis?.summary || (codeInfo?.code 
      ? `${displayName} 是一个${getComponentTypeDescription(componentType)}组件。代码已从 GitHub 获取。`
      : `${displayName} 是一个${getComponentTypeDescription(componentType)}组件（Mock 数据）。`),
    props: parsedInfo.props?.length ? parsedInfo.props : generateMockProps(),
    stateManagement: parsedInfo.stateManagement?.localState?.length || parsedInfo.stateManagement?.reduxState?.length
      ? parsedInfo.stateManagement
      : generateMockStateManagement(displayName, isBusiness, moduleName),
    businessLogic: generateBusinessLogic(isBusiness),
    dataFlow: generateDataFlow(displayName, isBusiness),
    dependencies: parsedInfo.dependencies?.length ? parsedInfo.dependencies : generateMockDependencies(isBusiness),
    codeSnippets,
    // 新增字段
    childComponents,
    githubUrl: codeInfo?.githubUrl,
    line: codeInfo?.line,
    aiAnalysis,
  };
}


// Helper functions
function extractModuleName(filePath: string): string | undefined {
  const match = filePath.match(/libs\/modules\/([^/]+)/);
  return match ? match[1] : undefined;
}

function getComponentTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    fortress: 'Fortress UI 库',
    business: '业务模块',
    shared: '共享',
    unknown: '通用'
  };
  return descriptions[type] || '通用';
}

function generateMockProps() {
  return [
    { name: 'className', type: 'string', description: '自定义 CSS 类名', required: false, defaultValue: '""' },
    { name: 'children', type: 'React.ReactNode', description: '子元素内容', required: false }
  ];
}

function generateMockStateManagement(displayName: string, isBusiness: boolean, moduleName?: string) {
  return {
    localState: [{ name: 'isLoading', type: 'boolean', description: '加载状态', initialValue: 'false' }],
    reduxState: isBusiness ? [{ selector: `select${displayName}Data`, slice: moduleName || 'common', description: `获取 ${displayName} 相关数据` }] : []
  };
}

function generateBusinessLogic(isBusiness: boolean) {
  return [
    '处理用户交互事件',
    '管理组件内部状态',
    isBusiness ? '与 Redux Store 进行数据同步' : '渲染 UI 元素'
  ];
}

function generateDataFlow(componentName: string, isBusiness: boolean) {
  return {
    inputs: ['props', isBusiness ? 'Redux state' : 'context'].filter(Boolean),
    outputs: ['渲染的 UI', isBusiness ? 'Redux actions' : '事件回调'].filter(Boolean),
    sideEffects: isBusiness ? ['API 调用', '状态更新'] : [],
    diagram: isBusiness
      ? `graph TD\n    A[Props] --> B[${componentName}]\n    C[Redux State] --> B\n    B --> D[UI 渲染]\n    B --> E[Dispatch Actions]`
      : `graph TD\n    A[Props] --> B[${componentName}]\n    B --> C[UI 渲染]`
  };
}

function generateMockDependencies(isBusiness: boolean) {
  const deps = [{ name: 'React', type: 'external' as const, path: 'react', description: 'React 核心库' }];
  if (isBusiness) {
    deps.push({ name: 'useSelector', type: 'external' as const, path: 'react-redux', description: 'Redux hooks' });
  }
  return deps;
}

/**
 * 主分析函数
 */
export async function analyzeComponent(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const startTime = Date.now();
  const requestId = uuidv4();

  console.log('\n' + '='.repeat(60));
  console.log('📥 [ANALYZE REQUEST]');
  console.log('='.repeat(60));
  console.log('Request ID:', requestId);
  console.log('Component:', request.componentInfo.displayName);
  console.log('Type:', request.componentInfo.componentType);
  console.log('Environment:', request.environment);
  console.log('Page URL:', request.pageUrl);
  
  // Inspector 信息（来自 code-inspector-plugin）
  if (request.componentInfo.inspectorInfo) {
    const { filePath, line, column, componentName } = request.componentInfo.inspectorInfo;
    console.log('%c\n📍 Inspector Path (code-inspector-plugin)', 'color: #8B5CF6; font-weight: bold');
    console.log('  File:', filePath);
    console.log('  Line:', line);
    console.log('  Column:', column);
    console.log('  Component:', componentName);
  } else {
    console.log('\n⚠️ No inspector path available');
    console.log('File Path:', request.componentInfo.filePath || 'NOT PROVIDED');
  }
  
  console.log('\nGitHub configured:', githubService.isConfigured());
  console.log('='.repeat(60) + '\n');

  logger.info('Analysis request received', {
    requestId,
    component: request.componentInfo.displayName,
    environment: request.environment
  });

  try {
    const { branch } = configManager.resolveEnvironment(request.pageUrl);
    const gitBranch = githubService.getBranchForEnvironment(request.environment);

    // 生成缓存键
    const cacheKey = cache.generateKey(
      request.componentInfo.filePath || request.componentInfo.displayName,
      gitBranch,
      'latest'
    );

    // 检查缓存
    const cachedResult = await cache.get<AnalysisResult>(cacheKey);
    if (cachedResult) {
      console.log('📦 [CACHE HIT] Returning cached result');
      return {
        success: true,
        result: cachedResult,
        meta: { cached: true, analyzedAt: new Date().toISOString(), duration: Date.now() - startTime, branch: gitBranch, commitHash: 'cached' }
      };
    }

    // 从 GitHub 获取代码
    const codeInfo = await fetchComponentCode(request.componentInfo, gitBranch);
    
    // 生成分析结果（包含子组件）
    const result = await generateAnalysisResult(request.componentInfo, codeInfo, gitBranch);

    // 缓存结果
    await cache.set(cacheKey, result);

    const duration = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📤 [ANALYZE RESPONSE]');
    console.log('='.repeat(60));
    console.log('Request ID:', requestId);
    console.log('Component:', result.componentName);
    console.log('GitHub code fetched:', !!codeInfo);
    if (codeInfo) {
      console.log('%c📎 GitHub URL: ' + codeInfo.githubUrl, 'color: #22C55E; font-weight: bold');
      if (codeInfo.line) {
        console.log('📍 Line:', codeInfo.line);
      }
      console.log('📏 Code length:', codeInfo.code.length, 'bytes');
      console.log('🔑 SHA:', codeInfo.sha);
    } else {
      console.log('GitHub URL:', '❌ NOT AVAILABLE');
    }
    console.log('Props found:', result.props.length);
    console.log('Dependencies found:', result.dependencies.length);
    
    // 子组件信息
    if (result.childComponents && result.childComponents.length > 0) {
      console.log('\n📦 Child Components:', result.childComponents.length);
      result.childComponents.forEach((child: ChildComponentInfo, i: number) => {
        console.log(`  ${i + 1}. ${child.name}: ${child.githubUrl}`);
      });
    }
    
    console.log('\nDuration:', duration, 'ms');
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      result,
      meta: {
        cached: false,
        analyzedAt: new Date().toISOString(),
        duration,
        branch: gitBranch,
        commitHash: codeInfo?.sha || 'mock',
        githubUrl: codeInfo?.githubUrl,
        line: codeInfo?.line
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Analysis failed', { requestId, error, duration });

    console.log('\n❌ [ANALYZE ERROR]', error);

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
      meta: { cached: false, analyzedAt: new Date().toISOString(), duration, branch: 'unknown', commitHash: 'unknown' }
    };
  }
}

export function getCacheStats() {
  return cache.getStats();
}

// 导出 AI 服务相关函数
export { initAIService, isAIServiceAvailable, getAIServiceStatus };
