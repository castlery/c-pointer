const STORAGE_KEY = "device_user_id";

export async function getDeviceUserId(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const existing = result[STORAGE_KEY] as string | undefined;
  if (existing) {
    return existing;
  }

  const next = `dev_${crypto.randomUUID()}`;
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}
