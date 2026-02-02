/**
 * 组件分析器 Modal 对话框
 * 
 * 功能：
 * - 显示选中组件的代码
 * - 显示子组件列表及 GitHub 链接
 * - 支持收缩/展开
 * - 支持关闭（退出选择模式）
 */

export interface ChildComponent {
  name: string;
  path: string;
  githubUrl: string;
  line?: number;
}

export interface ModalContent {
  componentName: string;
  filePath: string;
  githubUrl: string;
  line?: number;
  code: string;
  childComponents: ChildComponent[];
  loading?: boolean;
  error?: string;
}

let modalContainer: HTMLDivElement | null = null;
let isCollapsed = false;
let onCloseCallback: (() => void) | null = null;

/**
 * 创建 Modal 容器
 */
function createModalContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'analyzer-modal-container';
  container.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 500px;
    max-height: 70vh;
    background: #1e1e1e;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    transition: all 0.3s ease;
  `;
  document.body.appendChild(container);
  return container;
}

/**
 * 渲染 Modal 内容
 */
function renderModal(content: ModalContent): void {
  if (!modalContainer) return;

  const headerHtml = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🔍</span>
        <span style="color: #fff; font-weight: 600; font-size: 14px;">
          ${content.componentName || 'Component Analyzer'}
        </span>
        ${content.loading ? '<span style="color: #888; font-size: 12px;">Loading...</span>' : ''}
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="analyzer-modal-toggle" style="
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 14px;
          border-radius: 4px;
          transition: background 0.2s;
        " onmouseover="this.style.background='#404040'" onmouseout="this.style.background='none'">
          ${isCollapsed ? '▲ 展开' : '▼ 收起'}
        </button>
        <button id="analyzer-modal-close" style="
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px 8px;
          font-size: 16px;
          border-radius: 4px;
          transition: background 0.2s;
        " onmouseover="this.style.background='#404040'" onmouseout="this.style.background='none'">
          ✕
        </button>
      </div>
    </div>
  `;

  let bodyHtml = '';
  
  if (!isCollapsed) {
    if (content.loading) {
      bodyHtml = `
        <div style="padding: 40px; text-align: center; color: #888;">
          <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
          <div>正在获取组件代码...</div>
        </div>
      `;
    } else if (content.error) {
      bodyHtml = `
        <div style="padding: 20px; color: #f87171;">
          <div style="font-size: 16px; margin-bottom: 8px;">❌ 错误</div>
          <div style="font-size: 13px;">${content.error}</div>
        </div>
      `;
    } else {
      // GitHub 链接
      const githubLinkHtml = content.githubUrl ? `
        <div style="padding: 12px 16px; background: #252525; border-bottom: 1px solid #404040;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="color: #888; font-size: 12px;">📍 GitHub:</span>
            <a href="${content.githubUrl}" target="_blank" style="
              color: #60a5fa;
              font-size: 12px;
              text-decoration: none;
              word-break: break-all;
            " onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
              ${content.filePath}${content.line ? `:${content.line}` : ''}
            </a>
          </div>
        </div>
      ` : '';

      // 子组件列表
      const childComponentsHtml = content.childComponents.length > 0 ? `
        <div style="padding: 12px 16px; border-bottom: 1px solid #404040;">
          <div style="color: #888; font-size: 12px; margin-bottom: 8px;">
            📦 子组件 (${content.childComponents.length})
          </div>
          <div style="max-height: 150px; overflow-y: auto;">
            ${content.childComponents.map(child => `
              <div style="
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 8px;
                background: #2d2d2d;
                border-radius: 4px;
                margin-bottom: 4px;
              ">
                <span style="color: #a78bfa; font-size: 12px; font-family: monospace;">
                  ${child.name}
                </span>
                <a href="${child.githubUrl}" target="_blank" style="
                  color: #60a5fa;
                  font-size: 11px;
                  text-decoration: none;
                " onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
                  查看代码 →
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      // 代码块
      const codeHtml = content.code ? `
        <div style="padding: 12px 16px;">
          <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          ">
            <span style="color: #888; font-size: 12px;">📄 代码预览</span>
            <button id="analyzer-copy-code" style="
              background: #3b82f6;
              border: none;
              color: white;
              padding: 4px 12px;
              font-size: 11px;
              border-radius: 4px;
              cursor: pointer;
              transition: background 0.2s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
              复制代码
            </button>
          </div>
          <pre style="
            background: #0d0d0d;
            border-radius: 8px;
            padding: 12px;
            margin: 0;
            overflow-x: auto;
            max-height: 300px;
            overflow-y: auto;
            font-size: 12px;
            line-height: 1.5;
          "><code style="color: #d4d4d4; font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;">${escapeHtml(content.code)}</code></pre>
        </div>
      ` : '';

      bodyHtml = githubLinkHtml + childComponentsHtml + codeHtml;
    }
  }

  modalContainer.innerHTML = headerHtml + bodyHtml;

  // 绑定事件
  const toggleBtn = document.getElementById('analyzer-modal-toggle');
  const closeBtn = document.getElementById('analyzer-modal-close');
  const copyBtn = document.getElementById('analyzer-copy-code');

  toggleBtn?.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    renderModal(content);
  });

  closeBtn?.addEventListener('click', () => {
    hideModal();
    onCloseCallback?.();
  });

  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(content.code).then(() => {
      if (copyBtn) {
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => {
          copyBtn.textContent = '复制代码';
        }, 2000);
      }
    });
  });

  // 更新容器高度
  if (isCollapsed) {
    modalContainer.style.maxHeight = '48px';
  } else {
    modalContainer.style.maxHeight = '70vh';
  }
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 显示 Modal
 */
export function showModal(content: ModalContent, onClose?: () => void): void {
  if (!modalContainer) {
    modalContainer = createModalContainer();
  }
  onCloseCallback = onClose || null;
  modalContainer.style.display = 'block';
  renderModal(content);
}

/**
 * 更新 Modal 内容
 */
export function updateModal(content: Partial<ModalContent>): void {
  if (!modalContainer) return;
  
  // 获取当前内容并合并
  const currentContent = getCurrentContent();
  const newContent = { ...currentContent, ...content };
  renderModal(newContent);
}

/**
 * 显示加载状态
 */
export function showModalLoading(componentName: string): void {
  showModal({
    componentName,
    filePath: '',
    githubUrl: '',
    code: '',
    childComponents: [],
    loading: true
  });
}

/**
 * 显示错误
 */
export function showModalError(error: string): void {
  updateModal({
    loading: false,
    error
  });
}

/**
 * 隐藏 Modal
 */
export function hideModal(): void {
  if (modalContainer) {
    modalContainer.style.display = 'none';
  }
}

/**
 * 移除 Modal
 */
export function removeModal(): void {
  modalContainer?.remove();
  modalContainer = null;
  isCollapsed = false;
  onCloseCallback = null;
}

/**
 * Modal 是否可见
 */
export function isModalVisible(): boolean {
  return modalContainer?.style.display !== 'none';
}

// 内部状态存储
let currentModalContent: ModalContent = {
  componentName: '',
  filePath: '',
  githubUrl: '',
  code: '',
  childComponents: []
};

function getCurrentContent(): ModalContent {
  return currentModalContent;
}

// 导出更新后的 showModal
export function showModalWithState(content: ModalContent, onClose?: () => void): void {
  currentModalContent = content;
  if (!modalContainer) {
    modalContainer = createModalContainer();
  }
  onCloseCallback = onClose || null;
  modalContainer.style.display = 'block';
  renderModal(content);
}
