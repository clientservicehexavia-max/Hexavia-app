import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useToast } from "react-native-toast-notifications";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react-native";
import CustomTextInput from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
import { useAppDispatch } from "@/store/hooks";
import { resetPassword } from "@/redux/auth/auth.thunks";

type FormValues = { password: string; confirmPassword: string };

const schema = yup.object({
  password: yup
    .string()
    .min(6, "Minimum 6 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

export default function ResetPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "password" | "confirmPassword" | null
  >(null);
  const { code: otp, email } = useLocalSearchParams<{
    code?: string;
    email?: string;
  }>();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const userPayload = {
        email: String(email),
        newPassword: values.password,
        otp: String(otp),
      };
      await dispatch(resetPassword(userPayload)).unwrap();

      router.push({ pathname: "/(auth)/login" });
    } catch (err) {
      console.log("Reset password failed:", err);
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
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
          }}
        >
          <View className="mb-7">
            <Pressable
              onPress={() => router.back()}
              className="mb-4 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
              hitSlop={8}
            >
              <ArrowLeft size={20} color="#111827" />
            </Pressable>
            <Text className="font-kumbhBold text-3xl text-[#111827]">
              Reset Password
            </Text>
            <Text className="mt-2 font-kumbh text-[15px] text-gray-500">
              Set your new password to continue.
            </Text>
          </View>

          {/* Password */}
          <View>
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              New Password
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
                      placeholder="Enter New Password"
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

          {/* Confirm Password */}
          <View className="mt-4">
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Confirm New Password
            </Text>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "confirmPassword";
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
                      placeholder="Confirm New Password"
                      secureTextEntry={!showConfirmPassword}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "confirmPassword" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      className="h-full flex-1"
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((s) => !s)}
                      hitSlop={8}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#6B7280" />
                      ) : (
                        <Eye size={20} color="#6B7280" />
                      )}
                    </Pressable>
                  </View>
                );
              }}
            />
            {errors.confirmPassword && (
              <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                {errors.confirmPassword.message}
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
    </TouchableWithoutFeedback>
  );
}
