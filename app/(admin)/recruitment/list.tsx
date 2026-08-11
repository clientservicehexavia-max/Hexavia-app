import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import {
    selectRecruitmentError,
    selectRecruitmentLoading,
    selectRecruitments,
} from "@/redux/recruitment/recruitment.selectors";
import { fetchRecruitments } from "@/redux/recruitment/recruitment.thunks";
import type { Recruitment } from "@/redux/recruitment/recruitment.types";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { canCreateRecruitment } from "@/utils/recruitmentPermissions";
import { normalizeRole } from "@/utils/roles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Filter as FilterIcon, Plus, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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

export default function RecruitmentListScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ status?: string }>();
    const dispatch = useAppDispatch();
    const recruitments = useAppSelector(selectRecruitments);
    const loading = useAppSelector(selectRecruitmentLoading);
    const error = useAppSelector(selectRecruitmentError);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [query, setQuery] = useState("");
    const initialStatus =
        params.status === "Active" || params.status === "Closed"
            ? params.status
            : undefined;
    const [status, setStatus] = useState<string | undefined>(initialStatus);
    const [companyFilter, setCompanyFilter] = useState("");
    const [recruiterFilter, setRecruiterFilter] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [draftStatus, setDraftStatus] = useState<string | undefined>(
        initialStatus,
    );
    const [draftCompanyFilter, setDraftCompanyFilter] = useState("");
    const [draftRecruiterFilter, setDraftRecruiterFilter] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        dispatch(fetchRecruitments({ page: 1, limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        if (initialStatus) {
            setStatus(initialStatus);
            setDraftStatus(initialStatus);
        }
    }, [initialStatus]);

    const filtered = useMemo(() => {
        return recruitments.filter((item) => {
            const companyName = item.clientName || "";
            const recruiterOnly = normalizeRole(role) === "staff";
            const isAssigned =
                !recruiterOnly ||
                (!!currentUser?._id &&
                    item.recruiterId === String(currentUser._id)) ||
                (!!currentUser?.email &&
                    (item.recruiterName || "").toLowerCase() ===
                        String(currentUser.email).toLowerCase());
            const matchesQuery =
                !query ||
                `${item.position} ${companyName}`
                    .toLowerCase()
                    .includes(query.toLowerCase());
            const matchesStatus = !status || item.status === status;
            const matchesCompany =
                !companyFilter ||
                companyName.toLowerCase().includes(companyFilter.toLowerCase());
            const matchesRecruiter =
                !recruiterFilter ||
                (item.recruiterName || "")
                    .toLowerCase()
                    .includes(recruiterFilter.toLowerCase());
            return (
                isAssigned &&
                matchesQuery &&
                matchesStatus &&
                matchesCompany &&
                matchesRecruiter
            );
        });
    }, [
        recruitments,
        role,
        currentUser?._id,
        currentUser?.email,
        query,
        status,
        companyFilter,
        recruiterFilter,
    ]);

    const activeFilterCount = useMemo(() => {
        return [status, companyFilter, recruiterFilter].filter((value) => {
            if (typeof value === "string") {
                return value.trim().length > 0;
            }
            return Boolean(value);
        }).length;
    }, [status, companyFilter, recruiterFilter]);

    const openFilters = () => {
        setDraftStatus(status);
        setDraftCompanyFilter(companyFilter);
        setDraftRecruiterFilter(recruiterFilter);
        setShowFilters(true);
    };

    const applyFilters = () => {
        setStatus(draftStatus);
        setCompanyFilter(draftCompanyFilter.trim());
        setRecruiterFilter(draftRecruiterFilter.trim());
        setShowFilters(false);
    };

    const clearFilters = () => {
        setStatus(undefined);
        setCompanyFilter("");
        setRecruiterFilter("");
        setDraftStatus(undefined);
        setDraftCompanyFilter("");
        setDraftRecruiterFilter("");
        setShowFilters(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await dispatch(fetchRecruitments({ page: 1, limit: 100 })).unwrap();
        } finally {
            setRefreshing(false);
        }
    };

    const renderItem = ({ item }: { item: Recruitment }) => {
        const companyName = item.clientName || "No company";
        return (
            <Pressable
                onPress={() => {
                    if (!item._id) return;
                    router.push({
                        pathname: "/(admin)/recruitment/[id]",
                        params: { id: item._id },
                    });
                }}
                className="mb-3 rounded-xl border border-gray-200 bg-white p-2.5"
            >
                <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-kumbhBold text-gray-900">
                            {item.position}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-600">
                            {companyName}
                        </Text>
                    </View>
                    <View className="rounded-full bg-emerald-50 px-2.5 py-1">
                        <Text className="text-xs font-kumbhBold text-emerald-700">
                            {item.status || "Active"}
                        </Text>
                    </View>
                </View>
                <View className="mt-3 flex-row flex-wrap">
                    <View className="mr-3 mb-1 rounded-full bg-blue-50 px-2 py-1">
                        <Text className="text-xs text-blue-700">
                            Recruiter: {item.recruiterName || "—"}
                        </Text>
                    </View>
                    <View className="mr-3 mb-1 rounded-full bg-slate-100 px-2 py-1">
                        <Text className="text-xs text-slate-700">
                            Candidates: {item.candidates?.length || 0}
                        </Text>
                    </View>
                    <View className="mr-3 mb-1 rounded-full bg-slate-100 px-2 py-1">
                        <Text className="text-xs text-slate-700">
                            {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : "—"}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView
            edges={
                Platform.OS === "ios"
                    ? ["left", "right"]
                    : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Campaigns"
                headerRight={({ tintColor }) => (
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={openFilters}
                            className={`h-10 w-10 items-center justify-center rounded-full ${activeFilterCount ? "bg-blue-50" : "bg-transparent"}`}
                            hitSlop={8}
                        >
                            <FilterIcon
                                size={22}
                                color={
                                    activeFilterCount ? "#2563EB" : tintColor
                                }
                            />
                            {activeFilterCount ? (
                                <View className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1">
                                    <Text className="text-[9px] font-kumbhBold leading-3 text-white">
                                        {activeFilterCount}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                        {canCreateRecruitment(role) ? (
                            <Pressable
                                onPress={() =>
                                    router.push("/(admin)/recruitment/create")
                                }
                                className="h-10 w-10 items-center justify-center rounded-full"
                                hitSlop={8}
                            >
                                <Plus size={28} color={tintColor} />
                            </Pressable>
                        ) : null}
                    </View>
                )}
            />
            <View className="mt-3 flex-1 px-4 pb-8">
                <View className="mb-4 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <Search size={20} color="#6B7280" />
                    <TextInput
                        className="ml-2 h-7 flex-1 font-kumbh text-gray-700"
                        placeholder="Search position or company"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {activeFilterCount ? (
                    <View className="mb-4 flex-row items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                        <Text className="text-xs font-kumbh text-blue-700">
                            {activeFilterCount} filter
                            {activeFilterCount > 1 ? "s" : ""} active
                        </Text>
                        <Pressable
                            onPress={clearFilters}
                            className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5"
                        >
                            <X size={13} color="#2563EB" />
                            <Text className="text-xs font-kumbhBold text-blue-700">
                                Clear
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                {error ? (
                    <Text className="mb-3 text-sm text-red-500">{error}</Text>
                ) : null}

                {loading && !refreshing ? (
                    <View className="items-center py-6">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) =>
                            item._id || Math.random().toString()
                        }
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                            />
                        }
                        ListEmptyComponent={
                            <Text className="py-8 text-center text-sm text-gray-500">
                                No recruitments found
                            </Text>
                        }
                    />
                )}
            </View>

            <FilterModal
                visible={showFilters}
                onClose={() => setShowFilters(false)}
                draftStatus={draftStatus}
                setDraftStatus={setDraftStatus}
                draftCompanyFilter={draftCompanyFilter}
                setDraftCompanyFilter={setDraftCompanyFilter}
                draftRecruiterFilter={draftRecruiterFilter}
                setDraftRecruiterFilter={setDraftRecruiterFilter}
                onApply={applyFilters}
                onClear={clearFilters}
                activeCount={activeFilterCount}
            />
        </SafeAreaView>
    );
}

function FilterModal({
    visible,
    onClose,
    draftStatus,
    setDraftStatus,
    draftCompanyFilter,
    setDraftCompanyFilter,
    draftRecruiterFilter,
    setDraftRecruiterFilter,
    onApply,
    onClear,
    activeCount,
}: {
    visible: boolean;
    onClose: () => void;
    draftStatus: string | undefined;
    setDraftStatus: (value: string | undefined) => void;
    draftCompanyFilter: string;
    setDraftCompanyFilter: (value: string) => void;
    draftRecruiterFilter: string;
    setDraftRecruiterFilter: (value: string) => void;
    onApply: () => void;
    onClear: () => void;
    activeCount: number;
}) {
    return (
        <BottomSheetModal
            visible={visible}
            onRequestClose={onClose}
            showActionRow={false}
        >
            <View className="mb-4 flex-row items-center justify-between">
                <View>
                    <Text className="text-xl font-kumbhBold text-gray-900">
                        Filter Campaigns
                    </Text>
                    <Text className="mt-1 text-xs font-kumbh text-gray-500">
                        {activeCount
                            ? `${activeCount} active filter${activeCount > 1 ? "s" : ""}`
                            : "No filters applied"}
                    </Text>
                </View>
                <Pressable
                    onPress={onClose}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    accessibilityLabel="Close filters"
                >
                    <X size={17} color="#374151" />
                </Pressable>
            </View>

            <View className="mb-3">
                <Text className="mb-1.5 text-[13px] font-kumbhBold text-gray-700">
                    Status
                </Text>
                <View className="flex-row flex-wrap gap-2">
                    {(["All", "Active", "Closed"] as const).map((option) => {
                        const isActive =
                            (draftStatus === undefined && option === "All") ||
                            draftStatus === option;
                        return (
                            <Pressable
                                key={option}
                                onPress={() =>
                                    setDraftStatus(
                                        option === "All" ? undefined : option,
                                    )
                                }
                                className={`rounded-full border px-3.5 py-2 ${isActive ? "border-[#4C5FAB] bg-[#4C5FAB]/10" : "border-gray-200 bg-white"}`}
                            >
                                <Text
                                    className={`text-xs font-kumbh ${isActive ? "font-kumbhBold text-[#4C5FAB]" : "text-gray-700"}`}
                                >
                                    {option}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View className="mb-3">
                <Text className="mb-1.5 text-[13px] font-kumbhBold text-gray-700">
                    Company
                </Text>
                <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Filter by company"
                    value={draftCompanyFilter}
                    onChangeText={setDraftCompanyFilter}
                />
            </View>

            <View className="mb-3">
                <Text className="mb-1.5 text-[13px] font-kumbhBold text-gray-700">
                    Recruiter
                </Text>
                <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Filter by recruiter"
                    value={draftRecruiterFilter}
                    onChangeText={setDraftRecruiterFilter}
                />
            </View>

            <View className="mt-2 flex-row items-center justify-between border-t border-gray-100 pt-4">
                <Pressable
                    onPress={onClear}
                    className="h-11 items-center justify-center rounded-xl border border-gray-200 px-4"
                >
                    <Text className="font-kumbh text-gray-700">Clear</Text>
                </Pressable>
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={onClose}
                        className="h-11 items-center justify-center rounded-xl border border-gray-200 px-4"
                    >
                        <Text className="font-kumbh text-gray-700">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={onApply}
                        className="h-11 items-center justify-center rounded-xl bg-[#4C5FAB] px-5"
                    >
                        <Text className="font-kumbhBold text-white">Apply</Text>
                    </Pressable>
                </View>
            </View>

            <View className="h-3" />
        </BottomSheetModal>
    );
}
