import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CustomTextInput from "@/components/ui/CustomInput";
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
            className="flex-1 bg-[#F5F7FB]"
        >
            <StatusBar style="dark" />
            <PlatformAdaptiveHeader
                title="Verify OTP"
                backgroundColor="#F5F7FB"
            />

            <KeyboardAwareScrollView
                enableOnAndroid
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingTop: 12,
                    paddingBottom: 32,
                }}
            >
                {type === "signup" && (
                    <View className="mb-6 flex-row justify-between gap-2">
                        <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
                        <View className="h-1.5 flex-1 rounded-full bg-primary" />
                        <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
                    </View>
                )}

                {/* Title + subtitle */}
                <View className="mb-8">
                    <Text className="font-kumbh text-[15px] leading-6 text-gray-500">
                        We’ve sent you an OTP Code via Email. Please enter the{" "}
                        {DIGITS}
                        -digit code sent to{" "}
                        <Text className="font-kumbhBold text-primary">
                            {String(maskedFromParams)}
                        </Text>
                    </Text>
                </View>

                {/* OTP Boxes */}
                <View className="flex-row justify-between gap-2">
                    {Array.from({ length: DIGITS }).map((_, i) => {
                        const isActive = focusIdx === i;
                        const hasValue = otp[i]?.length > 0;
                        return (
                            <View
                                key={i}
                                className={`h-14 flex-1 items-center justify-center rounded-2xl border bg-white ${
                                    isActive
                                        ? "border-primary"
                                        : hasValue
                                          ? "border-gray-300"
                                          : "border-gray-200"
                                }`}
                            >
                                <CustomTextInput
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
                                    className="h-full w-full text-center font-kumbhBold text-2xl"
                                    selectionColor="#4C5FAB"
                                />
                            </View>
                        );
                    })}
                </View>

                {/* Resend */}
                <View className="mt-6 items-center">
                    <Text className="font-kumbh text-sm text-gray-600">
                        Didn’t receive it?{" "}
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
                <View className="mt-8">
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
