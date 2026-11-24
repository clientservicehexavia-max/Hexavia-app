import { BirthdaySummary, fetchBirthdaySummary } from "@/api/birthdays";
import { useFocusEffect, useRouter } from "expo-router";
import {
    BarChart3,
    Bell,
    BriefcaseBusiness,
    Cake,
    ChevronRight,
    FolderKanban,
    Handshake,
    Sparkles,
    Trash2,
    UserPlus,
    Users,
    UsersRound,
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

import BotpressFab from "@/components/common/BotpressFab";
import { AdminHeader } from "@/components/common/UserHeader";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { birthdayTodayMessage } from "@/utils/birthday";
import {
    canAccessFinanceManagement,
    canAccessHbcMembers,
    canAccessTeamManagement,
    normalizeRole,
} from "@/utils/roles";

export default function AdminDashboard() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const isIOS = Platform.OS === "ios";
    const [refreshing, setRefreshing] = useState(false);
    const [birthdaySummary, setBirthdaySummary] =
        useState<BirthdaySummary | null>(null);
    const showTeam = canAccessTeamManagement(user?.role);
    const showFinance = canAccessFinanceManagement(user?.role);
    const showHbcMembers = canAccessHbcMembers(user?.role);
    const subtitleBadge =
        normalizeRole(user?.role) === "clientservice"
            ? "Clientservice"
            : "Admin";

    useFocusEffect(
        useCallback(() => {
            const loadBirthdays = async () => {
                try {
                    setBirthdaySummary(await fetchBirthdaySummary());
                } catch {
                    setBirthdaySummary(null);
                }
            };

            void loadBirthdays();
        }, []),
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchProfile()).unwrap();
            setBirthdaySummary(await fetchBirthdaySummary());
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
            icon: <FolderKanban size={20} color="#0F766E" />,
            bg: "#ECFDF5",
            onPress: () => router.push("/(admin)/(tabs)/project"),
        },
        {
            title: "Prospects",
            subtitle: "Review pipeline",
            icon: <Sparkles size={20} color="#B45309" />,
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
            icon: <UserPlus size={20} color="#BE123C" />,
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

    quickActions.push({
        title: "Recruitment",
        subtitle: "Manage roles",
        icon: <BriefcaseBusiness size={20} color="#0369A1" />,
        bg: "#E0F2FE",
        onPress: () => router.push("/(admin)/recruitment"),
    });

    if (showHbcMembers) {
        quickActions.push({
            title: "HBC",
            subtitle: "Community members",
            icon: <UsersRound size={20} color="#047857" />,
            bg: "#D1FAE5",
            onPress: () => router.push("/(admin)/hbc"),
        });
    }

    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    return (
        <SafeAreaView
            edges={isIOS ? ["top", "left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-[#F5F7FB]"
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{
                    paddingHorizontal: 16,
                    paddingBottom: 36,
                }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#4C5FAB"
                    />
                }
            >
                <AdminHeader
                    rightIcon={<Bell size={18} color="#4C5FAB" />}
                    subtitleBadge={subtitleBadge}
                />

                <View className="mb-4 mt-1 flex-row items-center justify-between px-0.5">
                    <View className="rounded-full bg-[#EEF2FF] px-3 py-1">
                        <Text className="font-kumbhBold text-xs text-[#4C5FAB]">
                            {subtitleBadge} Workspace
                        </Text>
                    </View>
                    <Text className="font-kumbh text-xs text-[#6B7280]">
                        {todayLabel}
                    </Text>
                </View>

                <View className="flex-row flex-wrap justify-between gap-y-3">
                    {quickActions.map((item, index) => {
                        const isOddTrailing =
                            index === quickActions.length - 1 &&
                            quickActions.length % 2 === 1;

                        if (isOddTrailing) {
                            return (
                                <Pressable
                                    key={item.title}
                                    onPress={item.onPress}
                                    className="w-full flex-row items-center justify-between rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                                >
                                    <View className="flex-1 flex-row items-center pr-3">
                                        <View
                                            className="mr-3.5 h-11 w-11 items-center justify-center rounded-2xl"
                                            style={{ backgroundColor: item.bg }}
                                        >
                                            {item.icon}
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-kumbhBold text-base text-[#111827]">
                                                {item.title}
                                            </Text>
                                            <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                                {item.subtitle}
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="h-8 w-8 items-center justify-center rounded-full bg-[#F5F7FB]">
                                        <ChevronRight
                                            size={15}
                                            color="#6B7280"
                                        />
                                    </View>
                                </Pressable>
                            );
                        }

                        return (
                            <Pressable
                                key={item.title}
                                onPress={item.onPress}
                                className="rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
                                style={{ width: "48.5%" as any }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View
                                        className="h-11 w-11 items-center justify-center rounded-2xl"
                                        style={{ backgroundColor: item.bg }}
                                    >
                                        {item.icon}
                                    </View>
                                    <View className="h-7 w-7 items-center justify-center rounded-full bg-[#F5F7FB]">
                                        <ChevronRight
                                            size={14}
                                            color="#9CA3AF"
                                        />
                                    </View>
                                </View>
                                <Text className="mt-4 font-kumbhBold text-base text-[#111827]">
                                    {item.title}
                                </Text>
                                <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                    {item.subtitle}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {birthdaySummary &&
                (birthdaySummary.counts.today > 0 ||
                    birthdaySummary.counts.week > 0 ||
                    birthdaySummary.counts.month > 0) ? (
                    <Pressable
                        onPress={() => router.push("/(admin)/birthdays")}
                        className="mt-4 flex-row items-center justify-between rounded-[24px] border border-amber-200/80 bg-amber-50 p-4 active:opacity-90"
                    >
                        <View className="mr-3 flex-1 flex-row items-center">
                            <View className="mr-3.5 h-11 w-11 items-center justify-center rounded-2xl bg-amber-100">
                                <Cake size={20} color="#B45309" />
                            </View>
                            <View className="flex-1">
                                <Text className="font-kumbhBold text-sm text-amber-900">
                                    Birthday reminders
                                </Text>
                                <Text className="mt-0.5 font-kumbh text-xs text-amber-800">
                                    {birthdaySummary.counts.today > 0
                                        ? birthdayTodayMessage(
                                              birthdaySummary.today.map(
                                                  (person) => person.name,
                                              ),
                                          )
                                        : birthdaySummary.counts.week > 0
                                          ? `${birthdaySummary.counts.week} birthday${birthdaySummary.counts.week === 1 ? "" : "s"} this week`
                                          : `${birthdaySummary.counts.month} birthday${birthdaySummary.counts.month === 1 ? "" : "s"} this month`}
                                </Text>
                            </View>
                        </View>
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-white/80">
                            <ChevronRight size={16} color="#92400E" />
                        </View>
                    </Pressable>
                ) : null}

                <Pressable
                    onPress={() => router.push("/(admin)/report")}
                    className="mt-4 flex-row items-center justify-between rounded-[24px] border border-[#4C5FAB]/20 bg-white p-4 active:opacity-90"
                >
                    <View className="flex-1 flex-row items-center pr-3">
                        <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl bg-[#4C5FAB]">
                            <BarChart3 size={20} color="#FFFFFF" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-kumbhBold text-[10px] uppercase tracking-[1.2px] text-[#4C5FAB]">
                                Analytics & Reports
                            </Text>
                            <Text className="mt-0.5 font-kumbhBold text-base text-[#111827]">
                                Create report
                            </Text>
                            <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                Generate AI project summaries
                            </Text>
                        </View>
                    </View>
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF]">
                        <ChevronRight size={18} color="#4C5FAB" />
                    </View>
                </Pressable>

                <View className="mt-6">
                    <View className="mb-3 flex-row items-center justify-between px-1">
                        <Text className="font-kumbhBold text-base text-[#111827]">
                            Records
                        </Text>
                        <Text className="font-kumbh text-xs text-[#6B7280]">
                            Archive & recovery
                        </Text>
                    </View>

                    <View className="overflow-hidden rounded-[24px] border border-gray-100 bg-white">
                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/clients/deleted")
                            }
                            className="flex-row items-center justify-between p-4 active:bg-gray-50"
                        >
                            <View className="flex-1 flex-row items-center pr-3">
                                <View className="mr-3.5 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                    <Trash2 size={18} color="#4C5FAB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-kumbhBold text-sm text-[#111827]">
                                        Deleted Clients
                                    </Text>
                                    <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                        Review removed client records
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </Pressable>

                        <View className="mx-4 h-px bg-gray-100" />

                        <Pressable
                            onPress={() =>
                                router.push("/(admin)/channels/deleted")
                            }
                            className="flex-row items-center justify-between p-4 active:bg-gray-50"
                        >
                            <View className="flex-1 flex-row items-center pr-3">
                                <View className="mr-3.5 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                    <FolderKanban size={18} color="#4C5FAB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="font-kumbhBold text-sm text-[#111827]">
                                        Deleted Projects
                                    </Text>
                                    <Text className="mt-0.5 font-kumbh text-xs text-[#6B7280]">
                                        Inspect removed project workspaces
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
            <BotpressFab title="Hexavia Assistant" />
        </SafeAreaView>
    );
}
