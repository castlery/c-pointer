import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ComponentInfo } from '@component-analyzer/shared';

export type SessionStatus = 
  | 'inactive' 
  | 'selecting' 
  | 'selected' 
  | 'analyzing' 
  | 'completed' 
  | 'error';

interface SessionState {
  isActive: boolean;
  status: SessionStatus;
  selectedComponent: ComponentInfo | null;
}

const initialState: SessionState = {
  isActive: false,
  status: 'inactive',
  selectedComponent: null
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    activate: (state) => {
      state.isActive = true;
      state.status = 'selecting';
    },
    deactivate: (state) => {
      state.isActive = false;
      state.status = 'inactive';
      state.selectedComponent = null;
    },
    selectComponent: (state, action: PayloadAction<ComponentInfo>) => {
      state.selectedComponent = action.payload;
      state.status = 'selected';
    },
    clearSelection: (state) => {
      state.selectedComponent = null;
      state.status = state.isActive ? 'selecting' : 'inactive';
    },
    setStatus: (state, action: PayloadAction<SessionStatus>) => {
      state.status = action.payload;
    }
  }
});

export const { 
  activate, 
  deactivate, 
  selectComponent, 
  clearSelection, 
  setStatus 
} = sessionSlice.actions;

export default sessionSlice.reducer;
