import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CustomTextInput from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
import { forgotPassword } from "@/redux/auth/auth.thunks";
import { useAppDispatch } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Platform, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

type FormValues = { email: string };

const schema = yup.object({
    email: yup
        .string()
        .trim()
        .required("Email is required")
        .test("email", "Enter a valid email", (val) => {
            if (!val) return false;
            const looksLikeEmail = /\S+@\S+\.\S+/.test(val);
            return looksLikeEmail;
        }),
});

const maskEmail = (v: string) => {
    if (!v.includes("@")) return v;
    const [user, domain] = v.split("@");
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}${"*".repeat(Math.max(3, user.length - 2))}${user.slice(-1)}@${domain}`;
};

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";
    const [emailFocused, setEmailFocused] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<FormValues>({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (values: FormValues) => {
        try {
            const userPayload = {
                email: values.email,
            };
            await dispatch(forgotPassword(userPayload)).unwrap();

            const masked = maskEmail(values.email);
            router.push({
                pathname: "/(auth)/otp-verification",
                params: { email: masked, type: "forgotPassword" },
            });
        } catch (err) {
            console.log("Reset Password failed:", err);
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
                title="Forgot Password"
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
                <View className="mb-7">
                    <Text className="font-kumbh text-[15px] leading-6 text-gray-500">
                        Enter your email address below to receive your password
                        reset code.
                    </Text>
                </View>

                {/* Email */}
                <View>
                    <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
                        Email Address
                    </Text>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View
                                className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                                    emailFocused
                                        ? "border-primary"
                                        : "border-gray-200"
                                }`}
                            >
                                <View className="mr-3">
                                    <Mail
                                        size={18}
                                        color={
                                            emailFocused ? "#4C5FAB" : "#6B7280"
                                        }
                                    />
                                </View>
                                <CustomTextInput
                                    placeholder="Enter Email Address"
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => {
                                        setEmailFocused(false);
                                        onBlur();
                                    }}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    className="h-full flex-1"
                                />
                            </View>
                        )}
                    />
                    {errors.email && (
                        <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                            {errors.email.message}
                        </Text>
                    )}
                </View>

                {/* Continue button */}
                <View className="mt-8">
                    <HexButton
                        title={isSubmitting ? "Please wait..." : "Continue"}
                        onPress={handleSubmit(onSubmit)}
                        disabled={!isValid || isSubmitting}
                    />
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
