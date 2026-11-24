import { fetchHbcMemberById, type HbcMember } from "@/api/hbc";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError } from "@/components/ui/toast";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { canAccessHbcMembers } from "@/utils/roles";
import { useLocalSearchParams } from "expo-router";
import { UsersRound } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function initialsFrom(value?: string) {
    const source = String(value ?? "").trim();
    if (!source) return "HM";
    const [a, b] = source.split(/\s+/);
    return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase() || "HM";
}

function humanizeKey(key: string) {
    return key
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDisplayValue(value: unknown) {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    if (Array.isArray(value)) {
        const primitiveItems = value.filter(
            (item) =>
                typeof item === "string" ||
                typeof item === "number" ||
                typeof item === "boolean",
        );
        if (primitiveItems.length === 0) return null;
        return primitiveItems.map((item) => String(item)).join(", ");
    }
    return null;
}

function ProfileField({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return (
        <View className="rounded-2xl bg-[#F5F7FB] px-4 py-3.5">
            <Text className="text-[11px] uppercase tracking-wide text-[#6B7280] font-kumbhBold">
                {label}
            </Text>
            <Text className="mt-1 text-sm text-[#111827] font-kumbhBold">
                {value}
            </Text>
        </View>
    );
}

export default function HbcMemberProfileScreen() {
    const params = useLocalSearchParams<{ id?: string }>();
    const rawId = params.id;
    const memberId = Array.isArray(rawId) ? rawId[0] : rawId;

    const role = useAppSelector(
        (s: RootState) => s.auth.user?.role ?? s.user.user?.role,
    );
    const canAccess = useMemo(() => canAccessHbcMembers(role), [role]);
    const isIOS = Platform.OS === "ios";

    const [member, setMember] = useState<HbcMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadMember = useCallback(async () => {
        if (!memberId) {
            setMember(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const result = await fetchHbcMemberById(memberId);
            setMember(result);
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                "Failed to load member profile.";
            showError(message);
            setMember(null);
        } finally {
            setLoading(false);
        }
    }, [memberId]);

    useEffect(() => {
        if (!canAccess) {
            setLoading(false);
            return;
        }
        void loadMember();
    }, [canAccess, loadMember]);

    const onRefresh = useCallback(async () => {
        if (!canAccess || !memberId) return;
        setRefreshing(true);
        try {
            await loadMember();
        } finally {
            setRefreshing(false);
        }
    }, [canAccess, loadMember, memberId]);

    const extraFields = useMemo(() => {
        if (!member?.raw) return [];

        const blockedKeys = new Set([
            "id",
            "ID",
            "memberId",
            "member_id",
            "name",
            "full_name",
            "fullname",
            "display_name",
            "title",
            "username",
            "avatar",
            "avatar_url",
            "avatarUrl",
            "image",
            "profile_image",
            "featured_image",
            "photo",
            "email",
            "email_address",
            "mail",
            "phone",
            "phone_number",
            "phoneNumber",
            "mobile",
            "telephone",
            "location",
            "city",
            "state",
            "address",
            "company",
            "organization",
            "organisation",
            "business_name",
            "businessName",
            "role",
            "position",
            "designation",
            "title_role",
            "website",
            "site",
            "url",
            "profile_url",
            "bio",
            "about",
            "description",
            "excerpt",
        ]);

        return Object.entries(member.raw)
            .map(([key, value]) => ({ key, value: toDisplayValue(value) }))
            .filter((entry) => !blockedKeys.has(entry.key) && !!entry.value)
            .slice(0, 14);
    }, [member?.raw]);

    const hasPrimaryDetails = Boolean(
        member?.email ||
            member?.phone ||
            member?.website ||
            member?.location ||
            member?.company ||
            member?.role,
    );

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Member Profile"
                backgroundColor="#F5F7FB"
            />

            {!canAccess ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-full items-center rounded-[24px] border border-gray-100 bg-white p-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <UsersRound size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-center text-base font-kumbhBold text-[#111827]">
                            Access Restricted
                        </Text>
                        <Text className="mt-1 text-center text-sm font-kumbh text-[#6B7280]">
                            You do not have access to this section.
                        </Text>
                    </View>
                </View>
            ) : loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator color="#4C5FAB" />
                    <Text className="mt-3 text-sm font-kumbh text-[#6B7280]">
                        Loading profile...
                    </Text>
                </View>
            ) : !member ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-full items-center rounded-[24px] border border-gray-100 bg-white p-8">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <UsersRound size={22} color="#4C5FAB" />
                        </View>
                        <Text className="text-center text-base font-kumbhBold text-[#111827]">
                            Member profile not found.
                        </Text>
                        <Pressable
                            onPress={() => void loadMember()}
                            className="mt-4 h-12 items-center justify-center rounded-2xl bg-[#4C5FAB] px-6"
                        >
                            <Text className="font-kumbhBold text-white">
                                Retry
                            </Text>
                        </Pressable>
                    </View>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 36,
                    }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#4C5FAB"
                        />
                    }
                >
                    <View className="mb-4 items-center rounded-[28px] border border-gray-100 bg-white px-5 py-6">
                        {member.avatarUrl ? (
                            <Image
                                source={{ uri: member.avatarUrl }}
                                className="h-24 w-24 rounded-full"
                            />
                        ) : (
                            <View className="h-24 w-24 items-center justify-center rounded-full bg-[#EEF2FF]">
                                <Text className="text-2xl font-kumbhBold text-[#4C5FAB]">
                                    {initialsFrom(member.displayName)}
                                </Text>
                            </View>
                        )}

                        <Text className="mt-4 text-center text-xl font-kumbhBold text-[#111827]">
                            {member.displayName}
                        </Text>

                        <View className="mt-2 rounded-full bg-[#EEF2FF] px-3.5 py-1.5">
                            <Text className="text-center text-xs font-kumbhBold text-[#4C5FAB]">
                                {[member.company, member.role, member.location]
                                    .map((part) => String(part ?? "").trim())
                                    .filter(Boolean)
                                    .join(" • ") || "HBC Community Member"}
                            </Text>
                        </View>
                    </View>

                    {hasPrimaryDetails ? (
                        <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                            <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                                Contact & Role Details
                            </Text>
                            <View className="gap-2.5">
                                <ProfileField
                                    label="Email"
                                    value={member.email}
                                />
                                <ProfileField
                                    label="Phone"
                                    value={member.phone}
                                />
                                <ProfileField
                                    label="Website"
                                    value={member.website}
                                />
                                <ProfileField
                                    label="Location"
                                    value={member.location}
                                />
                                <ProfileField
                                    label="Company"
                                    value={member.company}
                                />
                                <ProfileField label="Role" value={member.role} />
                            </View>
                        </View>
                    ) : null}

                    {member.bio ? (
                        <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                            <Text className="mb-2 text-base font-kumbhBold text-[#111827]">
                                About
                            </Text>
                            <View className="rounded-2xl bg-[#F5F7FB] p-4">
                                <Text className="text-sm font-kumbh leading-6 text-[#374151]">
                                    {member.bio}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {extraFields.length > 0 ? (
                        <View className="mb-4 rounded-[24px] border border-gray-100 bg-white p-4">
                            <Text className="mb-3 text-base font-kumbhBold text-[#111827]">
                                Additional Details
                            </Text>
                            <View className="gap-2.5">
                                {extraFields.map((entry) => (
                                    <ProfileField
                                        key={entry.key}
                                        label={humanizeKey(entry.key)}
                                        value={entry.value ?? undefined}
                                    />
                                ))}
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}
