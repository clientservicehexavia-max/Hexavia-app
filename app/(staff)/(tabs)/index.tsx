import { useRouter } from "expo-router";
import { Bell, ChevronRight } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BotpressFab from "@/components/common/BotpressFab";
import { StaffHeader } from "@/components/common/UserHeader";
import ChannelCard from "@/components/staff/ChannelCard";
import SanctionCard from "@/components/staff/SanctionCard";
import TaskOverview from "@/components/staff/TaskOverviewCard";
import CreateChannelCard from "@/components/staff/channels/CreateChannelCard";
import CreateChannelModal from "@/components/staff/channels/CreateChannelModal";
import SkeletonChannelCard from "@/components/staff/channels/SkeletonChannelCard";
import useChannelCardLayout from "@/hooks/useChannelCardLayout";
import {
    selectMyChannelsByUserId,
    selectStatus,
} from "@/redux/channels/channels.selectors";
import { selectAllChannels } from "@/redux/channels/channels.slice";
import { fetchChannels, joinChannel } from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";

const PALETTE = [
    "#14D699",
    "#60A5FA",
    "#F6A94A",
    "#29C57A",
    "#4C5FAB",
    "#9B7BF3",
];
const colorFor = (key?: string) => {
    const safeKey = String(key ?? "");
    let hash = 0;
    for (let i = 0; i < safeKey.length; i++) {
        hash = (hash * 31 + safeKey.charCodeAt(i)) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
};

function firstNameOf(fullname?: string | null) {
    if (!fullname) return "User";
    return fullname.trim().split(/\s+/)[0];
}
function prettyRole(role?: string | null) {
    if (!role) return "Project Member";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StaffHome() {
    const [showCreate, setShowCreate] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const isIOS = Platform.OS === "ios";

    const router = useRouter();
    const dispatch = useAppDispatch();

    const user = useAppSelector(selectUser);
    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);
    const userId = user?._id ?? null;
    const allChannels = useAppSelector(selectAllChannels) ?? [];

    const channels = useAppSelector((s) => selectMyChannelsByUserId(s, userId));
    const myChannelIds = new Set(channels.map((c: any) => c._id));

    const status = useAppSelector(selectStatus);
    // console.log("Channels:", channels);

    useEffect(() => {
        if (status === "idle") dispatch(fetchChannels());
    }, [status, dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchProfile()).unwrap(),
                dispatch(fetchChannels()).unwrap(),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const handleJoin = (code: string) => {
        dispatch(joinChannel(code.replace(/^#/, "")));
    };

    const { GAP, CARD_WIDTH } = useChannelCardLayout();
    const CARD_WIDTH_NARROW = Math.max(250, CARD_WIDTH - 40);
    const SNAP = CARD_WIDTH_NARROW + GAP;

    const greetingName = firstNameOf(user?.fullname);
    const roleText = prettyRole(user?.role || "Hexavia Staff");

    const listData = useMemo(
        () =>
            [
                { kind: "create", id: "create" as const },
                ...allChannels.map((c: any) => ({
                    kind: "channel" as const,
                    id: String(c._id),
                    title: c.name,
                    subtitle: c.description ?? "",
                    code: c.code,
                    logo: (c as any)?.logo ?? undefined,
                    color: colorFor(c._id || (c as any)?.code || c.name),
                    isMember: myChannelIds.has(c._id),
                })),
            ] as const,
        [allChannels, myChannelIds],
    );

    const isLoading = status === "loading" && channels.length === 0;
    const skeletons = Array.from({ length: 4 }, (_, i) => ({
        kind: "skeleton" as const,
        id: `skeleton-${i}`,
    }));

    // console.log(channels);

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={isIOS ? ["top", "left", "right"] : ["top", "left", "right"]}
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
                {/* Top Bar */}
                <StaffHeader rightIcon={<Bell size={20} color="#111827" />} />

                {/* Channels */}
                <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-lg text-gray-900 font-kumbhBold">
                        Projects
                    </Text>
                    <Pressable
                        onPress={() => router.push("/(staff)/channels")}
                        className="flex-row items-center"
                    >
                        <Text className="text-primary mr-1 font-sans">
                            See all
                        </Text>
                        <ChevronRight size={16} color="#4C5FAB" />
                    </Pressable>
                </View>

                <View style={{ marginTop: 5 }}>
                    <FlatList
                        data={listData as any}
                        horizontal
                        keyExtractor={(it: any) => `${it.kind}:${it.id}`}
                        renderItem={({ item }: any) =>
                            item.kind === "create" ? (
                                <CreateChannelCard
                                    width={CARD_WIDTH_NARROW}
                                    gap={GAP}
                                    onPress={() => setShowCreate(true)}
                                />
                            ) : item.kind === "skeleton" ? (
                                <SkeletonChannelCard
                                    width={CARD_WIDTH_NARROW}
                                    gap={GAP}
                                />
                            ) : (
                                <ChannelCard
                                    width={CARD_WIDTH_NARROW}
                                    gap={GAP}
                                    item={item}
                                    isMember={item.isMember}
                                    onJoin={handleJoin}
                                />
                            )
                        }
                        ListEmptyComponent={
                            <View className="items-center mt-24">
                                <Ionicons
                                    name="chatbubbles-outline"
                                    size={28}
                                    color={"#9CA3AF"}
                                />
                                <Text className="mt-2 text-gray-500 font-kumbh">
                                    {status === "loading"
                                        ? "Loading Projects..."
                                        : "No Projects found"}
                                </Text>
                            </View>
                        }
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        alwaysBounceVertical={false}
                        overScrollMode="never"
                        // snapToInterval={SNAP}
                        // snapToAlignment="start"
                        decelerationRate="fast"
                        style={{ height: 130 + 20 }}
                        contentContainerStyle={{ paddingRight: 8 }}
                        getItemLayout={(_, index) => ({
                            length: SNAP,
                            offset: SNAP * index,
                            index,
                        })}
                    />
                </View>

                {/* Task */}
                <TaskOverview />

                {/* Sanction */}
                <SanctionCard />
            </ScrollView>

            {/* Modal */}
            <CreateChannelModal
                visible={showCreate}
                onClose={() => setShowCreate(false)}
            />
            <BotpressFab title="Hexavia Assistant" />
        </SafeAreaView>
    );
}
