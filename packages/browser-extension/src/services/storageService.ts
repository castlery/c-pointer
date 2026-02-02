const STORAGE_KEYS = {
  BACKEND_URL: 'backendUrl',
  IS_ACTIVE: 'isActive'
} as const;

const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export const storageService = {
  async getBackendUrl(): Promise<string> {
    const result = await chrome.storage.sync.get(STORAGE_KEYS.BACKEND_URL);
    return result[STORAGE_KEYS.BACKEND_URL] || DEFAULT_BACKEND_URL;
  },

  async setBackendUrl(url: string): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEYS.BACKEND_URL]: url });
  },

  async getIsActive(): Promise<boolean> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.IS_ACTIVE);
    return result[STORAGE_KEYS.IS_ACTIVE] || false;
  },

  async setIsActive(isActive: boolean): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.IS_ACTIVE]: isActive });
  }
};
