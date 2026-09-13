import { fetchHbcMemberById, type HbcMember } from "@/api/hbc";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { showError } from "@/components/ui/toast";
import { RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { canAccessHbcMembers } from "@/utils/roles";
import { useLocalSearchParams } from "expo-router";
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
        <View className="rounded-2xl bg-gray-50 px-4 py-3">
            <Text className="text-xs uppercase tracking-wide text-gray-500 font-kumbh">
                {label}
            </Text>
            <Text className="mt-1 text-base text-gray-900 font-kumbh">
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

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader title="Member Profile" />

            {!canAccess ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-base text-gray-600 text-center font-kumbh">
                        You do not have access to this section.
                    </Text>
                </View>
            ) : loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                    <Text className="mt-3 text-gray-500 font-kumbh">
                        Loading profile...
                    </Text>
                </View>
            ) : !member ? (
                <View className="flex-1 items-center justify-center px-6">
                    <Text className="text-base text-gray-600 text-center font-kumbh">
                        Member profile not found.
                    </Text>
                    <Pressable
                        onPress={() => void loadMember()}
                        className="mt-4 px-4 py-2 rounded-xl bg-primary"
                    >
                        <Text className="text-white font-kumbhBold">Retry</Text>
                    </Pressable>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerClassName="px-4 pt-4 pb-12"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                        />
                    }
                >
                    <View className="items-center rounded-3xl bg-primary-50 px-4 py-6 border border-primary-100">
                        {member.avatarUrl ? (
                            <Image
                                source={{ uri: member.avatarUrl }}
                                className="w-28 h-28 rounded-full"
                            />
                        ) : (
                            <View className="w-28 h-28 rounded-full bg-primary-200 items-center justify-center">
                                <Text className="text-primary text-3xl font-kumbhBold">
                                    {initialsFrom(member.displayName)}
                                </Text>
                            </View>
                        )}

                        <Text className="mt-4 text-2xl text-center text-gray-900 font-kumbhBold">
                            {member.displayName}
                        </Text>

                        <Text className="mt-2 text-center text-gray-600 font-kumbh">
                            {[member.company, member.role, member.location]
                                .map((part) => String(part ?? "").trim())
                                .filter(Boolean)
                                .join(" • ") || "HBC Community Member"}
                        </Text>
                    </View>

                    <View className="mt-4" style={{ gap: 10 }}>
                        <ProfileField label="Email" value={member.email} />
                        <ProfileField label="Phone" value={member.phone} />
                        <ProfileField label="Website" value={member.website} />
                        <ProfileField
                            label="Location"
                            value={member.location}
                        />
                        <ProfileField label="Company" value={member.company} />
                        <ProfileField label="Role" value={member.role} />
                    </View>

                    {member.bio ? (
                        <View className="mt-5 rounded-2xl bg-gray-50 px-4 py-4">
                            <Text className="text-xs uppercase tracking-wide text-gray-500 font-kumbh">
                                About
                            </Text>
                            <Text className="mt-2 text-base text-gray-800 font-kumbh leading-6">
                                {member.bio}
                            </Text>
                        </View>
                    ) : null}

                    {extraFields.length > 0 ? (
                        <View className="mt-5 rounded-2xl bg-white border border-gray-100 px-4 py-4">
                            <Text className="text-xs uppercase tracking-wide text-gray-500 font-kumbh">
                                Additional Details
                            </Text>
                            <View className="mt-3" style={{ gap: 10 }}>
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
