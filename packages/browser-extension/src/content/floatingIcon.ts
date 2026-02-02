/**
 * Fortress Design System - Floating Icon Component
 * 
 * 功能：
 * - 可拖拽定位
 * - 点击展开/收起 Drawer
 * - 关闭按钮退出插件
 * - 自动检测 Castlery 测试环境
 * 
 * 设计规范：
 * - 主色调：Terracotta (#844025)
 * - 背景色：Warm Linen (#FBF9F4)
 * - 圆角：12px
 * - 阴影：柔和投影
 */

const STORAGE_KEY = 'analyzer-icon-position';
const ICON_SIZE = 48;
const MIN_MARGIN = 16;

// Fortress Design Tokens
const COLORS = {
  terracotta: '#844025',
  orange: '#D25C1B',
  warmLinen: '#FBF9F4',
  warmLinenLight: '#F6F3E7',
  maroon: '#3C101E',
  mono100: '#EDEDED',
  mono300: '#BEBEBE',
  mono500: '#9E9E9E',
  mono700: '#616161',
  danger: '#DC2626',
  success: '#22C55E',
};

interface Position {
  x: number;
  y: number;
}

let iconContainer: HTMLDivElement | null = null;
let isDragging = false;
let dragStartPos: Position = { x: 0, y: 0 };
let iconStartPos: Position = { x: 0, y: 0 };
let hasMoved = false;

// 回调函数
let onClickCallback: (() => void) | null = null;
let onCloseCallback: (() => void) | null = null;

/**
 * 获取保存的位置
 */
function getSavedPosition(): Position {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('[FloatingIcon] Failed to load position:', e);
  }
  // 默认位置：右下角
  return {
    x: window.innerWidth - ICON_SIZE - 20,
    y: window.innerHeight - ICON_SIZE - 20
  };
}

/**
 * 保存位置
 */
function savePosition(pos: Position): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch (e) {
    console.warn('[FloatingIcon] Failed to save position:', e);
  }
}

/**
 * 限制位置在视口内
 */
function constrainPosition(pos: Position): Position {
  return {
    x: Math.max(MIN_MARGIN, Math.min(window.innerWidth - ICON_SIZE - MIN_MARGIN, pos.x)),
    y: Math.max(MIN_MARGIN, Math.min(window.innerHeight - ICON_SIZE - MIN_MARGIN, pos.y))
  };
}

/**
 * 创建悬浮图标
 */
