import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./keys";

export async function saveToken(token: string) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
}
export async function getToken() {
    return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
}
export async function clearToken() {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
}

export async function saveUser<T extends object>(user: T) {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}
export async function getUser<T>() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return raw ? (JSON.parse(raw) as T) : null;
}
export async function clearUser() {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
}

export async function saveActiveChannelId(channelId: string | null) {
    if (channelId) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_CHANNEL_ID, channelId);
    } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_CHANNEL_ID);
    }
}

export async function getActiveChannelId() {
    return AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_CHANNEL_ID);
}

export async function clearActiveChannelId() {
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_CHANNEL_ID);
}
