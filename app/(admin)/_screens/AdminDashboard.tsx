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

import AdminHeader from "@/components/admin/AdminHeader";
import SectionCard from "@/components/admin/SectionCard";
import Tile from "@/components/admin/Tile";
import BotpressFab from "@/components/common/BotpressFab";
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
        normalizeRole(user?.role) === "supervisor" ? "Supervisor" : "Admin";

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchProfile()).unwrap();
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    return (
        <SafeAreaView
            edges={isIOS ? ["top", "left", "right"] : ["top", "left", "right"]}
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
                    title="Hi Hexavia!"
                    subtitleBadge={subtitleBadge}
                    rightIcon={<Bell size={20} color="#111827" />}
                    onRightPress={() => router.push("/(admin)/notifications")}
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
                </View>

                <SectionCard noTitle>
                    <Pressable
                        onPress={() => router.push("/(admin)/report")}
                        className="flex-row items-center justify-between"
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="w-12 h-12 rounded-2xl bg-primary-100 items-center justify-center">
                                <BarChart3 size={22} color="#4c5fab" />
                            </View>
                            <View>
                                <Text className="text-[20px] font-kumbh text-text">
                                    Create report
                                </Text>
                                <Text className="text-sm text-gray-500 mt-1 max-w-[200px] font-kumbh">
                                    Generate detailed reports to track
                                    performance and make informed decisions
                                </Text>
                            </View>
                        </View>
                        <ChevronRight size={22} color="#111827" />
                    </Pressable>
                </SectionCard>

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

                <SectionCard
                    title="Deleted Projects"
                    onPress={() => router.push("/(admin)/channels/deleted")}
                >
                    <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                            <Text className="text-sm text-gray-600 font-kumbh">
                                Review channels/projects that were removed from
                                the workspace.
                            </Text>
                            <Text className="text-sm text-gray-500 mt-1 font-kumbh">
                                Tap to open the deleted project log.
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
