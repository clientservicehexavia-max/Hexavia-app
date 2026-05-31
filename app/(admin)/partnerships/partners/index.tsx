import { useFocusEffect, useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    Building2,
    ChevronRight,
    Mail,
    Phone,
    Plus,
    Search,
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
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import {
    selectAllPartners,
    selectPartnerError,
    selectPartnerLoading,
} from "@/redux/partner/partner.selectors";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import type { Partner } from "@/redux/partner/partner.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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

    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<string | undefined>(undefined);
    const [refreshing, setRefreshing] = useState(false);
    const didInitialLoadRef = useRef(false);

    const debouncedQuery = useDebounced(query, 300);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await dispatch(
                fetchPartners({
                    search: debouncedQuery,
                    status: status,
                }),
            ).unwrap();
        } catch (err) {
            console.error("Error fetching partners:", err);
        } finally {
            setRefreshing(false);
        }
    }, [dispatch, debouncedQuery, status]);

    useFocusEffect(
        useCallback(() => {
            onRefresh();
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

    const renderPartnerItem = ({ item }: { item: Partner }) => (
        <Pressable
            onPress={() =>
                router.push({
                    pathname: "/(admin)/partnerships/partners/[id]",
                    params: { id: item._id },
                })
            }
            className="bg-white p-4 mb-3 rounded-xl border border-gray-200"
        >
            <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                    <Text
                        className="text-lg font-kumbhBold text-gray-900"
                        numberOfLines={1}
                    >
                        {item.name}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Building2 size={14} color="#6B7280" />
                        <Text
                            className="ml-1 text-sm font-kumbh text-gray-600"
                            numberOfLines={1}
                        >
                            {item.company || "No company added"}
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
                        className={`text-xs font-kumbhBold ${
                            item.status === "active"
                                ? "text-emerald-700"
                                : "text-slate-700"
                        }`}
                    >
                        {item.status}
                    </Text>
                </View>
            </View>

            <View className="mt-3 flex-row flex-wrap">
                {item.partnerType ? (
                    <PartnerMeta
                        icon={<BriefcaseBusiness size={13} color="#6B7280" />}
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

            <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-between">
                <View className="px-2.5 py-1 rounded-full bg-blue-50">
                    <Text className="text-xs font-kumbhBold text-blue-700">
                        {item.dealCount ?? 0}{" "}
                        {(item.dealCount ?? 0) === 1 ? "deal" : "deals"}
                    </Text>
                </View>

                <View className="flex-row items-center">
                    <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                        View partner
                    </Text>
                    <ChevronRight size={14} color="#4C5FAB" />
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <View className="flex-1 px-4">
                <PlatformAdaptiveHeader
                    title="Partners"
                    headerRight={({ tintColor }) => (
                        <Pressable
                            onPress={() =>
                                router.push(
                                    "/(admin)/partnerships/partners/create",
                                )
                            }
                            className="w-10 h-10 rounded-full items-center justify-center"
                            hitSlop={8}
                        >
                            <Plus size={28} color={tintColor} />
                        </Pressable>
                    )}
                />

                <View className="bg-gray-50 rounded-lg px-3 py-2 mb-4 flex-row items-center">
                    <Search size={18} color="#666" />
                    <TextInput
                        placeholder="Search partners..."
                        value={query}
                        onChangeText={setQuery}
                        className="flex-1 ml-2 text-base"
                        placeholderTextColor="#999"
                    />
                </View>

                <View className="flex-row gap-2 mb-4">
                    {["all", "active", "inactive"].map((s) => (
                        <Pressable
                            key={s}
                            onPress={() =>
                                setStatus(s === "all" ? undefined : s)
                            }
                            className={`px-3 py-2 rounded-full border ${
                                (s === "all" && !status) ||
                                (s !== "all" && status === s)
                                    ? "bg-blue-500 border-blue-500"
                                    : "bg-white border-gray-200"
                            }`}
                        >
                            <Text
                                className={
                                    (s === "all" && !status) ||
                                    (s !== "all" && status === s)
                                        ? "text-white font-medium text-sm"
                                        : "text-gray-700 font-medium text-sm"
                                }
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Error Display */}
                {error && (
                    <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <Text className="text-red-800 text-sm">{error}</Text>
                    </View>
                )}

                {/* Partners List */}
                {loading && !refreshing ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#3b82f6" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredPartners}
                        keyExtractor={(item) => item._id}
                        renderItem={renderPartnerItem}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListEmptyComponent={
                            <View className="flex-1 justify-center items-center">
                                <Text className="text-gray-500 text-base">
                                    No partners found
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
