import { Platform, StyleSheet, Text, View } from "react-native";
import Toast, {
    ToastConfig,
    ToastConfigParams,
} from "react-native-toast-message";

const TOAST_TOP_OFFSET = Platform.select({ ios: 70, android: 50 }) ?? 60;

const BrandToastColors = {
    success: { background: "#4c5fab", text: "#fff" },
    error: { background: "#f43f5e", text: "#fff" },
    info: { background: "#0f172a", text: "#f8fafc" },
};

const toastStyles = StyleSheet.create({
    container: {
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
        marginHorizontal: 20,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: "700",
    },
    message: {
        fontSize: 13,
        marginTop: 4,
    },
});

const createToastRenderer = (backgroundColor: string, textColor: string) => {
    const ToastComponent = ({ text1, text2 }: ToastConfigParams<any>) => (
        <View style={[toastStyles.container, { backgroundColor }]}>
            {Boolean(text1) && (
                <Text style={[toastStyles.title, { color: textColor }]}>
                    {text1}
                </Text>
            )}
            {Boolean(text2) && (
                <Text style={[toastStyles.message, { color: textColor }]}>
                    {text2}
                </Text>
            )}
        </View>
    );
    ToastComponent.displayName = "ToastComponent";
    return ToastComponent;
};

const toastDefaults = {
    position: "top" as const,
    topOffset: TOAST_TOP_OFFSET,
};

export const toastConfig: ToastConfig = {
    success: createToastRenderer(
        BrandToastColors.success.background,
        BrandToastColors.success.text,
    ),
    error: createToastRenderer(
        BrandToastColors.error.background,
        BrandToastColors.error.text,
    ),
    info: createToastRenderer(
        BrandToastColors.info.background,
        BrandToastColors.info.text,
    ),
};

export function showSuccess(message: string, description?: string) {
    Toast.show({
        type: "success",
        text1: message,
        text2: description,
        visibilityTime: 3000,
        ...toastDefaults,
    });
}

export function showError(message: string, description?: string) {
    Toast.show({
        type: "error",
        text1: message,
        text2: description,
        visibilityTime: 4500,
        ...toastDefaults,
    });
}

export async function showPromise<T>(
    p: Promise<T>,
    loadingMessage = "Please wait…",
    successMessage = "Success",
): Promise<T> {
    Toast.show({
        type: "info",
        text1: loadingMessage,
        autoHide: false,
        ...toastDefaults,
    });

    try {
        const res = await p;
        Toast.hide();
        Toast.show({
            type: "success",
            text1: successMessage,
            visibilityTime: 2500,
            ...toastDefaults,
        });
        return res;
    } catch (e: any) {
        let safeBody = e?.config?.data;
        try {
            const parsed =
                typeof e?.config?.data === "string"
                    ? JSON.parse(e.config.data)
                    : e?.config?.data;
            if (parsed && typeof parsed === "object") {
                const clone: Record<string, any> = { ...parsed };
                if ("password" in clone) clone.password = "[REDACTED]";
                if ("newPassword" in clone) clone.newPassword = "[REDACTED]";
                if ("token" in clone) clone.token = "[REDACTED]";
                safeBody = clone;
            }
        } catch {}

        // 🔎 noisy console logging so you can see what's going on
        console.log("[showPromise] error", {
            message: e?.message,
            status: e?.response?.status,
            data: e?.response?.data,
            url: e?.config?.url,
            method: e?.config?.method,
            params: e?.config?.params,
            body: safeBody,
        });

        const msg =
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Something went wrong";

        Toast.hide();
        Toast.show({
            type: "error",
            text1: msg,
            visibilityTime: 5000,
            ...toastDefaults,
        });
        throw e;
    }
}

export { TOAST_TOP_OFFSET };
