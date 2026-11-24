import CustomTextInput from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
import { showSuccess } from "@/components/ui/toast";
import { joinChannel } from "@/redux/auth/auth.thunks";
import { useAppDispatch } from "@/store/hooks";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff, Hash, Lock } from "lucide-react-native";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
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

type FormValues = {
  channelCode: string;
  password: string;
  confirmPassword: string;
};

const schema = yup.object({
  channelCode: yup
    .string()
    .trim()
    .matches(/^[A-Za-z0-9-]{4,}$/, "Use letters/numbers (min 4)")
    .required("Project code is required"),
  password: yup
    .string()
    .min(8, "At least 8 characters")
    .matches(/[A-Za-z]/, "Include at least 1 letter")
    .matches(/\d/, "Include at least 1 number")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Please confirm your password"),
});

export default function SignupFinalScreen() {
  const router = useRouter();
  const toast = useToast();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState<
    "channelCode" | "password" | "confirmPassword" | null
  >(null);
  const dispatch = useAppDispatch();
  const { phoneNumber } = useLocalSearchParams<{
    phoneNumber?: string;
  }>();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { channelCode: "1234", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await dispatch(
        joinChannel({
          channelCode: `#${values.channelCode}`,
          password: values.password,
          phoneNumber,
        })
      ).unwrap();

      showSuccess("Account ready. Please log in.");
      router.replace("/(auth)/login");
    } catch {
      // Error toast shown in thunk
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
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          {/* Progress (step 3 active) */}
          <View className="flex-row justify-between gap-2">
            <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
            <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
            <View className="h-1.5 flex-1 rounded-full bg-primary" />
          </View>

          {/* Header */}
          <View className="mt-6 mb-7">
            <Text className="font-kumbhBold text-3xl text-[#111827]">
              Create an Account
            </Text>
            <Text className="mt-2 font-kumbh text-[15px] leading-6 text-gray-500">
              Manage projects, oversee finances, and stay connected with your
              team all within Hexavian ERP.
            </Text>
          </View>

          {/* Project Code */}
          <View>
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Project Code
            </Text>
            <Controller
              control={control}
              name="channelCode"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "channelCode";
                return (
                  <View
                    className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                      isFocused ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    <Hash
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Enter Project Code"
                      onFocus={() => setFocusedField("channelCode")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "channelCode" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={(t) => onChange(t.toUpperCase())}
                      value={value}
                      autoCapitalize="characters"
                      className="ml-3 h-full flex-1 text-[16px]"
                    />
                  </View>
                );
              }}
            />

            {/* 👇 Note about default code */}
            <Text className="mt-1.5 font-kumbh text-xs text-gray-400">
              Default channel code is{" "}
              <Text className="font-kumbhBold">1234</Text>.
            </Text>

            {errors.channelCode && (
              <Text className="mt-1 font-kumbh text-xs text-red-500">
                {errors.channelCode.message}
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
                    <Lock
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Enter Password"
                      secureTextEntry={!showPass}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "password" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      className="ml-3 h-full flex-1 text-[16px]"
                    />
                    <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={8}>
                      {showPass ? (
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
              Password Confirm
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
                    <Lock
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Re-enter Password"
                      secureTextEntry={!showConfirm}
                      onFocus={() => setFocusedField("confirmPassword")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "confirmPassword" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      className="ml-3 h-full flex-1 text-[16px]"
                    />
                    <Pressable
                      onPress={() => setShowConfirm((s) => !s)}
                      hitSlop={8}
                    >
                      {showConfirm ? (
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

          {/* Continue */}
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
