import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, RefreshControl, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import FilterModal, { Filters } from "@/components/FIlterModal";
import SearchBar from "@/components/SearchBar";
import ChannelCard from "@/components/staff/channels/ChannelCard";
import useDebounced from "@/hooks/useDebounced";
import { useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectAllChannels,
    selectMyChannelsByUserId,
} from "@/redux/channels/channels.selectors";
import {
    fetchChannelByCode,
    fetchChannels,
    joinChannel,
} from "@/redux/channels/channels.thunks";
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
    const [refreshing, setRefreshing] = useState(false);

    // Refresh channels and profile whenever the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            dispatch(fetchProfile());
            dispatch(fetchChannels());
        }, [dispatch]),
    );

    const userId = user?._id ?? null;

    // My channels (joined / created)
    const myChannels = useAppSelector((s) =>
        selectMyChannelsByUserId(s, userId),
    );
    // All loaded channels
    const allChannels = useAppSelector(selectAllChannels);

    const myChannelIds = useMemo(
        () => new Set(myChannels.map((c: any) => String(c?._id ?? c?.id))),
        [myChannels],
    );

    // Code search effect (dynamic fetch if user enters a 4-char code not yet in cache)
    useEffect(() => {
        const normalized = normalizeCodeLoose(debouncedQuery);
        if (normalized.length === 4) {
            dispatch(fetchChannelByCode(normalized));
        }
    }, [debouncedQuery, dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dispatch(fetchProfile()).unwrap(),
                dispatch(fetchChannels()).unwrap(),
            ]);
        } catch {
            // error handled by thunk
        } finally {
            setRefreshing(false);
        }
    }, [dispatch]);

    const handleJoin = useCallback(
        async (code: string) => {
            const cleanCode = normalizeCodeLoose(code);
            if (!cleanCode) return;
            try {
                await dispatch(joinChannel(cleanCode)).unwrap();
                await dispatch(fetchChannels()).unwrap();
            } catch (err) {
                // error is already toasted by thunk
            }
        },
        [dispatch],
    );

    const [filters, setFilters] = useState<Filters>({
        department: "All",
        unreadOnly: false,
        sortBy: "name",
    });
    const [filterOpen, setFilterOpen] = useState(false);

    const data = useMemo(() => {
        const isSearching = Boolean(debouncedQuery.trim());
        const baseChannels = isSearching ? allChannels : myChannels;

        const keyed = baseChannels
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
        const normalizedQ = normalizeCodeLoose(debouncedQuery);
        if (q) {
            list = list.filter((c) => {
                const name = (c?.name || "").toLowerCase();
                const desc = (c?.description || "").toLowerCase();
                const dept = ((c as any)?.department || "").toLowerCase();
                const code = (c?.code || "").toLowerCase();
                const normalizedCode = normalizeCodeLoose(c?.code || "");

                return (
                    name.includes(q) ||
                    desc.includes(q) ||
                    dept.includes(q) ||
                    code.includes(q) ||
                    (Boolean(normalizedQ) &&
                        Boolean(normalizedCode) &&
                        normalizedCode.includes(normalizedQ))
                );
            });
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
    }, [debouncedQuery, filters, myChannels, allChannels, myChannelIds]);

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
                            onJoin={handleJoin}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 24, paddingTop: 0 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
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
                                    : debouncedQuery.trim()
                                      ? "No Projects found matching your search"
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
