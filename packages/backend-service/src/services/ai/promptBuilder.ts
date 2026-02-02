/**
 * Prompt 构建器 - 面向产品/测试/业务人员的简洁版本
 * 不包含代码细节，专注于功能和用户体验描述
 */

import type { AnalysisContext } from './types.js';

// 概述分析 Prompt - 简洁版
const SUMMARY_PROMPT_ZH = `你是一位产品经理，需要向非技术人员解释这个组件的功能。

组件名称：{{componentName}}

源代码：
\`\`\`tsx
{{sourceCode}}
\`\`\`

请用 2-3 句简单易懂的话描述：
1. 这个组件是什么（比如：产品卡片、购物车、导航栏等）
2. 它在页面上的主要作用

要求：
- 使用通俗易懂的语言，避免技术术语
- 直接输出描述，不需要标题`;

const SUMMARY_PROMPT_EN = `You are a product manager explaining this component to non-technical stakeholders.

Component: {{componentName}}

Source code:
\`\`\`tsx
{{sourceCode}}
\`\`\`

Describe in 2-3 simple sentences:
1. What this component is (e.g., product card, shopping cart, navigation bar)
2. Its main purpose on the page

Requirements:
- Use plain language, avoid technical jargon
- Output description directly without titles`;

// 业务逻辑分析 Prompt - 面向业务人员
const BUSINESS_PROMPT_ZH = `你是一位产品经理，需要向业务人员解释这个组件的功能逻辑。

组件名称：{{componentName}}

源代码：
\`\`\`tsx
{{sourceCode}}
\`\`\`

请用简单易懂的语言描述以下内容：

**组件会显示什么**
简述组件展示的主要信息（如：产品图片、价格、标题等）

**组件有哪些状态**
列出组件可能呈现的不同状态（如：加载中、已选中、缺货、促销中等）

**数据从哪里来**
简述数据来源（如：从服务器获取、用户输入、其他组件传递等）

要求：
- 不要提及代码变量名、函数名等技术细节
- 使用业务语言描述，让产品和测试人员能理解
- 每个部分 2-4 条要点即可`;

const BUSINESS_PROMPT_EN = `You are a product manager explaining this component's logic to business stakeholders.

Component: {{componentName}}

Source code:
\`\`\`tsx
{{sourceCode}}
\`\`\`

Describe in simple terms:

**What the component displays**
Main information shown (e.g., product images, prices, titles)

**Component states**
Different states it can have (e.g., loading, selected, out of stock, on sale)

**Where data comes from**
Data sources (e.g., server, user input, other components)

Requirements:
- Do NOT mention code variables, function names, or technical details
- Use business language that product and QA teams can understand
- 2-4 bullet points per section`;

// 交互逻辑分析 Prompt - 面向测试人员
const INTERACTION_PROMPT_ZH = `你是一位 QA 测试专家，需要描述这个组件的用户交互行为。

组件名称：{{componentName}}

源代码：
\`\`\`tsx
{{sourceCode}}
\`\`\`

请描述用户可以进行的操作和对应的效果：

**用户可以做什么**
列出用户可以进行的操作（如：点击、滑动、输入、选择等）

**操作后会发生什么**
描述每个操作的结果（如：跳转页面、弹出提示、更新显示等）

**特殊情况**
需要注意的边界情况或特殊状态（如：网络错误、数据为空等）

要求：
- 从用户视角描述，不涉及代码实现
- 使用"当用户...时，会..."的句式
- 便于测试人员理解和编写测试用例`;

const INTERACTION_PROMPT_EN = `You are a QA expert describing user interactions for this component.

Component: {{componentName}}

Source code:
\`\`\`tsx
{{sourceCode}}
\`\`\`

Describe user actions and their effects:

**What users can do**
List possible user actions (e.g., click, swipe, input, select)

**What happens after**
Describe results of each action (e.g., page navigation, popup, display update)

**Edge cases**
Special situations to note (e.g., network errors, empty data)

Requirements:
- Describe from user perspective, no code implementation details
- Use "When user... then..." format
- Help QA understand and write test cases`;

export type AnalysisType = 'summary' | 'business' | 'interaction';

/**
 * 构建分段分析 Prompt
 */
export function buildSegmentPrompt(
  context: AnalysisContext,
  type: AnalysisType
): string {
  const isZh = context.language === 'zh';
  const code = truncateCode(context.sourceCode, 6000);
  
  let template: string;
  switch (type) {
    case 'summary':
      template = isZh ? SUMMARY_PROMPT_ZH : SUMMARY_PROMPT_EN;
      break;
    case 'business':
      template = isZh ? BUSINESS_PROMPT_ZH : BUSINESS_PROMPT_EN;
      break;
    case 'interaction':
      template = isZh ? INTERACTION_PROMPT_ZH : INTERACTION_PROMPT_EN;
      break;
  }
  
  return template
    .replace(/\{\{componentName\}\}/g, context.componentName)
    .replace(/\{\{sourceCode\}\}/g, code);
}

/**
 * 获取每种分析类型的 token 限制
 */
export function getTokenLimit(type: AnalysisType): number {
  switch (type) {
    case 'summary':
      return 300;
    case 'business':
      return 600;
    case 'interaction':
      return 600;
  }
}

function truncateCode(code: string, maxLength: number): string {
  if (code.length <= maxLength) return code;
  return code.slice(0, maxLength) + '\n// ... (代码已截断)';
}

export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}


/**
 * 构建默认分析提示词（用于对话式分析）
 */
export function buildDefaultAnalysisPrompt(componentName: string): string {
  return `请分析 ${componentName} 组件，包括：

1. **功能概述**：这个组件是什么，有什么作用
2. **核心业务逻辑**：组件会显示什么内容，有哪些状态
3. **用户交互**：用户可以进行哪些操作

请用简洁易懂的语言描述，避免技术术语。`;
}

/**
 * 构建对话式分析的系统提示词
 */
export function buildChatPrompt(): string {
  return `你是一位专业的前端组件分析助手，专门帮助产品经理、测试人员和业务人员理解 React 组件的功能和行为。

你的回答应该：
1. 使用简洁易懂的中文
2. 避免使用技术术语和代码变量名
3. 重点说明组件的业务功能和用户交互
4. 使用 Markdown 格式，条理清晰
5. 如果用户的问题与组件无关，礼貌地引导回组件分析

请记住：你的目标用户不是开发人员，而是需要理解组件功能的业务人员。`;
}
