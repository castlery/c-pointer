import type { ComponentInfo, AnalysisResult, AnalysisError } from '@component-analyzer/shared';

// Content Script → Background
export type ContentToBackgroundMessage =
  | { type: 'COMPONENT_SELECTED'; payload: ComponentInfo }
  | { type: 'SELECTION_CLEARED' }
  | { type: 'REQUEST_ANALYSIS'; payload: ComponentInfo };

// Background → Content Script
export type BackgroundToContentMessage =
  | { type: 'ACTIVATE_SELECTION' }
  | { type: 'DEACTIVATE_SELECTION' }
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: AnalysisError };

// Popup/Panel → Background
export type UIToBackgroundMessage =
  | { type: 'TOGGLE_SELECTION' }
  | { type: 'GET_STATUS' }
  | { type: 'GET_SELECTED_COMPONENT' }
  | { type: 'REQUEST_ANALYSIS' }
  | { type: 'UPDATE_CONFIG'; payload: { backendUrl: string } };

// Background → Popup/Panel
export type BackgroundToUIMessage =
  | { type: 'STATUS_UPDATE'; payload: { isActive: boolean; selectedComponent: ComponentInfo | null } }
  | { type: 'ANALYSIS_STARTED' }
  | { type: 'ANALYSIS_COMPLETED'; payload: AnalysisResult }
  | { type: 'ANALYSIS_FAILED'; payload: AnalysisError };

export type Message = 
  | ContentToBackgroundMessage 
  | BackgroundToContentMessage 
  | UIToBackgroundMessage 
  | BackgroundToUIMessage;
