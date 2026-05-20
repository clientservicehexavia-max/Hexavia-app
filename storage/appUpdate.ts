import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_UPDATE_KEY = "PENDING_APP_UPDATE";

export type PendingUpdate = {
  ota: boolean;
  latestVersion: string | null;
  storeUrl: string | null;
  checkedAt: number;
};

export async function getPendingUpdate(): Promise<PendingUpdate | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_UPDATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingUpdate;
  } catch {
    return null;
  }
}

export async function setPendingUpdate(update: PendingUpdate): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_UPDATE_KEY, JSON.stringify(update));
  } catch {}
}

export async function clearPendingUpdate(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_UPDATE_KEY);
  } catch {}
}
