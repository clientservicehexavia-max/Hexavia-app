import { showError, showSuccess } from "@/components/ui/toast";
import * as Clipboard from "expo-clipboard";
import { Linking, Platform } from "react-native";

export async function openEmail(email?: string) {
    if (!email) return;
    const target = `mailto:${email}`;

    try {
        // Try opening mail client directly. Some platforms (simulators) may
        // not support mailto: so openURL can throw — catch and fallback.
        await Linking.openURL(target);
        return;
    } catch (error) {
        console.warn("Unable to open mail client", error);
    }

    // Fallback: copy the email address to clipboard and notify user.
    try {
        await Clipboard.setStringAsync(email);
        showSuccess("Email address copied to clipboard.");
    } catch (err) {
        console.warn("Unable to copy email to clipboard", err);
        showError("Unable to open mail client or copy email.");
    }
}

export async function dialPhone(phone?: string) {
    if (!phone) return;
    const sanitized = phone.replace(/[^\d+]/g, "");
    if (!sanitized) return;
    const targets =
        Platform.OS === "ios"
            ? [`telprompt:${sanitized}`, `tel:${sanitized}`]
            : [`tel:${sanitized}`];

    for (const target of targets) {
        try {
            const supported = await Linking.canOpenURL(target);
            if (supported) {
                await Linking.openURL(target);
                return;
            }
        } catch (error) {
            console.warn("Unable to launch phone dialer", error);
        }
    }
    console.warn("Unable to call phone number", phone);
}

export async function openWhatsApp(phone?: string, message?: string) {
    const normalized = normalizeWhatsAppPhone(phone);
    if (!normalized) return;
    const text = message ? `&text=${encodeURIComponent(message)}` : "";
    const appUrl = `whatsapp://send?phone=${normalized}${text}`;
    const webUrl = `https://wa.me/${normalized}${
        message ? `?text=${encodeURIComponent(message)}` : ""
    }`;
    try {
        const supported = await Linking.canOpenURL(appUrl);
        if (supported) {
            await Linking.openURL(appUrl);
            return;
        }
    } catch (error) {
        console.warn("Unable to open WhatsApp app", error);
    }
    try {
        const supportedWeb = await Linking.canOpenURL(webUrl);
        if (supportedWeb) {
            await Linking.openURL(webUrl);
            return;
        }
    } catch (error) {
        console.warn("Unable to open WhatsApp web", error);
    }
    console.warn("Unable to open WhatsApp for number", phone);
}

function normalizeWhatsAppPhone(phone?: string) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    if (!digits) return "";

    if (digits.startsWith("2340") && digits.length === 14) {
        return `234${digits.slice(4)}`;
    }

    if (digits.startsWith("0") && digits.length === 11) {
        return `234${digits.slice(1)}`;
    }

    return digits;
}
