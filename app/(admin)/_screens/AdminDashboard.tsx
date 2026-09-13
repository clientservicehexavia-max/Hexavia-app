import { BirthdaySummary, fetchBirthdaySummary } from "@/api/birthdays";
import { useFocusEffect, useRouter } from "expo-router";
import {
    BarChart3,
    BriefcaseBusiness,
    ChevronRight,
    FolderKanban,
    Handshake,
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

import SectionCard from "@/components/admin/SectionCard";
import Tile from "@/components/admin/Tile";
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

    return (
        <SafeAreaView
            edges={["top", "left", "right"]}
            className="flex-1 bg-white"
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
                    rightIcon={<BarChart3 size={20} color="#111827" />}
                    onRightPress={() => router.push("/(admin)/report")}
                />

                <View className="gap-2 mb-2">
                    <View className="flex-row gap-2">
                        <Tile
                            title="Clients"
                            icon={<Users size={22} color="white" />}
                            onPress={() =>
                                router.push("/(admin)/(tabs)/client")
                            }
                        />

                        <Tile
                            title="Projects"
                            icon={<UserPlus size={22} color="white" />}
                            onPress={() =>
                                router.push("/(admin)/(tabs)/project")
                            }
                        />
                    </View>
                    {(showTeam || showFinance) && (
                        <View className="flex-row gap-2">
                            {showTeam && (
                                <Tile
                                    title="Team"
                                    icon={
                                        <FolderKanban size={22} color="white" />
                                    }
                                    onPress={() =>
                                        router.push("/(admin)/(tabs)/team")
                                    }
                                />
                            )}
                            {showFinance && (
                                <Tile
                                    title="Finance"
                                    icon={<BarChart3 size={22} color="white" />}
                                    onPress={() =>
                                        router.push("/(admin)/finance")
                                    }
                                />
                            )}
                        </View>
                    )}
                    <View className="flex-row gap-2">
                        <Tile
                            title="Prospects"
                            icon={<FolderKanban size={22} color="white" />}
                            onPress={() => router.push("/(admin)/prospects")}
                        />

                        <Tile
                            title="Partnerships"
                            icon={<Handshake size={22} color="white" />}
                            onPress={() => router.push("/(admin)/partnerships")}
                        />
                    </View>

                    <View className="flex-row gap-2">
                        <Tile
                            title="Recruitment"
                            icon={<BriefcaseBusiness size={22} color="white" />}
                            onPress={() => router.push("/(admin)/recruitment")}
                        />
                        {showHbcMembers && (
                            <Tile
                                title="HBC"
                                icon={<UsersRound size={22} color="white" />}
                                onPress={() => router.push("/(admin)/hbc")}
                            />
                        )}
                    </View>
                </View>

                {birthdaySummary && birthdaySummary.counts.month > 0 ? (
                    <Pressable
                        onPress={() => router.push("/(admin)/birthdays")}
                        className="my-2 flex-row items-center justify-between rounded-xl border border-amber-100 bg-amber-50 p-4"
                    >
                        <View className="mr-3 flex-1">
                            <Text className="font-kumbhBold text-amber-900">
                                Birthday reminders
                            </Text>
                            <Text className="mt-1 font-kumbh text-sm text-amber-800">
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
                        <ChevronRight size={22} color="#92400E" />
                    </Pressable>
                ) : null}

                <SectionCard
                    title="Deleted Clients"
                    onPress={() => router.push("/(admin)/clients/deleted")}
                >
                    <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                            <Text className="text-sm text-gray-600 font-kumbh">
                                Review clients that were removed from the
                                system.
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1 font-kumbh">
                                Tap to open the deleted client log.
                            </Text>
                        </View>
                        <ChevronRight size={20} color="#111827" />
                    </View>
                </SectionCard>
            </ScrollView>
            <BotpressFab title="Hexavia Assistant" />
        </SafeAreaView>
    );
}
