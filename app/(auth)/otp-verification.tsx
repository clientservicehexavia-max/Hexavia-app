import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import HexButton from "@/components/ui/HexButton";
import {
    forgotPassword as forgotPasswordThunk,
    resendRegisterOtp,
    verifyEmail as verifyThunk,
} from "@/redux/auth/auth.thunks";
import { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { default as React, useEffect, useRef, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "react-native-toast-notifications";

const DIGITS = 6;
const RESEND_SECS = 30;

export default function OtpVerification() {
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";
    const { lastEmailForOtp } = useAppSelector((s: RootState) => s.auth);
    const {
        email: maskedFromParams = "",
        type = "signup",
        phoneNumber,
    } = useLocalSearchParams<{
        email?: string;
        type?: string;
        phoneNumber?: string;
    }>();
    const router = useRouter();
    const toast = useToast();
    const realEmail =
        lastEmailForOtp || String(maskedFromParams).replace(/\*/g, "");

    const [otp, setOtp] = useState<string[]>(Array(DIGITS).fill(""));
    const [focusIdx, setFocusIdx] = useState<number>(0);
    const inputs = useRef<TextInput[]>([]);
    const [seconds, setSeconds] = useState<number>(RESEND_SECS);
    const code = otp.join("");
    const canVerify = code.length === DIGITS;

    useEffect(() => {
        if (seconds <= 0) return;
        const t = setInterval(() => setSeconds((s) => s - 1), 1000);
        return () => clearInterval(t);
    }, [seconds]);

    useEffect(() => {
        setTimeout(() => inputs.current[0]?.focus(), 100);
    }, []);

    const handleChange = (text: string, index: number) => {
        const val = text.replace(/[^\d]/g, "").slice(-1);
        const next = [...otp];
        next[index] = val;
        setOtp(next);

        if (val && index < DIGITS - 1) {
            inputs.current[index + 1]?.focus();
            setFocusIdx(index + 1);
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === "Backspace") {
            if (otp[index]) {
                const next = [...otp];
                next[index] = "";
                setOtp(next);
                return;
            }
            if (index > 0) {
                inputs.current[index - 1]?.focus();
                setFocusIdx(index - 1);
                const next = [...otp];
                next[index - 1] = "";
                setOtp(next);
            }
        }
    };

    const resend = async () => {
        if (seconds > 0) return;
        if (type === "forgotPassword") {
            await dispatch(forgotPasswordThunk({ email: realEmail }));
        } else {
            await dispatch(resendRegisterOtp(realEmail));
        }
        setSeconds(RESEND_SECS);
    };

    const onVerify = async () => {
        if (!canVerify) return;
        try {
            if (type === "signup" && phoneNumber) {
                await dispatch(
                    verifyThunk({ email: realEmail, otp: code }),
                ).unwrap();
            }

            const nextRoute =
                type === "login"
                    ? "/(staff)/(tabs)/"
                    : type === "forgotPassword"
                      ? "/(auth)/reset-password"
                      : "/(auth)/create-password";
            let nextRouteParams = {};
            if (type === "signup" && phoneNumber) {
                nextRouteParams = { phoneNumber };
            }
            if (type === "forgotPassword") {
                nextRouteParams = { code, email: realEmail };
            }

            router.replace({
                pathname: nextRoute as any,
                params: nextRouteParams,
            });
        } catch {
            // Error handled in thunk
        }
    };

    return (
        <SafeAreaView
            accessible={false}
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />
            <PlatformAdaptiveHeader title="Verify Password" />

            <KeyboardAwareScrollView
                enableOnAndroid
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 32,
                }}
            >
                {type === "signup" && (
                    <View className="mt-[70px] flex flex-row justify-between gap-2">
                        <View className="flex-1 h-1 bg-gray-200 rounded-xl" />
                        <View className="flex-1 h-1 bg-primary rounded-xl" />
                        <View className="flex-1 h-1 bg-gray-200 rounded-xl" />
                    </View>
                )}

                {/* Title + subtitle */}
                <View
                    className={`${type === "login" || type === "forgotPassword" ? "mt-10" : "mt-6"}`}
                >
                    <Text className="text-base text-gray-500 mt-2 font-kumbhLight">
                        We’ve sent you an OTP Code via Email. Please enter the{" "}
                        {DIGITS}
                        -digit code sent to{" "}
                        <Text className="text-primary font-kumbh">
                            {String(maskedFromParams)}
                        </Text>
                    </Text>
                </View>

                {/* OTP Boxes */}
                <View className="mt-8 flex-row justify-between px-2">
                    {Array.from({ length: DIGITS }).map((_, i) => {
                        const isActive = focusIdx === i;
                        const hasValue = otp[i]?.length > 0;
                        return (
                            <View
                                key={i}
                                className={`w-14 h-16 rounded-2xl items-center justify-center border
                    ${isActive ? "border-primary" : hasValue ? "border-gray-400" : "border-gray-300"}
                    bg-white`}
                            >
                                <TextInput
                                    ref={(ref) => {
                                        if (ref) inputs.current[i] = ref;
                                    }}
                                    keyboardType={
                                        Platform.OS === "ios"
                                            ? "number-pad"
                                            : "numeric"
                                    }
                                    maxLength={1}
                                    value={otp[i]}
                                    onChangeText={(t) => handleChange(t, i)}
                                    onKeyPress={(e) => handleKeyPress(e, i)}
                                    onFocus={() => setFocusIdx(i)}
                                    className="text-3xl text-black font-kumbh text-center w-full"
                                    selectionColor="#7C3AED"
                                />
                            </View>
                        );
                    })}
                </View>

                {/* Resend */}
                <View className="mt-8 items-center">
                    <Text className="text-gray-700 font-kumbh">
                        Didn’t Receive it?{" "}
                        <Text
                            className={`font-kumbhBold ${seconds > 0 ? "text-gray-400" : "text-primary"}`}
                            onPress={resend}
                        >
                            Resend{" "}
                            {seconds > 0
                                ? `0:${String(seconds).padStart(2, "0")}`
                                : ""}
                        </Text>
                    </Text>
                </View>

                {/* Verify button */}
                <View className="mt-12">
                    <HexButton
                        title="Verify"
                        onPress={onVerify}
                        disabled={!canVerify}
                    />
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
