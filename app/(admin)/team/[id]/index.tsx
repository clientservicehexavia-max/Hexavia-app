// app/(admin)/team/[id]/index.tsx
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarCheck2,
  ChevronRight,
  Mail,
  MessageCircle,
  Pencil,
  Phone as PhoneIcon,
  Shield,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import OptionSheet from "@/components/common/OptionSheet";
import { selectAdminUsers } from "@/redux/admin/admin.slice";
import {
  deleteAdminUser,
  promoteUser,
  toggleUserSuspension,
} from "@/redux/admin/admin.thunks";
import type { PromoteRole } from "@/redux/admin/admin.types";
import {
  selectAllChannels,
  selectChannelsForUser,
} from "@/redux/channels/channels.slice";
import { fetchChannels } from "@/redux/channels/channels.thunks";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError } from "@/components/ui/toast";
import { dialPhone, openEmail, openWhatsApp } from "@/utils/contact";
import { getRoleChangeTargets } from "@/utils/roles";

export default function StaffDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();

  const users = useAppSelector(selectAdminUsers);
  const channels = useAppSelector(selectAllChannels);

  useEffect(() => {
    dispatch(fetchChannels());
  }, [dispatch]);

  const user = useMemo(() => users.find((u) => u._id === id), [users, id]) ?? {
    _id: String(id),
    email: "unknown@example.com",
    fullname: "Unknown Staff",
    username: "unknown",
    role: "staff",
    suspended: false,
  };

  // const memberChannels = useMemo(() => {
  //   if (!id) return [];
  //   return channels.filter((ch: any) => isUserInChannel(ch?.members, id));
  // }, [channels, id]);
  const userId = String(id ?? "");
  const memberChannels = useAppSelector(selectChannelsForUser(userId));

  const name = user.fullname || user.username || user.email || "Unknown";
  const joined = formatDate(user.createdAt);
  const isIOS = Platform.OS === "ios";
  const [deletingUser, setDeletingUser] = useState(false);
  const [isRoleSheetVisible, setRoleSheetVisible] = useState(false);

  const roleSheetTargets = getRoleChangeTargets(user.role) as PromoteRole[];

  const applyRoleChange = async (nextRole: PromoteRole) => {
    if (!user?._id) return;
    try {
      await dispatch(
        promoteUser({
          userId: user._id,
          role: nextRole,
        }),
      ).unwrap();
    } catch {
      // toast handled in thunk
    }
  };

  const showRoleChangeSheet = () => {
    if (!roleSheetTargets.length) {
      showError("No role changes available for this user");
      return;
    }

    const labels = roleSheetTargets.map(
      (role) => `Change to ${formatRole(role)}`,
    );

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...labels, "Cancel"],
          cancelButtonIndex: labels.length,
          title: "Change Role",
        },
        (buttonIndex) => {
          if (buttonIndex >= 0 && buttonIndex < roleSheetTargets.length) {
            void applyRoleChange(roleSheetTargets[buttonIndex]);
          }
        },
      );
      return;
    }

    setRoleSheetVisible(true);
  };

  const onDeleteUser = () => {
    if (!user?._id || deletingUser) return;

    Alert.alert(
      "Delete user",
      "This action is permanent. Are you sure you want to delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingUser(true);
              await dispatch(
                deleteAdminUser({ userId: String(user._id) }),
              ).unwrap();
              router.back();
            } finally {
              setDeletingUser(false);
            }
          },
        },
      ],
    );
  };

  const avatarUri = getAvatarUri(user as Record<string, any>);
  const isSuspended = Boolean((user as any).isSuspended);

  return (
    <SafeAreaView
      edges={isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]}
      className="flex-1 bg-[#F5F7FB]"
    >
      {/* Header */}
      <PlatformAdaptiveHeader
        title="Member Details"
        backgroundColor="#F5F7FB"
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Profile Card */}
        <View className="rounded-[28px] bg-white border border-gray-100 p-5">
          <View className="flex-row items-center">
            <MemberAvatar uri={avatarUri} name={name} />
            <View className="flex-1">
              <Text
                className="text-[20px] font-kumbhBold text-[#111827]"
                numberOfLines={1}
              >
                {name}
              </Text>
              <Text
                className="text-[13px] font-kumbh text-[#6B7280] mt-0.5"
                numberOfLines={1}
              >
                {user.email ?? "—"}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2 mt-2.5">
                <View className="px-3 py-1 rounded-full bg-[#EEF2FF]">
                  <Text className="font-kumbhBold text-[11px] text-primary">
                    {formatRole(user.role)}
                  </Text>
                </View>
                <View
                  className={`px-3 py-1 rounded-full border ${
                    isSuspended
                      ? "bg-red-50 border-red-100"
                      : "bg-emerald-50 border-emerald-100"
                  }`}
                >
                  <Text
                    className={`font-kumbhBold text-[11px] ${
                      isSuspended ? "text-red-700" : "text-emerald-700"
                    }`}
                  >
                    {isSuspended ? "Suspended" : "Active"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {user.email || (user as any).phoneNumber ? (
            <View className="flex-row flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
              {user.email ? (
                <Pressable
                  onPress={() => openEmail(user.email)}
                  className="flex-1 min-w-[96px] flex-row items-center justify-center gap-1.5 rounded-2xl bg-[#F5F7FB] py-2.5 px-3"
                >
                  <Mail size={15} color="#4C5FAB" />
                  <Text className="font-kumbhBold text-[12px] text-[#111827]">
                    Email
                  </Text>
                </Pressable>
              ) : null}
              {(user as any).phoneNumber ? (
                <>
                  <Pressable
                    onPress={() => dialPhone((user as any).phoneNumber)}
                    className="flex-1 min-w-[96px] flex-row items-center justify-center gap-1.5 rounded-2xl bg-[#F5F7FB] py-2.5 px-3"
                  >
                    <PhoneIcon size={15} color="#4C5FAB" />
                    <Text className="font-kumbhBold text-[12px] text-[#111827]">
                      Call
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openWhatsApp((user as any).phoneNumber)}
                    className="flex-1 min-w-[96px] flex-row items-center justify-center gap-1.5 rounded-2xl bg-[#F5F7FB] py-2.5 px-3"
                  >
                    <MessageCircle size={15} color="#10B981" />
                    <Text className="font-kumbhBold text-[12px] text-[#111827]">
                      WhatsApp
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Task Board Shortcut */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(admin)/team/taskboard",
              params: { staffId: user._id },
            })
          }
          className="mt-4 rounded-[24px] bg-primary p-4 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1 mr-3">
            <View className="w-11 h-11 rounded-2xl bg-white/15 items-center justify-center mr-3.5">
              <CalendarCheck2 size={20} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-kumbhBold text-white">
                View Staff Task Board
              </Text>
              <Text className="text-[12px] font-kumbh text-white/75 mt-0.5">
                Inspect assigned tasks and status updates
              </Text>
            </View>
          </View>
          <View className="h-9 w-9 rounded-full bg-white/15 items-center justify-center">
            <ChevronRight size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Member Information */}
        <Text className="mt-6 mb-2 px-1 text-xs font-kumbhBold uppercase tracking-wider text-[#6B7280]">
          Profile Information
        </Text>
        <View className="rounded-[24px] bg-white border border-gray-100 px-4">
          <Row label="Full Name" value={name} withBorder />
          <Row
            label="Email"
            value={user.email ?? "—"}
            actions={
              user.email
                ? [
                    {
                      icon: Mail,
                      onPress: () => openEmail(user.email),
                      label: "Send email",
                    },
                  ]
                : undefined
            }
            withBorder
          />
          <Row
            label="Phone"
            value={(user as any).phoneNumber ?? "—"}
            actions={
              (user as any).phoneNumber
                ? [
                    {
                      icon: PhoneIcon,
                      onPress: () => dialPhone((user as any).phoneNumber),
                      label: "Call",
                    },
                    {
                      icon: MessageCircle,
                      onPress: () => openWhatsApp((user as any).phoneNumber),
                      label: "WhatsApp",
                    },
                  ]
                : undefined
            }
            withBorder
          />
          <Row label="Username" value={user.username ?? "—"} withBorder />
          <Row
            label="Date of Birth"
            value={formatDate((user as any).dateOfBirth)}
            withBorder
          />
          <Row label="Role" value={formatRole(user.role)} withBorder />
          <Row label="Joined" value={joined} withBorder />
          <Row
            label="Status"
            value={isSuspended ? "Suspended" : "Active"}
          />
        </View>

        {/* Actions */}
        <Text className="mt-6 mb-2 px-1 text-xs font-kumbhBold uppercase tracking-wider text-[#6B7280]">
          Account Controls
        </Text>
        <View className="rounded-[24px] bg-white border border-gray-100 p-3.5 gap-2.5">
          <Pressable
            onPress={() => dispatch(toggleUserSuspension({ userId: user._id }))}
            className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 border ${
              isSuspended
                ? "bg-emerald-50 border-emerald-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <View className="flex-row items-center gap-3">
              {isSuspended ? (
                <UserCheck size={18} color="#047857" />
              ) : (
                <UserX size={18} color="#B45309" />
              )}
              <Text
                className={`text-[14px] font-kumbhBold ${
                  isSuspended ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {isSuspended ? "Unsuspend User" : "Suspend User"}
              </Text>
            </View>
            <ChevronRight
              size={16}
              color={isSuspended ? "#047857" : "#B45309"}
            />
          </Pressable>

          <Pressable
            onPress={showRoleChangeSheet}
            className="flex-row items-center justify-between bg-[#EEF2FF] rounded-2xl px-4 py-3.5"
          >
            <View className="flex-row items-center gap-3">
              <Shield size={18} color="#4C5FAB" />
              <Text className="text-[14px] font-kumbhBold text-primary">
                Change Role
              </Text>
            </View>
            <ChevronRight size={16} color="#4C5FAB" />
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(admin)/team/[id]/edit",
                params: { id: user._id },
              })
            }
            className="flex-row items-center justify-between bg-[#F9FAFB] border border-gray-200 rounded-2xl px-4 py-3.5"
          >
            <View className="flex-row items-center gap-3">
              <Pencil size={18} color="#111827" />
              <Text className="text-[14px] font-kumbhBold text-[#111827]">
                Edit Team Member
              </Text>
            </View>
            <ChevronRight size={16} color="#6B7280" />
          </Pressable>

          <Pressable
            onPress={onDeleteUser}
            disabled={deletingUser}
            className="flex-row items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5"
          >
            <View className="flex-row items-center gap-3">
              <Trash2 size={18} color="#B91C1C" />
              <Text className="text-[14px] font-kumbhBold text-[#B91C1C]">
                {deletingUser ? "Deleting user..." : "Delete User"}
              </Text>
            </View>
            <ChevronRight size={16} color="#B91C1C" />
          </Pressable>
        </View>
      </ScrollView>

      <OptionSheet
        visible={isRoleSheetVisible}
        onClose={() => setRoleSheetVisible(false)}
        title="Change Role"
        selectedValue=""
        onSelect={(value) => {
          const nextRole = String(value) as PromoteRole;
          setRoleSheetVisible(false);
          if (roleSheetTargets.includes(nextRole)) {
            void applyRoleChange(nextRole);
          }
        }}
        options={roleSheetTargets.map((role) => ({
          value: role,
          label: `Change to ${formatRole(role)}`,
        }))}
      />
    </SafeAreaView>
  );
}

type RowAction = {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  label?: string;
};

function getAvatarUri(item: Record<string, any>) {
  const raw =
    item?.profilePicture ?? item?.avatar ?? item?.avatarUrl ?? item?.photoUrl;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function MemberAvatar({ uri, name }: { uri?: string; name: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        className="h-20 w-20 rounded-full mr-4 bg-[#EEF2FF]"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-20 w-20 rounded-full bg-[#EEF2FF] items-center justify-center mr-4">
      <Text className="font-kumbhBold text-xl text-primary">
        {getInitials(name)}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  actions,
  withBorder = false,
}: {
  label: string;
  value: string;
  actions?: RowAction[];
  withBorder?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3.5 ${
        withBorder ? "border-b border-gray-100" : ""
      }`}
    >
      <Text
        className="text-[13px] text-[#6B7280] font-kumbh w-28"
        numberOfLines={1}
      >
        {label}
      </Text>

      <View className="flex-1 flex-row items-center justify-end min-w-0">
        <Text
          className="text-[14px] text-[#111827] font-kumbhBold flex-1 text-right"
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {value}
        </Text>

        {actions?.length ? (
          <View className="flex-row items-center ml-2.5">
            {actions.map((action, idx) => (
              <Pressable
                key={`${label}-act-${idx}`}
                onPress={action.onPress}
                className="w-8 h-8 rounded-full border border-gray-200 bg-[#F9FAFB] items-center justify-center ml-1.5"
                accessibilityLabel={action.label}
                hitSlop={8}
              >
                <action.icon size={14} color="#4C5FAB" />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function formatDate(d?: string) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}

function formatRole(r?: string) {
  if (!r) return "—";
  const cleaned = r.replace(/[-_]+/g, " ");
  return cleaned
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}
function isUserInChannel(members: any[] | undefined | null, userId: string) {
  if (!Array.isArray(members)) return false;
  return members.some((m) => {
    if (typeof m === "string") return m === userId;
    if (m && typeof m === "object") {
      return m._id === userId || m.userId === userId || m?.user?._id === userId;
    }
    return false;
  });
}
