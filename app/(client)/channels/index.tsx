import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, RefreshControl, Text, View } from "react-native";
import { useDispatch, useSelector } from "react-redux";

import BackHeader from "@/components/BackHeader";
import FilterModal, { Filters } from "@/components/FIlterModal";
import SearchBar from "@/components/SearchBar";
import ChannelCard from "@/components/staff/channels/ChannelCard";
import JoinableChannelCard from "@/components/staff/channels/JoinableChannelCard"; // NEW
import useDebounced from "@/hooks/useDebounced";
import { StatusBar } from "expo-status-bar";

import {
  selectAllChannels,
  makeSelectDefaultChannelId,
  selectMyChannelsByUserId,
} from "@/redux/channels/channels.selectors"; // NOTE: bring selectAllChannels
import { fetchChannelByCode, fetchChannels, joinChannel } from "@/redux/channels/channels.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import type { AppDispatch, RootState } from "@/store";
import { useAppSelector } from "@/store/hooks";

const PALETTE = [
  // "#37CC86",
  // "#48A7FF",
  // "#F6A94A",
  // "#29C57A",
  // "#4C5FAB",
  // "#9B7BF3",
  "#4c5fab"
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
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const status = useSelector((s: RootState) => s.channels.status);
  const user = useAppSelector(selectUser);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 250);

  const [codeSearchResult, setCodeSearchResult] = useState<any>(null);
  const [codeSearchStatus, setCodeSearchStatus] = useState<"idle" | "loading" | "succeeded" | "failed">("idle");


  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const userId = user?._id ?? null;
  const defaultChannelId = useAppSelector(
    makeSelectDefaultChannelId(userId ?? null, "recent"),
  );

  // My channels (existing list)
  const myChannels = useAppSelector((s) => selectMyChannelsByUserId(s, userId));
  const myChannelIds = new Set(myChannels.map((c: any) => String(c?._id ?? c?.id)));

  // All channels (for the code-based search)
  const allChannels = useAppSelector(selectAllChannels);
  // console.log(allChannels);

  useEffect(() => {
    if (status === "idle") dispatch(fetchChannels());
  }, [status, dispatch]);

  useEffect(() => {
    if (!defaultChannelId) return;
    router.replace({
      pathname: "/(client)/(tabs)/chats/[channelId]",
      params: { channelId: defaultChannelId },
    });
  }, [defaultChannelId, router]);

  // Effect for code search
  useEffect(() => {
    const normalized = normalizeCodeLoose(debouncedQuery);
    if (normalized.length === 4) {
      setCodeSearchStatus("loading");
      dispatch(fetchChannelByCode(normalized))
        .unwrap()
        .then((channel) => {
          setCodeSearchResult(channel);
          setCodeSearchStatus("succeeded");
        })
        .catch(() => {
          setCodeSearchResult(null);
          setCodeSearchStatus("failed");
        });
    } else {
      setCodeSearchResult(null);
      setCodeSearchStatus("idle");
    }
  }, [debouncedQuery, dispatch]);

  const onRefresh = useCallback(() => {
    dispatch(fetchChannels());
  }, [dispatch]);

  const [filters, setFilters] = useState<Filters>({
    department: "All",
    unreadOnly: false,
    sortBy: "name",
  });
  const [filterOpen, setFilterOpen] = useState(false);

  // ----- code lookup via API (when exactly 4 chars normalized)
  const codeMatch = useMemo(() => {
    const normalized = normalizeCodeLoose(debouncedQuery);
    if (normalized.length === 4 && codeSearchStatus === "succeeded") {
      return codeSearchResult;
    }
    return null;
  }, [debouncedQuery, codeSearchResult, codeSearchStatus]);

  const alreadyMember = useMemo(() => {
    if (!codeMatch || !userId) return false;
    const myIds = new Set(myChannels.map((c: any) => String(c?._id ?? c?.id)));
    const targetId = String((codeMatch as any)?._id ?? (codeMatch as any)?.id);
    return myIds.has(targetId);
  }, [codeMatch, myChannels, userId]);

  // ------- existing data list (for MY channels), still searchable by name
  const data = useMemo(() => {
    const keyed = allChannels
      .filter(Boolean)
      .map((c) => ({ ...c, __key: makeKey(c) }))
      .filter((c) => c.__key.length > 0);

    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const c of keyed) {
      if (!seen.has(c.__key)) {
        seen.add(c.__key);
        deduped.push(c);
      }
    }

    let list = deduped.filter((c) => {
      if (codeMatch && !alreadyMember) {
        const targetId = String((codeMatch as any)?._id ?? (codeMatch as any)?.id);
        const cId = String(c?._id ?? c?.id);
        return cId !== targetId;
      }
      return true;
    }).map((c) => ({ ...c, isMember: myChannelIds.has(String(c._id ?? c.id)) }));

    const q = debouncedQuery.trim().toLowerCase();

    // keep existing behavior: name/desc/department search for MY list
    if (q) {
      list = list.filter((c) =>
        [c?.name ?? "", c?.description ?? "", (c as any)?.department ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    if (filters.department !== "All") {
      list = list.filter((c: any) => c?.department === filters.department);
    }
    if (filters.unreadOnly) {
      list = list.filter((c: any) => !!c?.unread);
    }
    if (filters.sortBy === "name") {
      list.sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? ""));
    } else if (filters.sortBy === "members") {
      list.sort(
        (a: any, b: any) => (b?.membersCount ?? 0) - (a?.membersCount ?? 0)
      );
    }
    return list;
  }, [debouncedQuery, filters, allChannels, codeMatch, alreadyMember, myChannelIds]);

  const viewStyle = {
    flex: 1,
    marginTop: Platform.select({ ios: 60, android: 40 }),
  };

  // click handler for the join button
  const handleJoin = useCallback((channel: any) => {
    const code = normalizeCodeLoose(channel?.code || "");
    if (code) {
      dispatch(joinChannel(code));
    }
  }, [dispatch]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <View style={viewStyle}>
        <BackHeader title="All Projects" />
        <SearchBar
          value={query}
          onChange={setQuery}
          onOpenFilter={() => setFilterOpen(true)}
        />

        {/* --- CODE MATCH AREA: shows when user typed a code that matches any channel --- */}
        {!!debouncedQuery && normalizeCodeLoose(debouncedQuery).length === 4 && (
          <View>
            {codeSearchStatus === "loading" ? (
              <View className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                <Text className="text-gray-700 font-kumbh">Searching for project...</Text>
              </View>
            ) : codeMatch ? (
              <JoinableChannelCard
                item={{
                  id: String((codeMatch as any)?._id ?? (codeMatch as any)?.id),
                  name: (codeMatch as any)?.name,
                  description: (codeMatch as any)?.description,
                  code: (codeMatch as any)?.code,
                }}
                onJoin={handleJoin}
                disabled={alreadyMember}
              />
            ) : codeSearchStatus === "failed" ? (
              <View className="mx-4 mt-4 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200">
                <Text className="text-gray-700 font-kumbh">
                  No Project found with that code.
                </Text>
                <Text className="text-gray-500 mt-1 text-[12px] font-kumbh">
                  Tip: Try pasting the exact code (with or without #, any case).
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* --- EXISTING LIST: my channels --- */}
        <FlatList
          data={data}
          keyExtractor={(item: any) => item.__key}
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              colorOverride={(item as any)?.color || colorFor(item.__key)}
              isMember={item.isMember}
              onJoin={handleJoin}
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
              <Ionicons name="chatbubbles-outline" size={28} color={INACTIVE} />
              <Text className="mt-2 text-gray-500 font-kumbh">
                {status === "loading"
                  ? "Loading channels…"
                  : "No channels found"}
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
    </View>
  );
}
