import { CustomTextInput } from "@/components/ui/CustomInput";
import { useFocusEffect, useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    Building2,
    ChevronRight,
    Gift,
    Landmark,
    Mail,
    Phone,
    Plus,
    Search,
    Users,
    X,
} from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fetchBirthdaySummary } from "@/api/birthdays";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectAllPartners,
    selectPartnerError,
    selectPartnerLoading,
    selectPartnerPagination,
} from "@/redux/partner/partner.selectors";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import type { Partner } from "@/redux/partner/partner.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const PAGE_LIMIT = 20;

function useDebounced<T>(value: T, ms: number) {
    const [deb, setDeb] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDeb(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return deb;
}

function PartnerMeta({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <View className="flex-row items-center mr-3 mb-1">
            {icon}
            <Text
                className="ml-1 text-xs font-kumbh text-gray-500"
                numberOfLines={1}
            >
                {text}
            </Text>
        </View>
    );
}

export default function PartnersListScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partners = useAppSelector(selectAllPartners);
    const loading = useAppSelector(selectPartnerLoading);
    const error = useAppSelector(selectPartnerError);
    const pagination = useAppSelector(selectPartnerPagination);

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [refreshing, setRefreshing] = useState(false);
    const [birthdayCount, setBirthdayCount] = useState(0);
    const didInitialLoadRef = useRef(false);

    const debouncedQuery = useDebounced(query, 300);

    const loadPartners = useCallback(
        async (page: number, asRefresh = false) => {
            if (asRefresh) setRefreshing(true);
            try {
                await dispatch(
                    fetchPartners({
                        search: debouncedQuery,
                        status,
                        page,
                        limit: PAGE_LIMIT,
                    }),
                ).unwrap();
            } catch (err) {
                console.error("Error fetching partners:", err);
            } finally {
                if (asRefresh) setRefreshing(false);
            }
        },
        [dispatch, debouncedQuery, status],
    );

    const onRefresh = useCallback(async () => {
        await loadPartners(1, true);
    }, [loadPartners]);

    const loadMore = useCallback(() => {
        if (loading || refreshing) return;
        if (!pagination) return;
        if (pagination.currentPage >= pagination.totalPages) return;

        void loadPartners(pagination.currentPage + 1, false);
    }, [loading, refreshing, pagination, loadPartners]);

    useFocusEffect(
        useCallback(() => {
            onRefresh();
            void fetchBirthdaySummary("partners")
                .then((summary) => setBirthdayCount(summary.counts.month))
                .catch(() => setBirthdayCount(0));
        }, [onRefresh]),
    );

    useEffect(() => {
        if (!didInitialLoadRef.current) {
            didInitialLoadRef.current = true;
            return;
        }

        onRefresh();
    }, [debouncedQuery, status, onRefresh]);

    const filteredPartners = useMemo(() => {
        return partners.filter((partner) => {
            const matchesQuery =
                partner.name
                    .toLowerCase()
                    .includes(debouncedQuery.toLowerCase()) ||
                partner.company
                    ?.toLowerCase()
                    .includes(debouncedQuery.toLowerCase());
            const matchesStatus = !status || partner.status === status;
            return matchesQuery && matchesStatus;
        });
    }, [partners, debouncedQuery, status]);

    const isInitialLoading = loading && !refreshing && partners.length === 0;

    const renderPartnerItem = ({ item }: { item: Partner }) => (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/(admin)/partnerships/partners/[id]",
                    params: { id: item._id },
                })
            }
            className="bg-white p-4 mb-3 rounded-[24px] border border-gray-100 active:opacity-85"
        >
            <View className="flex-row items-start justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                    <View className="h-11 w-11 rounded-2xl bg-[#EEF2FF] items-center justify-center mr-3">
                        <Landmark size={18} color="#4C5FAB" />
                    </View>
                    <View className="flex-1">
                        <Text
                            className="text-[16px] font-kumbhBold text-[#111827]"
                            numberOfLines={1}
                        >
                            {item.company || item.name || "No company added"}
                        </Text>
                        <Text
                            className="mt-0.5 text-[13px] font-kumbh text-[#6B7280]"
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                    </View>
                </View>

                <View
                    className={`px-2.5 py-1 rounded-full ${
                        item.status === "active"
                            ? "bg-emerald-50"
                            : "bg-slate-100"
                    }`}
                >
                    <Text
                        className={`text-[11px] font-kumbhBold capitalize ${
                            item.status === "active"
                                ? "text-emerald-700"
                                : "text-slate-700"
                        }`}
                    >
                        {item.status}
                    </Text>
                </View>
            </View>

            {item.partnerType ||
            item.industry ||
            item.contactEmail ||
            item.contactPhone ? (
                <View className="mt-3 rounded-2xl bg-[#F5F7FB] px-3.5 py-2.5 flex-row flex-wrap">
                    {item.partnerType ? (
                        <PartnerMeta
                            icon={
                                <BriefcaseBusiness
                                    size={13}
                                    color="#6B7280"
                                />
                            }
                            text={item.partnerType}
                        />
                    ) : null}
                    {item.industry ? (
                        <PartnerMeta
                            icon={<Building2 size={13} color="#6B7280" />}
                            text={item.industry}
                        />
                    ) : null}
                    {item.contactEmail ? (
                        <PartnerMeta
                            icon={<Mail size={13} color="#6B7280" />}
                            text={item.contactEmail}
                        />
                    ) : null}
                    {item.contactPhone ? (
                        <PartnerMeta
                            icon={<Phone size={13} color="#6B7280" />}
                            text={item.contactPhone}
                        />
                    ) : null}
                </View>
            ) : null}

            <View className="mt-3 pt-2.5 border-t border-gray-100 flex-row items-center justify-between">
                <View className="px-2.5 py-1 rounded-full bg-[#EEF2FF]">
                    <Text className="text-[11px] font-kumbhBold text-[#4C5FAB]">
                        {item.dealCount ?? 0}{" "}
                        {(item.dealCount ?? 0) === 1 ? "deal" : "deals"}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    <Text className="text-[12px] font-kumbhBold text-[#4C5FAB] mr-1">
                        View partner
                    </Text>
                    <ChevronRight size={14} color="#4C5FAB" />
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <View className="flex-1">
                <PlatformAdaptiveHeader
                    title="Partners"
                    backgroundColor="#F5F7FB"
                    headerRight={({ tintColor }) => (
                        <View className="flex-row items-center gap-2 ios:mr-3">
                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname: "/(admin)/birthdays",
                                        params: { filter: "partners" },
                                    })
                                }
                                className="h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200"
                                hitSlop={8}
                            >
                                <Gift size={18} color={tintColor ?? "#111827"} />
                                {birthdayCount > 0 ? (
                                    <View className="absolute -right-0.5 -top-0.5 min-w-4 h-4 rounded-full bg-amber-500 px-1 items-center justify-center">
                                        <Text className="text-[9px] leading-3 font-kumbhBold text-white">
                                            {birthdayCount > 99
                                                ? "99+"
                                                : birthdayCount}
                                        </Text>
                                    </View>
                                ) : null}
                            </Pressable>
                            <Pressable
                                onPress={() =>
                                    router.push(
                                        "/(admin)/partnerships/partners/create",
                                    )
                                }
                                className="w-10 h-10 rounded-full items-center justify-center bg-[#4C5FAB]"
                                hitSlop={8}
                            >
                                <Plus size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    )}
                />

                <View className="px-4 pt-2 pb-3">
                    <View className="h-14 w-full flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                        <Search size={18} color="#6B7280" />
                        <CustomTextInput
                            placeholder="Search partners..."
                            value={query}
                            onChangeText={setQuery}
                            className="flex-1 h-full ml-3"
                            returnKeyType="search"
                        />
                        {query.length > 0 ? (
                            <Pressable
                                onPress={() => setQuery("")}
                                hitSlop={8}
                                className="ml-2 h-7 w-7 rounded-full bg-[#F3F4F6] items-center justify-center"
                            >
                                <X size={14} color="#6B7280" />
                            </Pressable>
                        ) : null}
                    </View>

                    <View className="mt-3 h-11 flex-row rounded-2xl border border-gray-200 bg-white p-1">
                        {["all", "active", "inactive"].map((s) => {
                            const active =
                                (s === "all" && !status) ||
                                (s !== "all" && status === s);
                            return (
                                <Pressable
                                    key={s}
                                    onPress={() =>
                                        setStatus(s === "all" ? undefined : s)
                                    }
                                    className={`flex-1 rounded-xl items-center justify-center ${
                                        active ? "bg-[#4C5FAB]" : ""
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-kumbhBold ${
                                            active
                                                ? "text-white"
                                                : "text-[#6B7280]"
                                        }`}
                                    >
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Error Display */}
                {error && (
                    <View className="mx-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-3">
                        <Text className="text-red-700 text-xs font-kumbh">
                            {error}
                        </Text>
                    </View>
                )}

                {/* Partners List */}
                {isInitialLoading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#4C5FAB" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredPartners}
                        keyExtractor={(item) => item._id}
                        renderItem={renderPartnerItem}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: 28,
                        }}
                        showsVerticalScrollIndicator={false}
                        onEndReachedThreshold={0.25}
                        onEndReached={loadMore}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListFooterComponent={
                            loading && !refreshing && partners.length > 0 ? (
                                <View className="py-4 items-center">
                                    <ActivityIndicator
                                        size="small"
                                        color="#4C5FAB"
                                    />
                                </View>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View className="mt-2 rounded-[24px] bg-white border border-gray-100 px-5 py-12 items-center">
                                <View className="h-12 w-12 rounded-2xl bg-[#EEF2FF] items-center justify-center mb-3">
                                    <Users size={22} color="#4C5FAB" />
                                </View>
                                <Text className="text-[#111827] font-kumbhBold text-base">
                                    No partners found
                                </Text>
                                <Text className="mt-1 text-center text-[#6B7280] font-kumbh text-sm">
                                    Try adjusting your search or status filter.
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
