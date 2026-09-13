import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, RefreshControl, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import FilterModal, { Filters } from "@/components/FIlterModal";
import SearchBar from "@/components/SearchBar";
import ChannelCard from "@/components/staff/channels/ChannelCard";
import useDebounced from "@/hooks/useDebounced";
import { StatusBar } from "expo-status-bar";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectMyChannelsByUserId } from "@/redux/channels/channels.selectors";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import type { AppDispatch, RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";
import { SafeAreaView } from "react-native-safe-area-context";

const PALETTE = [
    // "#37CC86",
    // "#48A7FF",
    // "#F6A94A",
    // "#29C57A",
    // "#4C5FAB",
    // "#9B7BF3",
    "#4c5fab",
];
const colorFor = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++)
        hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
};
const INACTIVE = "#9CA3AF";
const makeKey = (c: any) => String(c?.id ?? c?._id ?? c?.code ?? c?.name ?? "");

// --- helpers to normalize “codes” (accept #, spaces, dashes, case-insensitive)
const normalizeCodeLoose = (s: string) =>
    s
        .trim()
        .replace(/^#/, "")
        .replace(/[\s-]+/g, "")
        .toLowerCase();

export default function AllChannelsScreen() {
    const dispatch = useDispatch<AppDispatch>();
    const isIOS = Platform.OS === "ios";

    const status = useSelector((s: RootState) => s.channels.status);
    const user = useAppSelector(selectUser);

    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 250);

    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);

    const userId = user?._id ?? null;

    // My channels (existing list)
    const myChannels = useAppSelector((s) =>
        selectMyChannelsByUserId(s, userId),
    );
    const myChannelIds = new Set(
        myChannels.map((c: any) => String(c?._id ?? c?.id)),
    );

    const onRefresh = useCallback(() => {
        // refresh is handled by the channel slice fetch for the current user only
    }, []);

    const [filters, setFilters] = useState<Filters>({
        department: "All",
        unreadOnly: false,
        sortBy: "name",
    });
    const [filterOpen, setFilterOpen] = useState(false);

    const data = useMemo(() => {
        const keyed = myChannels
            .filter(Boolean)
            .map((c: any) => ({ ...c, __key: makeKey(c) }))
            .filter((c: any) => c.__key.length > 0);

        const seen = new Set<string>();
        const deduped: any[] = [];
        for (const c of keyed) {
            if (!seen.has(c.__key)) {
                seen.add(c.__key);
                deduped.push(c);
            }
        }

        let list = deduped.map((c) => ({
            ...c,
            isMember: myChannelIds.has(String(c._id ?? c.id)),
        }));

        const q = debouncedQuery.trim().toLowerCase();
        if (q) {
            list = list.filter((c) =>
                [
                    c?.name ?? "",
                    c?.description ?? "",
                    (c as any)?.department ?? "",
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(q),
            );
        }
        if (filters.department !== "All") {
            list = list.filter(
                (c: any) => c?.department === filters.department,
            );
        }
        if (filters.unreadOnly) {
            list = list.filter((c: any) => !!c?.unread);
        }
        if (filters.sortBy === "name") {
            list.sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
        } else if (filters.sortBy === "members") {
            list.sort(
                (a: any, b: any) =>
                    (b?.membersCount ?? 0) - (a?.membersCount ?? 0),
            );
        }
        return list;
    }, [debouncedQuery, filters, myChannels, myChannelIds]);

    const viewStyle = {
        flex: 1,
    };

    return (
        <SafeAreaView
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
            className="flex-1 bg-white"
        >
            <StatusBar style="dark" />
            <View style={viewStyle}>
                <PlatformAdaptiveHeader title="Projects" />
                <SearchBar
                    value={query}
                    onChange={setQuery}
                    onOpenFilter={() => setFilterOpen(true)}
                />

                <FlatList
                    data={data}
                    keyExtractor={(item: any) => item.__key}
                    renderItem={({ item }) => (
                        <ChannelCard
                            item={item}
                            colorOverride={
                                (item as any)?.color || colorFor(item.__key)
                            }
                            isMember={item.isMember}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 24, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={status === "loading"}
                            onRefresh={onRefresh}
                        />
                    }
                    ListEmptyComponent={
                        <View className="items-center mt-24">
                            <Ionicons
                                name="chatbubbles-outline"
                                size={28}
                                color={INACTIVE}
                            />
                            <Text className="mt-2 text-gray-500 font-kumbh">
                                {status === "loading"
                                    ? "Loading Projects..."
                                    : "No Projects found"}
                            </Text>
                        </View>
                    }
                />

                <FilterModal
                    visible={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    value={filters}
                    onChange={setFilters}
                />
            </View>
        </SafeAreaView>
    );
}