function createIcon(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = 'analyzer-floating-icon';
  
  const pos = getSavedPosition();
  const constrained = constrainPosition(pos);
  
  container.style.cssText = `
    position: fixed;
    left: ${constrained.x}px;
    top: ${constrained.y}px;
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    border-radius: 12px;
    background: ${COLORS.warmLinen};
    border: 1px solid ${COLORS.mono100};
    box-shadow: 0 2px 12px rgba(132, 64, 37, 0.15);
    cursor: grab;
    z-index: 2147483646;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    backdrop-filter: blur(8px);
  `;
  
  // 主图标 - Castlery 风格的搜索图标
  const iconWrapper = document.createElement('div');
  iconWrapper.style.cssText = `
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `;
  iconWrapper.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.terracotta}" stroke-width="1.5">
      <circle cx="11" cy="11" r="7"/>
      <path d="M21 21l-4.35-4.35"/>
      <path d="M11 8v6M8 11h6" stroke-linecap="round"/>
    </svg>
  `;
  container.appendChild(iconWrapper);
  
  // 关闭按钮 - 更精致的设计
  const closeBtn = document.createElement('button');
  closeBtn.id = 'analyzer-icon-close';
  closeBtn.style.cssText = `
    position: absolute;
    top: -5px;
    right: -5px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${COLORS.mono500};
    border: 2px solid ${COLORS.warmLinen};
    color: white;
    font-size: 10px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
    padding: 0;
    line-height: 1;
  `;
  closeBtn.innerHTML = `
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 2l6 6M8 2l-6 6"/>
    </svg>
  `;
  container.appendChild(closeBtn);
  
  // Hover 效果
  container.addEventListener('mouseenter', () => {
    container.style.transform = 'scale(1.08)';
    container.style.boxShadow = '0 4px 20px rgba(132, 64, 37, 0.25)';
    container.style.borderColor = COLORS.terracotta;
    closeBtn.style.opacity = '1';
  });
  
  container.addEventListener('mouseleave', () => {
    if (!isDragging) {
      container.style.transform = 'scale(1)';
      container.style.boxShadow = '0 2px 12px rgba(132, 64, 37, 0.15)';
      container.style.borderColor = COLORS.mono100;
      closeBtn.style.opacity = '0';
    }
  });
  
  // 关闭按钮 hover
  closeBtn.addEventListener('mouseenter', () => {
    closeBtn.style.background = COLORS.danger;
  });
  closeBtn.addEventListener('mouseleave', () => {
    closeBtn.style.background = COLORS.mono500;
  });
  
  // 拖拽事件
  container.addEventListener('mousedown', handleMouseDown);
  
  // 关闭按钮事件
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    onCloseCallback?.();
  });
  
  document.body.appendChild(container);
  return container;
}

/**
 * 处理鼠标按下
 */
function handleMouseDown(e: MouseEvent): void {
  if ((e.target as HTMLElement).id === 'analyzer-icon-close') return;
  
  isDragging = true;
  hasMoved = false;
  dragStartPos = { x: e.clientX, y: e.clientY };
  
  if (iconContainer) {
    iconStartPos = {
      x: parseInt(iconContainer.style.left),
      y: parseInt(iconContainer.style.top)
    };
    iconContainer.style.cursor = 'grabbing';
  }
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

/**
 * 处理鼠标移动
 */
function handleMouseMove(e: MouseEvent): void {
  if (!isDragging || !iconContainer) return;
  
  const deltaX = e.clientX - dragStartPos.x;
  const deltaY = e.clientY - dragStartPos.y;
  
  // 判断是否真的在拖拽
  if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
    hasMoved = true;
  }
  
  const newPos = constrainPosition({
    x: iconStartPos.x + deltaX,
    y: iconStartPos.y + deltaY
  });
  
  iconContainer.style.left = `${newPos.x}px`;
  iconContainer.style.top = `${newPos.y}px`;
}

/**
 * 处理鼠标释放
 */
function handleMouseUp(): void {
  if (!iconContainer) return;
  
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  
  iconContainer.style.cursor = 'grab';
  
  if (isDragging) {
    // 保存位置
    const pos = {
      x: parseInt(iconContainer.style.left),
      y: parseInt(iconContainer.style.top)
    };
    savePosition(pos);
    
    // 如果没有移动，视为点击
    if (!hasMoved) {
      onClickCallback?.();
    }
  }
  
  isDragging = false;
}

/**
 * 窗口 resize 处理
 */
function handleResize(): void {
  if (!iconContainer) return;
  
  const currentPos = {
    x: parseInt(iconContainer.style.left),
    y: parseInt(iconContainer.style.top)
  };
  
  const constrained = constrainPosition(currentPos);
  iconContainer.style.left = `${constrained.x}px`;
  iconContainer.style.top = `${constrained.y}px`;
}

// ============ 公共 API ============

/**
 * 显示悬浮图标
 */
export function showFloatingIcon(
  onClick: () => void,
  onClose: () => void
): void {
  if (!iconContainer) {
    iconContainer = createIcon();
    window.addEventListener('resize', handleResize);
  }
  
  onClickCallback = onClick;
  onCloseCallback = onClose;
  iconContainer.style.display = 'flex';
}

/**
 * 隐藏悬浮图标
 */
export function hideFloatingIcon(): void {
  if (iconContainer) {
    iconContainer.style.display = 'none';
  }
}

/**
 * 移除悬浮图标
 */
export function removeFloatingIcon(): void {
  if (iconContainer) {
    iconContainer.remove();
    iconContainer = null;
    window.removeEventListener('resize', handleResize);
  }
  onClickCallback = null;
  onCloseCallback = null;
}

/**
 * 设置图标状态（展开/收起）
 */
export function setIconState(expanded: boolean): void {
  if (!iconContainer) return;
  
  const iconWrapper = iconContainer.querySelector('div');
  if (iconWrapper) {
    iconWrapper.innerHTML = expanded 
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.terracotta}" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18"/>
          <path d="M14 9l3 3-3 3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${COLORS.terracotta}" stroke-width="1.5">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.35-4.35"/>
          <path d="M11 8v6M8 11h6" stroke-linecap="round"/>
        </svg>`;
  }
}

/**
 * 图标是否可见
 */
export function isIconVisible(): boolean {
  return iconContainer?.style.display !== 'none';
}
