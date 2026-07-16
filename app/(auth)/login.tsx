import HexButton from "@/components/ui/HexButton";
import { login } from "@/redux/auth/auth.thunks";
import { useAppDispatch } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    Keyboard,
    Pressable,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useToast } from "react-native-toast-notifications";
import * as yup from "yup";

type FormValues = { email: string; password: string };

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
    password: yup
        .string()
        .min(6, "Minimum 6 characters")
        .required("Password is required"),
});

const maskEmail = (v: string) => {
    if (!v.includes("@")) return v;
    const [user, domain] = v.split("@");
    if (user.length <= 2) return `${user[0]}***@${domain}`;
    return `${user[0]}${"*".repeat(Math.max(3, user.length - 2))}${user.slice(-1)}@${domain}`;
};

export default function LoginScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const [showPassword, setShowPassword] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid, isSubmitting },
    } = useForm<FormValues>({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: { email: "", password: "" },
    });

    type Role =
        | "staff"
        | "client"
        | "supervisor"
        | "clientservice"
        | "admin"
        | "super-admin";

    const pathByRole: Record<Role, string> = {
        staff: "/(staff)/(tabs)",
        client: "/(client)/(tabs)",
        supervisor: "/(admin)/(tabs)",
        clientservice: "/(admin)/(tabs)",
        admin: "/(admin)/(tabs)",
        "super-admin": "/(admin)/(tabs)",
    };

    function redirectByRole(
        router: ReturnType<typeof useRouter>,
        role: string | null | undefined,
    ) {
        const r = (role ?? "").toLowerCase() as Role;
        if (r && r in pathByRole) {
            router.replace(pathByRole[r] as any);
        } else {
            router.replace("/(client)/(tabs)");
        }
    }

    const onSubmit = async (values: FormValues) => {
        try {
            const userPayload = {
                email: values.email,
                password: values.password,
            };
            const response = await dispatch(login(userPayload)).unwrap();
            const user: { role?: string } = response?.user || {};

            const masked = maskEmail(values.email);
            redirectByRole(router, user.role);
        } catch (err) {
            console.log("Login failed:", err);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View className="flex-1 bg-white">
                <StatusBar style="dark" />

                <KeyboardAwareScrollView
                    enableOnAndroid
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingBottom: 32,
                    }}
                >
                    <View className="mt-24">
                        <Text className="text-3xl text-black font-kumbhBold">
                            Good to see you again!
                        </Text>
                        <Text className="text-base text-gray-500 mt-2 font-kumbhLight">
                            Access your Hexavian account and stay on top of your
                            projects, finances, and updates
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
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
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

                    {/* Password */}
                    <View className="mt-4">
                        <Text className="text-sm text-gray-700 mb-2 font-kumbh">
                            Password
                        </Text>
                        <Controller
                            control={control}
                            name="password"
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                    <View className="mr-2">
                                        <Lock size={18} color="#6B7280" />
                                    </View>
                                    <TextInput
                                        placeholder="Enter Password"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry={!showPassword}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        className="flex-1 text-black font-kumbh"
                                        style={{
                                            paddingVertical: 0,
                                            height: 56,
                                        }}
                                    />
                                    <Pressable
                                        onPress={() =>
                                            setShowPassword((s) => !s)
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={20} color="#111827" />
                                        ) : (
                                            <Eye size={20} color="#111827" />
                                        )}
                                    </Pressable>
                                </View>
                            )}
                        />
                        {errors.password && (
                            <Text className="text-red-500 text-xs mt-1 font-kumbh">
                                {errors.password.message}
                            </Text>
                        )}
                    </View>

                    {/* Forgot password */}
                    <View className="mt-3">
                        <Pressable
                            onPress={() =>
                                router.push("/(auth)/forgot-password")
                            }
                        >
                            <Text className="text-[14px] font-kumbh">
                                <Text className="text-gray-600">
                                    Forgot Password?{" "}
                                </Text>
                                <Text className="text-primary font-kumbhBold">
                                    Reset Password
                                </Text>
                            </Text>
                        </Pressable>
                    </View>

                    {/* Continue button */}
                    <View className="mt-10">
                        <HexButton
                            title={isSubmitting ? "Please wait..." : "Continue"}
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || isSubmitting}
                        />
                    </View>

                    {/* Sign up */}
                    <View className="mt-4 items-center">
                        <Text className="text-gray-600 font-kumbh">
                            Don’t have an account?{" "}
                            <Text
                                className="text-primary font-kumbhBold"
                                onPress={() => router.push("/(auth)/signup")}
                            >
                                Sign Up
                            </Text>
                        </Text>
                    </View>
                </KeyboardAwareScrollView>

                <BlurView
                    intensity={100}
                    tint="systemChromeMaterial"
                    className="absolute top-0 left-0 right-0 h-12"
                />
            </View>
        </TouchableWithoutFeedback>
    );
}
