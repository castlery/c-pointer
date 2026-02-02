import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { storageService } from '../../services/storageService';
import { apiClient } from '../../services/apiClient';

interface ConfigState {
  backendUrl: string;
  isConnected: boolean;
  isChecking: boolean;
}

const initialState: ConfigState = {
  backendUrl: 'http://localhost:3001',
  isConnected: false,
  isChecking: false
};

export const loadConfig = createAsyncThunk(
  'config/load',
  async () => {
    const backendUrl = await storageService.getBackendUrl();
    return { backendUrl };
  }
);

export const checkConnection = createAsyncThunk(
  'config/checkConnection',
  async (_, { getState }) => {
    const state = getState() as { config: ConfigState };
    apiClient.setBackendUrl(state.config.backendUrl);
    const health = await apiClient.health();
    return health.status === 'ok' || health.status === 'degraded';
  }
);

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setBackendUrl: (state, action: PayloadAction<string>) => {
      state.backendUrl = action.payload;
      apiClient.setBackendUrl(action.payload);
      storageService.setBackendUrl(action.payload);
    },
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadConfig.fulfilled, (state, action) => {
        state.backendUrl = action.payload.backendUrl;
        apiClient.setBackendUrl(action.payload.backendUrl);
      })
      .addCase(checkConnection.pending, (state) => {
        state.isChecking = true;
      })
      .addCase(checkConnection.fulfilled, (state, action) => {
        state.isConnected = action.payload;
        state.isChecking = false;
      })
      .addCase(checkConnection.rejected, (state) => {
        state.isConnected = false;
        state.isChecking = false;
      });
  }
});

export const { setBackendUrl, setConnectionStatus } = configSlice.actions;

export default configSlice.reducer;
