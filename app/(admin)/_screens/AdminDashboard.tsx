import { useRouter } from "expo-router";
import {
    BarChart3,
    Bell,
    ChevronRight,
    FolderKanban,
    Handshake,
    UserPlus,
    Users,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import SectionCard from "@/components/admin/SectionCard";
import BotpressFab from "@/components/common/BotpressFab";
import { AdminHeader } from "@/components/common/UserHeader";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    canAccessFinanceManagement,
    canAccessTeamManagement,
    normalizeRole,
} from "@/utils/roles";

export default function AdminDashboard() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const isIOS = Platform.OS === "ios";
    const [refreshing, setRefreshing] = useState(false);
    const showTeam = canAccessTeamManagement(user?.role);
    const showFinance = canAccessFinanceManagement(user?.role);
    const subtitleBadge =
        normalizeRole(user?.role) === "clientservice"
            ? "Clientservice"
            : "Admin";

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchProfile()).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const quickActions = [
        {
            title: "Clients",
            subtitle: "Manage records",
            icon: <Users size={20} color="#4C5FAB" />,
            bg: "#EEF2FF",
            onPress: () => router.push("/(admin)/(tabs)/client"),
        },
        {
            title: "Projects",
            subtitle: "Track spaces",
            icon: <UserPlus size={20} color="#0F766E" />,
            bg: "#ECFDF5",
            onPress: () => router.push("/(admin)/(tabs)/project"),
        },
        {
            title: "Prospects",
            subtitle: "Review pipeline",
            icon: <FolderKanban size={20} color="#B45309" />,
            bg: "#FFFBEB",
            onPress: () => router.push("/(admin)/prospects"),
        },
        {
            title: "Partnerships",
            subtitle: "Monitor deals",
            icon: <Handshake size={20} color="#7C3AED" />,
            bg: "#F5F3FF",
            onPress: () => router.push("/(admin)/partnerships"),
        },
    ];

    if (showTeam) {
        quickActions.splice(2, 0, {
            title: "Team",
            subtitle: "Manage members",
            icon: <FolderKanban size={20} color="#BE123C" />,
            bg: "#FFF1F2",
            onPress: () => router.push("/(admin)/(tabs)/team"),
        });
    }

    if (showFinance) {
        quickActions.splice(showTeam ? 3 : 2, 0, {
            title: "Finance",
            subtitle: "View metrics",
            icon: <BarChart3 size={20} color="#1D4ED8" />,
            bg: "#EFF6FF",
            onPress: () => router.push("/(admin)/finance"),
        });
    }

    return (
        <SafeAreaView
            edges={isIOS ? ["top", "left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-[#F5F7FB]"
        >
            <ScrollView
                className="flex-1"
                contentContainerClassName="pb-8 px-4"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                <AdminHeader
                    rightIcon={<Bell size={20} color="#111827" />}
                    subtitleBadge={subtitleBadge}
                />

                <Pressable
                    onPress={() => router.push("/(admin)/report")}
                    className="mt-1 overflow-hidden rounded-[28px] bg-primary px-5 py-5"
                >
                    <View className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
                    <View className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/10" />

                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-4">
                            <Text className="font-kumbhBold text-xs uppercase tracking-[2px] text-white/70">
                                Analytics
                            </Text>
                            <Text className="mt-2 font-kumbhBold text-[28px] leading-8 text-white">
                                Create report
                            </Text>
                            <Text className="mt-2 max-w-[240px] font-kumbh text-sm leading-5 text-white/85">
                                Generate detailed reports to track performance
                                and support faster decisions.
                            </Text>
                        </View>

                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                            <BarChart3 size={22} color="#FFFFFF" />
                        </View>
                    </View>

                    <View className="mt-5 flex-row items-center self-start rounded-full bg-white/15 px-3 py-2">
                        <Text className="font-kumbhBold text-xs text-white">
                            Open reports
                        </Text>
                        <ChevronRight size={14} color="#FFFFFF" />
                    </View>
                </Pressable>

                <View className="mt-6">
                    <View className="mb-3 flex-row items-center justify-between px-1">
                        <Text className="font-kumbhBold text-lg text-[#111827]">
                            Quick Actions
                        </Text>
                    </View>

                    <View className="flex-row flex-wrap justify-between">
                        {quickActions.map((item) => (
                            <Pressable
                                key={item.title}
                                onPress={item.onPress}
                                className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4"
                                style={{ width: "48.5%" as any }}
                            >
                                <View
                                    className="h-11 w-11 items-center justify-center rounded-2xl"
                                    style={{ backgroundColor: item.bg }}
                                >
                                    {item.icon}
                                </View>
                                <Text className="mt-5 font-kumbhBold text-[17px] text-[#111827]">
                                    {item.title}
                                </Text>
                                <Text className="mt-1 font-kumbh text-xs text-gray-500">
                                    {item.subtitle}
                                </Text>
                                <View className="mt-4 flex-row items-center justify-between">
                                    <Text className="font-kumbhBold text-xs text-primary">
                                        Open
                                    </Text>
                                    <ChevronRight size={16} color="#4C5FAB" />
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View className="mt-3">
                    <View className="mb-3 flex-row items-center justify-between px-1">
                        <Text className="font-kumbhBold text-lg text-[#111827]">
                            Records
                        </Text>
                        <Text className="font-kumbh text-xs text-gray-500">
                            Archive and recovery
                        </Text>
                    </View>

                    <SectionCard
                        onPress={() => router.push("/(admin)/clients/deleted")}
                        className="my-0 mb-3 rounded-[24px] border border-gray-100 bg-white p-4"
                        noTitle
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-4">
                                <Text className="font-kumbhBold text-base text-text">
                                    Deleted Clients
                                </Text>
                                <Text className="mt-1 font-kumbh text-sm text-gray-500">
                                    Review removed client records and restore
                                    context when needed.
                                </Text>
                            </View>
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <ChevronRight size={18} color="#4C5FAB" />
                            </View>
                        </View>
                    </SectionCard>

                    <SectionCard
                        onPress={() => router.push("/(admin)/channels/deleted")}
                        className="my-0 rounded-[24px] border border-gray-100 bg-white p-4"
                        noTitle
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-1 pr-4">
                                <Text className="font-kumbhBold text-base text-text">
                                    Deleted Projects
                                </Text>
                                <Text className="mt-1 font-kumbh text-sm text-gray-500">
                                    Inspect removed workspaces and keep
                                    historical activity visible.
                                </Text>
                            </View>
                            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                <ChevronRight size={18} color="#4C5FAB" />
                            </View>
                        </View>
                    </SectionCard>
                </View>
            </ScrollView>
            <BotpressFab title="Hexavia Assistant" />
        </SafeAreaView>
    );
}
