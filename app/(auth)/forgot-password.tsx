import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import HexButton from "@/components/ui/HexButton";
import { forgotPassword } from "@/redux/auth/auth.thunks";
import { useAppDispatch } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Mail } from "lucide-react-native";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Platform, Text, TextInput, View } from "react-native";
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
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />
            <PlatformAdaptiveHeader title="Forgot Password" />
            <KeyboardAwareScrollView
                enableOnAndroid
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 32,
                }}
            >
                <View>
                    <Text className="text-base text-gray-500 mt-2 font-kumbhLight">
                        Enter your email address below to receive your password
                        reset.
                    </Text>
                </View>

                {/* Email */}
                <View className="mt-6">
                    <Text className="text-sm text-gray-700 mb-2 font-kumbh">
                        Email Address
                    </Text>
                    <Controller
                        control={control}
                        name="email"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                <View className="mr-2">
                                    <Mail size={18} color="#6B7280" />
                                </View>
                                <TextInput
                                    placeholder="Enter Email Address"
                                    placeholderTextColor="#9CA3AF"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    className="flex-1 text-black font-kumbh"
                                    style={{
                                        paddingVertical: 0,
                                        height: 56,
                                    }}
                                />
                            </View>
                        )}
                    />
                    {errors.email && (
                        <Text className="text-red-500 text-xs mt-1 font-kumbh">
                            {errors.email.message}
                        </Text>
                    )}
                </View>

                {/* Continue button */}
                <View className="mt-10">
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
