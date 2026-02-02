import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from './slices/sessionSlice';
import analysisReducer from './slices/analysisSlice';
import configReducer from './slices/configSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    analysis: analysisReducer,
    config: configReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
