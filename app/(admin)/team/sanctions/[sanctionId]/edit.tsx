import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Dropdown from "@/components/admin/Dropdown";
import Field from "@/components/admin/Field";
import Menu from "@/components/admin/Menu";
import MenuItem from "@/components/admin/MenuItem";
import { CustomTextInput } from "@/components/ui/CustomInput";

import { showError, showSuccess } from "@/components/ui/toast";
import { selectSanctionById } from "@/redux/sanctions/sanctions.slice";
import { fetchSanctions, updateSanction } from "@/redux/sanctions/sanctions.thunks";
import { getToken } from "@/storage/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type ApiType = "warning" ;

export default function EditSanction() {
  const router = useRouter();
  const { sanctionId } = useLocalSearchParams<{ sanctionId: string }>();
  const dispatch = useAppDispatch();

  const sanction = useAppSelector(useMemo(() => selectSanctionById(sanctionId), [sanctionId]));
  const loadingBootstrap = !sanction;

  const [reason, setReason] = useState(sanction?.reason ?? "");
  const [type, setType] = useState<ApiType>((sanction?.type as ApiType) ?? "warning");
  const [duration, setDuration] = useState(
    typeof sanction?.duration === "number" ? String(sanction.duration) : ""
  );
  const [isActive, setIsActive] = useState(Boolean(sanction?.isActive ?? true));
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sanctionId) return;
    if (!sanction) {
      dispatch(fetchSanctions()); // fetch all; or make a single-by-id endpoint if you have one
    }
  }, [dispatch, sanctionId, sanction]);

  useEffect(() => {
    // sync store → form if fetch completed after mount
    if (sanction) {
      setReason(sanction.reason ?? "");
      setType((sanction.type as ApiType) ?? "warning");
      setIsActive(Boolean(sanction.isActive ?? true));
    }
  }, [sanction?._id]); 

//   console.log(sanction.isActive)

  const handleSave = async () => {
    if (!sanctionId) return;
    if (!reason.trim()) return showError("Enter a reason");

    // construct minimal payload (only send fields that changed)
    const body: any = { sanctionId };
    if (reason.trim() !== (sanction?.reason ?? "")) body.reason = reason.trim();
    if (type !== (sanction?.type as ApiType)) body.type = type;
    const durNum = Number.parseInt(duration, 10);
    if (isActive !== Boolean(sanction?.isActive ?? true)) body.isActive = isActive;

    if (Object.keys(body).length === 1) {
      showError("No changes to save");
      return;
    }

    try {
      setSaving(true);
      await dispatch(updateSanction(body)).unwrap();
      showSuccess("Sanction updated");
      router.back();
    } catch (e: any) {
      showError(String(e ?? "Failed to update"));
    } finally {
      setSaving(false);
    }
  };

  // console.log(getToken())

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FB]">
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-white border border-gray-100 items-center justify-center"
        >
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-2xl font-kumbhBold text-[#111827]">
          Edit Sanction
        </Text>
        <View className="w-10" />
      </View>

      {loadingBootstrap ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4C5FAB" />
          <Text className="mt-2 text-[#6B7280] font-kumbh">
            Loading sanction…
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.select({ ios: "padding", android: "height" })}
        >
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-10 pt-2"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Read-only recipient */}
            <Field label="Recipient">
              <View className="h-14 rounded-2xl border border-gray-200 bg-white px-4 justify-center">
                <Text className="text-[15px] text-[#111827] font-kumbhBold">
                  {sanction?.user?.username ||
                    sanction?.user?.fullname ||
                    sanction?.user?.email ||
                    "—"}
                </Text>
              </View>
            </Field>

            <Field label="Reason">
              <View className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <CustomTextInput
                  placeholder="Enter reason"
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  textAlignVertical="top"
                  style={{ minHeight: 112 }}
                />
              </View>
            </Field>

            <Field label="Type">
              <View>
                <Dropdown
                  value={type}
                  open={showTypeMenu}
                  onToggle={() => setShowTypeMenu((s) => !s)}
                />
                {showTypeMenu && (
                  <Menu>
                    {(["warning"] as const).map((opt) => (
                      <MenuItem
                        key={opt}
                        active={opt === type}
                        onPress={() => {
                          setType(opt);
                          setShowTypeMenu(false);
                        }}
                      >
                        {opt}
                      </MenuItem>
                    ))}
                  </Menu>
                )}
              </View>
            </Field>

            <Field label="Active">
              <View className="h-14 flex-row items-center justify-between bg-white border border-gray-200 rounded-2xl px-4">
                <Text className="font-kumbhBold text-[#111827]">
                  Is Active
                </Text>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ true: "#4C5FAB", false: "#D1D5DB" }}
                />
              </View>
            </Field>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="mt-4 h-14 rounded-2xl bg-primary items-center justify-center active:opacity-90"
            >
              <Text className="text-white font-kumbhBold text-[15px]">
                {saving ? "Saving…" : "Save Changes"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
