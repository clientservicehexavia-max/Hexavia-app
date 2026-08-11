import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import CandidateCard from "@/components/recruitment/CandidateCard";
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
import { canAddCandidate } from "@/utils/recruitmentPermissions";
import { normalizeRole } from "@/utils/roles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Filter as FilterIcon, Plus, Search, X } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATUS_OPTIONS = [
    "All",
    "New",
    "Interview 1",
    "Interview 2",
    "Physical Interview",
    "Offered",
    "Employed",
] as const;

export default function RecruitmentCandidatesAggregateScreen() {
    const isIOS = Platform.OS === "ios";
    const router = useRouter();
    const params = useLocalSearchParams<{ status?: string }>();
    const dispatch = useAppDispatch();
    const recruitments = useAppSelector(selectRecruitments);
    const loading = useAppSelector(selectRecruitmentLoading);
    const error = useAppSelector(selectRecruitmentError);
    const role = useAppSelector((state: RootState) => state.auth.user?.role);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const initialStatusFilter = STATUS_OPTIONS.includes(
        (params.status as (typeof STATUS_OPTIONS)[number]) || "All",
    )
        ? ((params.status as (typeof STATUS_OPTIONS)[number]) ?? "All")
        : "All";
    const [query, setQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [showCampaignPicker, setShowCampaignPicker] = useState(false);
    const [statusFilter, setStatusFilter] =
        useState<(typeof STATUS_OPTIONS)[number]>(initialStatusFilter);
    const [campaignFilter, setCampaignFilter] = useState("");
    const [companyFilter, setCompanyFilter] = useState("");
    const [recruiterFilter, setRecruiterFilter] = useState("");
    const [draftStatusFilter, setDraftStatusFilter] =
        useState<(typeof STATUS_OPTIONS)[number]>(initialStatusFilter);
    const [draftCampaignFilter, setDraftCampaignFilter] = useState("");
    const [draftCompanyFilter, setDraftCompanyFilter] = useState("");
    const [draftRecruiterFilter, setDraftRecruiterFilter] = useState("");

    useEffect(() => {
        dispatch(fetchRecruitments({ page: 1, limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        setStatusFilter(initialStatusFilter);
        setDraftStatusFilter(initialStatusFilter);
    }, [initialStatusFilter]);

    const visibleRecruitments = useMemo(() => {
        const recruiterOnly = normalizeRole(role) === "staff";

        return recruitments.filter((recruitment) =>
            canSeeRecruitment(recruitment, recruiterOnly, currentUser),
        );
    }, [recruitments, role, currentUser]);

    const candidates = useMemo(() => {
        return visibleRecruitments.flatMap((recruitment) => {
            return (recruitment.candidates || []).flatMap((candidate) => {
                if (!candidate._id || !recruitment._id) return [];
                return [
                    {
                        ...candidate,
                        recruitmentId: recruitment._id,
                        recruitmentName: recruitment.position || "Recruitment",
                        clientName: recruitment.clientName || "No company",
                    },
                ];
            });
        });
    }, [visibleRecruitments]);

    const campaignOptions = useMemo(() => {
        return visibleRecruitments
            .filter((recruitment) => recruitment._id)
            .map((recruitment) => ({
                id: recruitment._id as string,
                title: recruitment.position || "Recruitment",
                company: recruitment.clientName || "No company",
                status: recruitment.status || "Active",
            }));
    }, [visibleRecruitments]);

    const activeFilterCount = useMemo(() => {
        return [
            statusFilter !== "All" ? statusFilter : undefined,
            campaignFilter,
            companyFilter,
            recruiterFilter,
        ].filter((value) => {
            if (typeof value === "string") {
                return value.trim().length > 0;
            }
            return Boolean(value);
        }).length;
    }, [statusFilter, campaignFilter, companyFilter, recruiterFilter]);

    const filteredCandidates = useMemo(() => {
        return candidates.filter((candidate) => {
            const candidateStatus =
                candidate.currentStage || candidate.overallStatus || "New";
            const haystack = [
                candidate.fullName,
                candidate.email,
                candidate.recruiter,
                candidate.recruitmentName,
                candidate.clientName,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            const matchesQuery =
                !query.trim() || haystack.includes(query.trim().toLowerCase());
            const matchesStatus =
                statusFilter === "All" || candidateStatus === statusFilter;
            const matchesCampaign =
                !campaignFilter ||
                candidate.recruitmentName
                    .toLowerCase()
                    .includes(campaignFilter.toLowerCase());
            const matchesCompany =
                !companyFilter ||
                candidate.clientName
                    .toLowerCase()
                    .includes(companyFilter.toLowerCase());
            const matchesRecruiter =
                !recruiterFilter ||
                (candidate.recruiter || "")
                    .toLowerCase()
                    .includes(recruiterFilter.toLowerCase());

            return (
                matchesQuery &&
                matchesStatus &&
                matchesCampaign &&
                matchesCompany &&
                matchesRecruiter
            );
        });
    }, [
        candidates,
        query,
        statusFilter,
        campaignFilter,
        companyFilter,
        recruiterFilter,
    ]);

    const openFilters = () => {
        setDraftStatusFilter(statusFilter);
        setDraftCampaignFilter(campaignFilter);
        setDraftCompanyFilter(companyFilter);
        setDraftRecruiterFilter(recruiterFilter);
        setShowFilters(true);
    };

    const applyFilters = () => {
        setStatusFilter(draftStatusFilter);
        setCampaignFilter(draftCampaignFilter.trim());
        setCompanyFilter(draftCompanyFilter.trim());
        setRecruiterFilter(draftRecruiterFilter.trim());
        setShowFilters(false);
    };

    const clearFilters = () => {
        setStatusFilter("All");
        setCampaignFilter("");
        setCompanyFilter("");
        setRecruiterFilter("");
        setDraftStatusFilter("All");
        setDraftCampaignFilter("");
        setDraftCompanyFilter("");
        setDraftRecruiterFilter("");
        setShowFilters(false);
    };

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader
                title="Candidates"
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
                        {canAddCandidate(role) ? (
                            <Pressable
                                onPress={() => setShowCampaignPicker(true)}
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
                <View className="mb-4 flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-1">
                    <Search size={18} color="#6B7280" />
                    <TextInput
                        className="ml-2 flex-1 h-9 font-kumbh text-gray-700"
                        placeholder="Search candidate, company, campaign"
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {loading && !filteredCandidates.length ? (
                    <View className="py-8">
                        <ActivityIndicator color="#4C5FAB" />
                    </View>
                ) : null}

                {error ? (
                    <Text className="mb-3 text-sm text-red-500">{error}</Text>
                ) : null}

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

                <FlatList
                    data={filteredCandidates}
                    keyExtractor={(item, index) =>
                        item._id || `${item.fullName}-${index}`
                    }
                    renderItem={({ item }) => (
                        <CandidateCard
                            fullName={item.fullName}
                            clientName={item.clientName}
                            recruitmentName={item.recruitmentName}
                            recruiter={item.recruiter}
                            email={item.email}
                            updatedAt={item.updatedAt}
                            status={
                                item.currentStage || item.overallStatus || "New"
                            }
                            onPress={() => {
                                if (!item._id) return;
                                router.push({
                                    pathname:
                                        "/(admin)/recruitment/[id]/candidate/[candidateId]",
                                    params: {
                                        id: item.recruitmentId,
                                        candidateId: item._id,
                                    },
                                });
                            }}
                        />
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text className="py-8 text-center text-sm text-gray-500">
                            No candidates found
                        </Text>
                    }
                />
            </View>

            <CandidatesFilterModal
                visible={showFilters}
                activeCount={activeFilterCount}
                draftStatusFilter={draftStatusFilter}
                draftCampaignFilter={draftCampaignFilter}
                draftCompanyFilter={draftCompanyFilter}
                draftRecruiterFilter={draftRecruiterFilter}
                onClose={() => setShowFilters(false)}
                onApply={applyFilters}
                onClear={clearFilters}
                onStatusChange={setDraftStatusFilter}
                onCampaignChange={setDraftCampaignFilter}
                onCompanyChange={setDraftCompanyFilter}
                onRecruiterChange={setDraftRecruiterFilter}
            />

            <CampaignPickerModal
                visible={showCampaignPicker}
                campaigns={campaignOptions}
                onClose={() => setShowCampaignPicker(false)}
                onSelect={(campaignId) => {
                    setShowCampaignPicker(false);
                    router.push({
                        pathname: "/(admin)/recruitment/[id]/candidate/create",
                        params: { id: campaignId },
                    });
                }}
            />
        </SafeAreaView>
    );
}

function CampaignPickerModal({
    visible,
    campaigns,
    onClose,
    onSelect,
}: {
    visible: boolean;
    campaigns: {
        id: string;
        title: string;
        company: string;
        status: string;
    }[];
    onClose: () => void;
    onSelect: (campaignId: string) => void;
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
                        Select Campaign
                    </Text>
                    <Text className="mt-1 text-xs font-kumbh text-gray-500">
                        Choose a campaign to add a candidate
                    </Text>
                </View>
                <Pressable
                    onPress={onClose}
                    className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                    <X size={17} color="#374151" />
                </Pressable>
            </View>

            {campaigns.length ? (
                <FlatList
                    data={campaigns}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 8 }}
                    renderItem={({ item }) => (
                        <Pressable
                            onPress={() => onSelect(item.id)}
                            className="mb-2 rounded-xl border border-gray-200 bg-white px-3 py-3"
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1 pr-3">
                                    <Text
                                        className="text-sm font-kumbhBold text-gray-900"
                                        numberOfLines={1}
                                    >
                                        {item.title}
                                    </Text>
                                    <Text
                                        className="mt-1 text-xs font-kumbh text-gray-600"
                                        numberOfLines={1}
                                    >
                                        {item.company}
                                    </Text>
                                </View>
                                <View className="rounded-full bg-slate-100 px-2.5 py-1">
                                    <Text className="text-[11px] font-kumbh text-slate-700">
                                        {item.status}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    )}
                />
            ) : (
                <Text className="py-4 text-sm font-kumbh text-gray-500">
                    No campaigns available.
                </Text>
            )}

            <View className="h-2" />
        </BottomSheetModal>
    );
}

function CandidatesFilterModal({
    visible,
    activeCount,
    draftStatusFilter,
    draftCampaignFilter,
    draftCompanyFilter,
    draftRecruiterFilter,
    onClose,
    onApply,
    onClear,
    onStatusChange,
    onCampaignChange,
    onCompanyChange,
    onRecruiterChange,
}: {
    visible: boolean;
    activeCount: number;
    draftStatusFilter: (typeof STATUS_OPTIONS)[number];
    draftCampaignFilter: string;
    draftCompanyFilter: string;
    draftRecruiterFilter: string;
    onClose: () => void;
    onApply: () => void;
    onClear: () => void;
    onStatusChange: (value: (typeof STATUS_OPTIONS)[number]) => void;
    onCampaignChange: (value: string) => void;
    onCompanyChange: (value: string) => void;
    onRecruiterChange: (value: string) => void;
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
                        Filter Candidates
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
                >
                    <X size={17} color="#374151" />
                </Pressable>
            </View>

            <Field label="Status">
                <PillGroup
                    options={STATUS_OPTIONS as unknown as string[]}
                    value={draftStatusFilter}
                    onChange={(value) =>
                        onStatusChange(value as (typeof STATUS_OPTIONS)[number])
                    }
                    scrollable
                />
            </Field>

            <Field label="Campaign">
                <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Filter by campaign"
                    value={draftCampaignFilter}
                    onChangeText={onCampaignChange}
                />
            </Field>

            <Field label="Company">
                <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Filter by company"
                    value={draftCompanyFilter}
                    onChangeText={onCompanyChange}
                />
            </Field>

            <Field label="Recruiter">
                <TextInput
                    className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    placeholder="Filter by recruiter"
                    value={draftRecruiterFilter}
                    onChangeText={onRecruiterChange}
                />
            </Field>

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

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-3">
            <Text className="mb-1.5 text-[13px] font-kumbhBold text-gray-700">
                {label}
            </Text>
            {children}
        </View>
    );
}

function PillGroup({
    options,
    value,
    onChange,
    scrollable,
}: {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    scrollable?: boolean;
}) {
    const content = (
        <View className="flex-row flex-wrap gap-2">
            {options.map((option) => {
                const active = option === value;
                return (
                    <Pressable
                        key={option}
                        onPress={() => onChange(option)}
                        className={`rounded-full border px-3.5 py-2 ${active ? "border-[#4C5FAB] bg-[#4C5FAB]/10" : "border-gray-200 bg-white"}`}
                    >
                        <Text
                            className={`text-xs font-kumbh ${active ? "font-kumbhBold text-[#4C5FAB]" : "text-gray-700"}`}
                        >
                            {option}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );

    if (!scrollable) return content;

    return (
        <FlatList
            data={options}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
            renderItem={({ item }) => {
                const active = item === value;
                return (
                    <Pressable
                        onPress={() => onChange(item)}
                        className={`rounded-full border px-3.5 py-2 ${active ? "border-[#4C5FAB] bg-[#4C5FAB]/10" : "border-gray-200 bg-white"}`}
                    >
                        <Text
                            className={`text-xs font-kumbh ${active ? "font-kumbhBold text-[#4C5FAB]" : "text-gray-700"}`}
                        >
                            {item}
                        </Text>
                    </Pressable>
                );
            }}
        />
    );
}

function canSeeRecruitment(
    recruitment: Recruitment,
    recruiterOnly: boolean,
    currentUser: RootState["auth"]["user"],
) {
    if (!recruiterOnly) return true;
    if (
        currentUser?._id &&
        recruitment.recruiterId === String(currentUser._id)
    ) {
        return true;
    }
    if (
        currentUser?.email &&
        (recruitment.recruiterName || "").toLowerCase() ===
            String(currentUser.email).toLowerCase()
    ) {
        return true;
    }
    return false;
}
