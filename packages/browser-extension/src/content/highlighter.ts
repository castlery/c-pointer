import type { ComponentType } from '@component-analyzer/shared';

// Fortress Design Tokens
const DESIGN = {
  colors: {
    fortress: '#8B5CF6',
    business: '#F59E0B',
    shared: '#06B6D4',
    unknown: '#6B7280',
    preview: '#3B82F6',
    selected: '#22C55E',
  },
};

let previewOverlay: HTMLDivElement | null = null;
let selectedOverlay: HTMLDivElement | null = null;
let typeLabel: HTMLDivElement | null = null;

/**
 * 创建 overlay 元素
 * z-index 设置为较高值但低于 modal (2147483646)
 */
function createOverlay(id: string): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483640;
    transition: all 0.05s ease;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * 更新 overlay 位置和大小
 */
function updateOverlayPosition(overlay: HTMLDivElement, rect: DOMRect): void {
  overlay.style.top = `${rect.top}px`;
  overlay.style.left = `${rect.left}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;
}

/**
 * 显示预览高亮（蓝色虚线）
 */
export function showPreviewHighlight(element: HTMLElement): void {
  if (!previewOverlay) {
    previewOverlay = createOverlay('analyzer-preview-overlay');
  }
  
  const rect = element.getBoundingClientRect();
  updateOverlayPosition(previewOverlay, rect);
  
  previewOverlay.style.border = '2px dashed #3B82F6';
  previewOverlay.style.borderRadius = '4px';
  previewOverlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  previewOverlay.style.display = 'block';
}

/**
 * 隐藏预览高亮
 */
export function hidePreviewHighlight(): void {
  if (previewOverlay) {
    previewOverlay.style.display = 'none';
  }
}


/**
 * 显示选中高亮（绿色实线）
 */
export function showSelectedHighlight(element: HTMLElement, componentType: ComponentType): void {
  if (!selectedOverlay) {
    selectedOverlay = createOverlay('analyzer-selected-overlay');
  }
  
  const rect = element.getBoundingClientRect();
  updateOverlayPosition(selectedOverlay, rect);
  
  selectedOverlay.style.border = '2px solid #22C55E';
  selectedOverlay.style.borderRadius = '4px';
  selectedOverlay.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
  selectedOverlay.style.display = 'block';
  
  showTypeLabel(rect, componentType);
}

/**
 * 显示组件类型标签
 */
function showTypeLabel(rect: DOMRect, componentType: ComponentType): void {
  if (!typeLabel) {
    typeLabel = document.createElement('div');
    typeLabel.id = 'analyzer-type-label';
    typeLabel.style.cssText = `
      position: fixed;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      border-radius: 4px 4px 0 0;
      z-index: 2147483640;
      pointer-events: none;
    `;
    document.body.appendChild(typeLabel);
  }
  
  const typeColors: Record<ComponentType, string> = {
    fortress: DESIGN.colors.fortress,
    business: DESIGN.colors.business,
    shared: DESIGN.colors.shared,
    unknown: DESIGN.colors.unknown
  };
  
  const typeLabels: Record<ComponentType, string> = {
    fortress: 'Fortress',
    business: 'Business',
    shared: 'Shared',
    unknown: 'Unknown'
  };
  
  typeLabel.textContent = typeLabels[componentType];
  typeLabel.style.backgroundColor = typeColors[componentType];
  typeLabel.style.top = `${Math.max(0, rect.top - 24)}px`;
  typeLabel.style.left = `${rect.left}px`;
  typeLabel.style.display = 'block';
}

/**
 * 隐藏选中高亮
 */
export function hideSelectedHighlight(): void {
  if (selectedOverlay) {
    selectedOverlay.style.display = 'none';
  }
  if (typeLabel) {
    typeLabel.style.display = 'none';
  }
}

/**
 * 清除所有高亮
 */
export function clearAllHighlights(): void {
  hidePreviewHighlight();
  hideSelectedHighlight();
}

/**
 * 移除所有 overlay 元素
 */
export function removeAllOverlays(): void {
  previewOverlay?.remove();
  previewOverlay = null;
  selectedOverlay?.remove();
  selectedOverlay = null;
  typeLabel?.remove();
  typeLabel = null;
}
