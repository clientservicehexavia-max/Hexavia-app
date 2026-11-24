import CustomTextInput from "@/components/ui/CustomInput";
import { selectUpload } from "@/redux/upload/upload.slice";
import { uploadSingle } from "@/redux/upload/upload.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { updateProfile } from "@/redux/user/user.thunks";
import { useAppDispatch } from "@/store/hooks";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Camera, ChevronLeft } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSelector } from "react-redux";

export default function EditProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const current = useSelector(selectUser);
  const upload = useSelector(selectUpload);

  const [fullname, setFullname] = useState(current?.fullname || "");
  const [username, setUsername] = useState(current?.username || "");
  const [photo, setPhoto] = useState<string | undefined>(
    current?.profilePicture || undefined
  );
  const [photoFile, setPhotoFile] = useState<{
    uri: string;
    name?: string;
    type?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please allow photo library access to change your picture."
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: false,
    });

    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setPhoto(a.uri);
      setPhotoFile({
        uri: a.uri,
        name: a.fileName || `avatar_${Date.now()}.jpg`,
        type: a.mimeType || "image/jpeg",
      });
    }
  }

  const canSave = useMemo(() => {
    if (saving) return false;
    return fullname.trim().length >= 2 && username.trim().length >= 2;
  }, [fullname, username, saving]);

  async function onSave() {
    try {
      if (!canSave) return;
      setSaving(true);
      let profilePictureUrl: string | undefined;
      if (photoFile?.uri) {
        const up = await dispatch(
          uploadSingle({
            uri: photoFile.uri,
            name: photoFile.name,
            type: photoFile.type,
          })
        ).unwrap();
        profilePictureUrl = up.url;
      }
      const payload: any = {
        fullname: fullname.trim(),
        username: username.trim().toLowerCase(),
      };
      if (profilePictureUrl) payload.profilePicture = profilePictureUrl;
      await dispatch(updateProfile(payload)).unwrap();
    } catch (e) {
      // toasts already shown in thunks
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        >
          {/* Header */}
          <View className="mt-2 mb-5 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white"
            >
              <ChevronLeft color="#111827" size={20} />
            </Pressable>
            <View>
              <Text className="font-kumbhBold text-2xl text-[#111827]">
                Edit Profile
              </Text>
              <Text className="font-kumbh text-sm text-gray-500">
                Update your personal info
              </Text>
            </View>
          </View>

          {/* Card */}
          <View className="rounded-[28px] border border-gray-100 bg-white p-5">
            {/* Avatar */}
            <View className="items-center">
              <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-gray-100 bg-gray-100">
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    className="h-24 w-24"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require("@/assets/images/default.jpg")}
                    className="h-24 w-24"
                    resizeMode="cover"
                  />
                )}
              </View>
              <Pressable
                onPress={pickPhoto}
                className="mt-3 flex-row items-center gap-1.5 rounded-2xl bg-[#EEF2FF] px-4 py-2"
              >
                <Camera size={16} color="#4C5FAB" />
                <Text className="font-kumbhBold text-sm text-primary">
                  Change photo
                </Text>
              </Pressable>

              {/* Optional tiny progress label under avatar while uploading */}
              {saving && upload?.phase === "uploading" && (
                <Text className="mt-2 font-kumbh text-xs text-gray-500">
                  Uploading… {upload.progress}%
                </Text>
              )}
            </View>

            {/* Inputs */}
            <View className="mt-6">
              <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
                Full name
              </Text>
              <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                <CustomTextInput
                  value={fullname}
                  onChangeText={setFullname}
                  placeholder="Your full name"
                  className="h-full w-full"
                  autoCapitalize="words"
                />
              </View>

              <Text className="mt-4 mb-2 font-kumbhBold text-sm text-[#374151]">
                Username
              </Text>
              <View className="h-14 justify-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                <CustomTextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="username"
                  className="h-full w-full"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View className="mt-6 flex-row gap-3">
              <Pressable
                disabled={saving}
                onPress={() => router.push("/(admin)/profile")}
                className="flex-1 items-center justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3.5"
              >
                <Text className="font-kumbhBold text-gray-700">Cancel</Text>
              </Pressable>

              <Pressable
                disabled={!canSave || saving}
                onPress={onSave}
                className={`flex-1 items-center justify-center rounded-2xl px-4 py-3.5 ${
                  canSave ? "bg-primary" : "bg-primary/50"
                }`}
              >
                {saving ? (
                  upload?.phase === "uploading" ? (
                    <Text className="font-kumbhBold text-white">
                      Uploading {upload.progress}%
                    </Text>
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator color="#fff" />
                      <Text className="font-kumbhBold text-white">Saving…</Text>
                    </View>
                  )
                ) : (
                  <Text className="font-kumbhBold text-white">
                    Save Changes
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
