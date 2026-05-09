// utils/deviceId.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
// nanoid uses crypto, which is not available in React Native/Expo
function randomString(length = 8) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const STORAGE_KEY = "@hexavia/deviceId";

export async function getDeviceId(): Promise<string> {
    let id = await AsyncStorage.getItem(STORAGE_KEY);
    if (!id) {
        id = `${Platform.OS}-${Device.osBuildId || "unknown"}-${randomString(8)}`;
        await AsyncStorage.setItem(STORAGE_KEY, id);
    }
    return id;
}
