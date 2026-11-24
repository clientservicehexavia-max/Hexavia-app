import CustomTextInput from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
import { login } from "@/redux/auth/auth.thunks";
import { useAppDispatch } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff, Lock, Mail } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Image,
  Keyboard,
  Pressable,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(
    null,
  );

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
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        className="flex-1 bg-[#F5F7FB]"
      >
        <StatusBar style="dark" />

        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingTop: 40,
            paddingBottom: 32,
          }}
        >
          <View>
            <View className="mt-2 mb-10 items-center">
              <Image
                source={require("../../assets/images/logo.png")}
                resizeMode="contain"
                style={{
                  width: 250,
                  height: 70,
                  tintColor: "#4C5FAB",
                }}
              />
            </View>

            <View className="mb-8">
              <Text className="font-kumbhBold text-[28px] leading-9 text-[#111827]">
                Good to see you again!
              </Text>
              <Text className="mt-2 font-kumbh text-[15px] leading-6 text-gray-500">
                Access your Hexavian account and stay on top of your projects,
                finances, and updates.
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
                render={({ field: { onChange, onBlur, value } }) => {
                  const isFocused = focusedField === "email";
                  return (
                    <View
                      className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                        isFocused ? "border-primary" : "border-gray-200"
                      }`}
                    >
                      <View className="mr-3">
                        <Mail
                          size={18}
                          color={isFocused ? "#4C5FAB" : "#6B7280"}
                        />
                      </View>
                      <CustomTextInput
                        placeholder="Enter Email Address"
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => {
                          setFocusedField((cur) =>
                            cur === "email" ? null : cur,
                          );
                          onBlur();
                        }}
                        onChangeText={onChange}
                        value={value}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        className="h-full flex-1"
                      />
                    </View>
                  );
                }}
              />
              {errors.email && (
                <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                  {errors.email.message}
                </Text>
              )}
            </View>

            {/* Password */}
            <View className="mt-4">
              <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
                Password
              </Text>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => {
                  const isFocused = focusedField === "password";
                  return (
                    <View
                      className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                        isFocused ? "border-primary" : "border-gray-200"
                      }`}
                    >
                      <View className="mr-3">
                        <Lock
                          size={18}
                          color={isFocused ? "#4C5FAB" : "#6B7280"}
                        />
                      </View>
                      <CustomTextInput
                        placeholder="Enter Password"
                        secureTextEntry={!showPassword}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => {
                          setFocusedField((cur) =>
                            cur === "password" ? null : cur,
                          );
                          onBlur();
                        }}
                        onChangeText={onChange}
                        value={value}
                        className="h-full flex-1"
                      />
                      <Pressable
                        onPress={() => setShowPassword((s) => !s)}
                        hitSlop={8}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color="#6B7280" />
                        ) : (
                          <Eye size={20} color="#6B7280" />
                        )}
                      </Pressable>
                    </View>
                  );
                }}
              />
              {errors.password && (
                <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Forgot password */}
            <View className="mt-3.5 items-end">
              <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                <Text className="font-kumbh text-sm">
                  <Text className="text-gray-500">Forgot Password? </Text>
                  <Text className="font-kumbhBold text-primary">
                    Reset Password
                  </Text>
                </Text>
              </Pressable>
            </View>

            {/* Continue button */}
            <View className="mt-8">
              <HexButton
                title={isSubmitting ? "Please wait..." : "Continue"}
                onPress={handleSubmit(onSubmit)}
                disabled={!isValid || isSubmitting}
              />
            </View>
          </View>

          {/* Sign up */}
          <View className="mt-8 items-center">
            <Text className="font-kumbh text-sm text-gray-600">
              Don’t have an account?{" "}
              <Text
                className="font-kumbhBold text-primary"
                onPress={() => router.push("/(auth)/signup")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
