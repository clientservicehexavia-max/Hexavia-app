import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import BottomSheetModal from "@/components/ui/BottomSheetModal";
import CustomTextInput from "@/components/ui/CustomInput";
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
import {
    BriefcaseBusiness,
    Calendar,
    ChevronRight,
    Filter as FilterIcon,
    Plus,
    Search,
    UserRound,
    Users,
    X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
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
        const statusLabel = item.status || "Active";
        const isClosed = statusLabel.toLowerCase() === "closed";
        const isOnHold = statusLabel.toLowerCase() === "on hold";
        const statusBadgeClass = isClosed
            ? "bg-gray-100"
            : isOnHold
              ? "bg-amber-50"
              : "bg-emerald-50";
        const statusTextClass = isClosed
            ? "text-[#6B7280]"
            : isOnHold
              ? "text-amber-700"
              : "text-emerald-700";

        return (
            <Pressable
                onPress={() => {
                    if (!item._id) return;
                    router.push({
                        pathname: "/(admin)/recruitment/[id]",
                        params: { id: item._id },
                    });
                }}
                className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
            >
                <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 flex-row items-center pr-2">
                        <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                            <BriefcaseBusiness size={20} color="#4C5FAB" />
                        </View>
                        <View className="flex-1">
                            <Text
                                className="text-[15px] font-kumbhBold text-[#111827]"
                                numberOfLines={1}
                            >
                                {item.position}
                            </Text>
                            <Text
                                className="mt-0.5 text-xs font-kumbh text-[#6B7280]"
                                numberOfLines={1}
                            >
                                {companyName}
                            </Text>
                        </View>
                    </View>
                    <View
                        className={`rounded-full px-3 py-1.5 ${statusBadgeClass}`}
                    >
                        <Text
                            className={`text-[11px] font-kumbhBold ${statusTextClass}`}
                        >
                            {statusLabel}
                        </Text>
                    </View>
                </View>

                <View className="mt-3 flex-row flex-wrap gap-2">
                    <View className="flex-row items-center rounded-full bg-[#EEF2FF] px-3 py-1.5">
                        <UserRound size={13} color="#4C5FAB" />
                        <Text className="ml-1.5 text-xs font-kumbhBold text-[#3341A3]">
                            {item.recruiterName || "—"}
                        </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-[#F5F7FB] px-3 py-1.5">
                        <Users size={13} color="#6B7280" />
                        <Text className="ml-1.5 text-xs font-kumbhBold text-[#374151]">
                            {item.candidates?.length || 0} candidates
                        </Text>
                    </View>
                    <View className="flex-row items-center rounded-full bg-[#F5F7FB] px-3 py-1.5">
                        <Calendar size={13} color="#6B7280" />
                        <Text className="ml-1.5 text-xs font-kumbh text-[#6B7280]">
                            {item.createdAt
                                ? new Date(item.createdAt).toLocaleDateString()
                                : "—"}
                        </Text>
                    </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between border-t border-gray-100 pt-2.5">
                    <Text className="text-[11px] font-kumbh text-[#9CA3AF]">
                        Openings: {item.numberOfOpenings || 0}
                    </Text>
                    <View className="flex-row items-center gap-1">
                        <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                            View campaign
                        </Text>
                        <ChevronRight size={14} color="#4C5FAB" />
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
            className="flex-1 bg-[#F5F7FB]"
        >
            <PlatformAdaptiveHeader
                title="Campaigns"
                backgroundColor="#F5F7FB"
                headerRight={() => (
                    <View className="flex-row items-center gap-2">
                        <Pressable
                            onPress={openFilters}
                            className={`h-10 w-10 items-center justify-center rounded-full border ${
                                activeFilterCount
                                    ? "border-[#4C5FAB]/30 bg-[#EEF2FF]"
                                    : "border-gray-200 bg-white"
                            }`}
                            hitSlop={8}
                        >
                            <FilterIcon
                                size={18}
                                color={activeFilterCount ? "#4C5FAB" : "#374151"}
                            />
                            {activeFilterCount ? (
                                <View className="absolute right-1 top-1 h-4 min-w-4 items-center justify-center rounded-full bg-[#4C5FAB] px-1">
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
                                className="h-10 w-10 items-center justify-center rounded-full bg-[#4C5FAB]"
                                hitSlop={8}
                            >
                                <Plus size={20} color="#FFFFFF" />
                            </Pressable>
                        ) : null}
                    </View>
                )}
            />
            <View className="mt-3 flex-1 px-4">
                <View className="mb-4 h-14 flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
                    <Search size={18} color="#9CA3AF" />
                    <CustomTextInput
                        className="ml-2.5 flex-1 font-kumbh text-base text-[#111827]"
                        placeholder="Search position or company"
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query.length > 0 ? (
                        <Pressable
                            onPress={() => setQuery("")}
                            className="h-6 w-6 items-center justify-center rounded-full bg-gray-100"
                            hitSlop={8}
                        >
                            <X size={13} color="#6B7280" />
                        </Pressable>
                    ) : null}
                </View>

                {activeFilterCount ? (
                    <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-[#4C5FAB]/20 bg-[#EEF2FF] px-3.5 py-2.5">
                        <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                            {activeFilterCount} filter
                            {activeFilterCount > 1 ? "s" : ""} active
                        </Text>
                        <Pressable
                            onPress={clearFilters}
                            className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5"
                        >
                            <X size={13} color="#4C5FAB" />
                            <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                                Clear
                            </Text>
                        </Pressable>
                    </View>
                ) : null}

                {error ? (
                    <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3.5">
                        <Text className="text-sm font-kumbh text-red-700">
                            {error}
                        </Text>
                    </View>
                ) : null}

                {loading && !refreshing ? (
                    <View className="items-center py-10">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) =>
                            item._id || Math.random().toString()
                        }
                        renderItem={renderItem}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                tintColor="#4C5FAB"
                            />
                        }
                        ListEmptyComponent={
                            <View className="items-center rounded-[24px] border border-gray-100 bg-white px-6 py-10">
                                <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                    <BriefcaseBusiness
                                        size={22}
                                        color="#4C5FAB"
                                    />
                                </View>
                                <Text className="text-base font-kumbhBold text-[#111827]">
                                    No campaigns found
                                </Text>
                                <Text className="mt-1 text-center text-sm font-kumbh text-[#6B7280]">
                                    Try adjusting your search or filter criteria.
                                </Text>
                            </View>
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
                    <Text className="text-xl font-kumbhBold text-[#111827]">
                        Filter Campaigns
                    </Text>
                    <Text className="mt-1 text-xs font-kumbh text-[#6B7280]">
                        {activeCount
                            ? `${activeCount} active filter${activeCount > 1 ? "s" : ""}`
                            : "No filters applied"}
                    </Text>
                </View>
                <Pressable
                    onPress={onClose}
                    className="h-9 w-9 items-center justify-center rounded-full bg-[#F5F7FB]"
                    accessibilityLabel="Close filters"
                >
                    <X size={17} color="#374151" />
                </Pressable>
            </View>

            <View className="mb-3.5">
                <Text className="mb-2 text-xs font-kumbhBold text-[#374151]">
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
                                className={`rounded-full border px-3.5 py-2 ${isActive ? "border-[#4C5FAB] bg-[#4C5FAB]" : "border-gray-200 bg-[#F5F7FB]"}`}
                            >
                                <Text
                                    className={`text-xs font-kumbhBold ${isActive ? "text-white" : "text-[#374151]"}`}
                                >
                                    {option}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>

            <View className="mb-3.5">
                <Text className="mb-2 text-xs font-kumbhBold text-[#374151]">
                    Company
                </Text>
                <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4">
                    <CustomTextInput
                        className="font-kumbh text-sm text-[#111827]"
                        placeholder="Filter by company"
                        value={draftCompanyFilter}
                        onChangeText={setDraftCompanyFilter}
                    />
                </View>
            </View>

            <View className="mb-3.5">
                <Text className="mb-2 text-xs font-kumbhBold text-[#374151]">
                    Recruiter
                </Text>
                <View className="h-12 justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4">
                    <CustomTextInput
                        className="font-kumbh text-sm text-[#111827]"
                        placeholder="Filter by recruiter"
                        value={draftRecruiterFilter}
                        onChangeText={setDraftRecruiterFilter}
                    />
                </View>
            </View>

            <View className="mt-2 flex-row items-center justify-between border-t border-gray-100 pt-4">
                <Pressable
                    onPress={onClear}
                    className="h-12 items-center justify-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4"
                >
                    <Text className="font-kumbhBold text-sm text-[#374151]">
                        Clear
                    </Text>
                </Pressable>
                <View className="flex-row gap-3">
                    <Pressable
                        onPress={onClose}
                        className="h-12 items-center justify-center rounded-2xl border border-gray-200 bg-white px-4"
                    >
                        <Text className="font-kumbh text-sm text-[#374151]">
                            Cancel
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={onApply}
                        className="h-12 items-center justify-center rounded-2xl bg-[#4C5FAB] px-5"
                    >
                        <Text className="font-kumbhBold text-sm text-white">
                            Apply
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View className="h-3" />
        </BottomSheetModal>
    );
}
