import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AnalysisResult, AnalysisError, ComponentInfo } from '@component-analyzer/shared';
import { apiClient } from '../../services/apiClient';

interface AnalysisState {
  isLoading: boolean;
  currentStep: string | null;
  result: AnalysisResult | null;
  error: AnalysisError | null;
}

const initialState: AnalysisState = {
  isLoading: false,
  currentStep: null,
  result: null,
  error: null
};

export const analyzeComponent = createAsyncThunk(
  'analysis/analyze',
  async (
    { componentInfo, pageUrl }: { componentInfo: ComponentInfo; pageUrl: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.analyze(componentInfo, pageUrl);
      if (!response.success) {
        return rejectWithValue(response.error);
      }
      return response.result;
    } catch (error) {
      return rejectWithValue({
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const analysisSlice = createSlice({
  name: 'analysis',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<string>) => {
      state.currentStep = action.payload;
    },
    clearResult: (state) => {
      state.result = null;
      state.error = null;
      state.currentStep = null;
    },
    setResult: (state, action: PayloadAction<AnalysisResult>) => {
      state.result = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setError: (state, action: PayloadAction<AnalysisError>) => {
      state.error = action.payload;
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(analyzeComponent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.currentStep = '正在分析组件...';
      })
      .addCase(analyzeComponent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.result = action.payload!;
        state.currentStep = null;
      })
      .addCase(analyzeComponent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AnalysisError;
        state.currentStep = null;
      });
  }
});

export const { setStep, clearResult, setResult, setError } = analysisSlice.actions;

export default analysisSlice.reducer;
