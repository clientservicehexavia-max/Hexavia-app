import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    Pressable,
    Text,
    View,
} from "react-native";
import KeyboardAwareScrollView from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from "react-native-safe-area-context";

import Field from "@/components/admin/Field";
import { CustomTextInput } from "@/components/ui/CustomInput";

import { showError, showSuccess } from "@/components/ui/toast";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import { useAppSelector } from "@/store/hooks";

export default function EditClient() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const users = useAppSelector(selectAdminUsers);

  const existing = users.find((u: any) => u._id === id);

  const [fullname, setFullname] = useState(existing?.fullname ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");

  useEffect(() => {
    if (existing) {
      setFullname(existing.fullname ?? "");
      setUsername(existing.username ?? "");
      setEmail(existing.email ?? "");
    }
  }, [existing]);

  const onSave = async () => {
    if (!fullname.trim()) return showError("Full name is required");
    if (!email.trim()) return showError("Email is required");
    // await dispatch(updateUser({ userId: id as string, fullname: fullname.trim(), username: username.trim() || undefined, email: email.trim() }))
    showSuccess("Saved (mock)");
    router.back();
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-2xl font-kumbhBold text-[#111827]">Edit Client</Text>
        <View className="w-10" />
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-10 pt-2"
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraHeight={8}
      >
          <Field label="Full Name">
            <View className="h-14 rounded-2xl border border-gray-200 bg-white px-4 justify-center">
              <CustomTextInput
                placeholder="Enter full name"
                value={fullname}
                onChangeText={setFullname}
                className="h-full w-full"
                autoCapitalize="words"
              />
            </View>
          </Field>

          <Field label="Username">
            <View className="h-14 rounded-2xl border border-gray-200 bg-white px-4 justify-center">
              <CustomTextInput
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                className="h-full w-full"
                autoCapitalize="none"
              />
            </View>
          </Field>

          <Field label="Email">
            <View className="h-14 rounded-2xl border border-gray-200 bg-white px-4 justify-center">
              <CustomTextInput
                placeholder="Enter email"
                value={email}
                onChangeText={setEmail}
                className="h-full w-full"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </Field>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-14 flex-1 rounded-2xl border border-gray-200 bg-white items-center justify-center"
            >
              <Text className="font-kumbhBold text-[15px] text-[#374151]">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onSave}
              className="h-14 flex-1 rounded-2xl bg-primary items-center justify-center"
            >
              <Text className="font-kumbhBold text-[15px] text-white">
                Save
              </Text>
            </Pressable>
          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
