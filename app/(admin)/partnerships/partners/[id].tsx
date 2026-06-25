import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { selectAllDeals } from "@/redux/deal/deal.selectors";
import { fetchDeals } from "@/redux/deal/deal.thunks";
import {
    selectPartnerById,
    selectPartnerLoading,
} from "@/redux/partner/partner.selectors";
import {
    deletePartner,
    fetchPartnerById,
} from "@/redux/partner/partner.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { dialPhone, openEmail } from "@/utils/contact";
import { generatePartnerReportPdf } from "@/utils/partnershipReports";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    BriefcaseBusiness,
    Building2,
    Edit2,
    Mail,
    MapPin,
    Phone,
    Share2,
    Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
};

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <View className="mb-6">
            <Text className="mb-3 text-lg font-kumbhBold text-gray-900">
                {title}
            </Text>
            {children}
        </View>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <View className="flex-1 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <Text className="text-xs font-kumbh text-gray-500">{label}</Text>
            <Text className="mt-2 text-xl font-kumbhBold text-gray-900">
                {value}
            </Text>
        </View>
    );
}

function ContactRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
}) {
    const Wrapper = onPress ? Pressable : View;
    return (
        <Wrapper
            onPress={onPress}
            className="mb-2 flex-row items-center rounded-xl bg-gray-50 p-3"
        >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white">
                {icon}
            </View>
            <View className="flex-1">
                <Text className="text-xs font-kumbh text-gray-500">
                    {label}
                </Text>
                <Text
                    className={`mt-1 text-sm font-kumbh ${
                        onPress ? "text-[#4C5FAB]" : "text-gray-900"
                    }`}
                    numberOfLines={2}
                >
                    {value || "—"}
                </Text>
            </View>
        </Wrapper>
    );
}

export default function PartnerDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const dispatch = useAppDispatch();
    const isIOS = Platform.OS === "ios";

    const partnerId = params.id as string;
    const partner = useAppSelector((state) =>
        selectPartnerById(partnerId)(state),
    );
    const deals = useAppSelector(selectAllDeals);
    const loading = useAppSelector(selectPartnerLoading);

    const [deleting, setDeleting] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);

    useEffect(() => {
        if (partnerId && !partner) {
            dispatch(fetchPartnerById(partnerId));
        }
    }, [partnerId, partner, dispatch]);

    useEffect(() => {
        if (partnerId) {
            dispatch(fetchDeals({ partnerId, page: 1, limit: 100 }));
        }
    }, [partnerId, dispatch]);

    const handleDelete = () => {
        Alert.alert(
            "Delete Partner",
            `Are you sure you want to delete ${partner?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await dispatch(deletePartner(partnerId)).unwrap();
                            Alert.alert("Success", "Partner deleted");
                            router.back();
                        } catch {
                            Alert.alert("Error", "Failed to delete partner");
                        } finally {
                            setDeleting(false);
                        }
                    },
                    style: "destructive",
                },
            ],
        );
    };

    const handleGeneratePartnerReport = async () => {
        if (!partner) return;
        setGeneratingReport(true);
        try {
            await generatePartnerReportPdf(
                partner,
                deals.filter((deal) => deal.partnerId === partnerId),
            );
        } catch (err: any) {
            Alert.alert(
                "Report failed",
                err?.message || "Unable to generate partner report.",
            );
        } finally {
            setGeneratingReport(false);
        }
    };

    if (loading && !partner) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#4C5FAB" />
            </SafeAreaView>
        );
    }

    if (!partner) {
        return (
            <SafeAreaView className="flex-1 items-center justify-center bg-white">
                <Text className="text-gray-500">Partner not found</Text>
            </SafeAreaView>
        );
    }

    const dealLabel =
        (partner.dealCount ?? 0) === 1
            ? "1 deal"
            : `${partner.dealCount ?? 0} deals`;

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
        >
            <View className="flex-1 px-4">
                <PlatformAdaptiveHeader
                    title="Partner Details"
                    headerRight={({ tintColor }) => (
                        <View className="flex-row gap-2">
                            <Pressable
                                onPress={() =>
                                    router.push({
                                        pathname:
                                            "/(admin)/partnerships/partners/create",
                                        params: { partnerId },
                                    })
                                }
                                className="h-10 w-10 items-center justify-center rounded-full"
                            >
                                <Edit2 size={20} color={tintColor} />
                            </Pressable>
                            <Pressable
                                onPress={handleDelete}
                                disabled={deleting}
                                className="h-10 w-10 items-center justify-center rounded-full bg-red-500"
                            >
                                {deleting ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="white"
                                    />
                                ) : (
                                    <Trash2 size={20} color="white" />
                                )}
                            </Pressable>
                        </View>
                    )}
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View className="mb-5 rounded-2xl bg-blue-50 p-4">
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                                <Text
                                    className="text-3xl font-kumbhBold text-gray-900"
                                    numberOfLines={2}
                                >
                                    {partner.name}
                                </Text>
                                <Text
                                    className="mt-2 text-base font-kumbh text-gray-600"
                                    numberOfLines={2}
                                >
                                    {partner.company || "No company added"}
                                </Text>
                            </View>
                            <View
                                className={`rounded-full px-3 py-1 ${
                                    partner.status === "active"
                                        ? "bg-emerald-100"
                                        : "bg-slate-100"
                                }`}
                            >
                                <Text
                                    className={`text-sm font-kumbhBold ${
                                        partner.status === "active"
                                            ? "text-emerald-700"
                                            : "text-slate-700"
                                    }`}
                                >
                                    {partner.status}
                                </Text>
                            </View>
                        </View>

                        <View className="mt-4 flex-row flex-wrap gap-2">
                            {partner.partnerType ? (
                                <View className="flex-row items-center rounded-full bg-white px-3 py-1">
                                    <BriefcaseBusiness
                                        size={13}
                                        color="#4C5FAB"
                                    />
                                    <Text className="ml-1 text-sm font-kumbhBold text-[#4C5FAB]">
                                        {partner.partnerType}
                                    </Text>
                                </View>
                            ) : null}
                            {partner.industry ? (
                                <View className="flex-row items-center rounded-full bg-white px-3 py-1">
                                    <Building2 size={13} color="#4C5FAB" />
                                    <Text className="ml-1 text-sm font-kumbhBold text-[#4C5FAB]">
                                        {partner.industry}
                                    </Text>
                                </View>
                            ) : null}
                        </View>

                        <Pressable
                            onPress={handleGeneratePartnerReport}
                            disabled={generatingReport}
                            className="mt-4 h-12 flex-row items-center justify-center rounded-xl bg-white"
                        >
                            {generatingReport ? (
                                <ActivityIndicator
                                    size="small"
                                    color="#4C5FAB"
                                />
                            ) : (
                                <Share2 size={18} color="#4C5FAB" />
                            )}
                            <Text className="ml-2 text-sm font-kumbhBold text-[#4C5FAB]">
                                {generatingReport
                                    ? "Generating..."
                                    : "Generate Partner Report"}
                            </Text>
                        </Pressable>
                    </View>

                    <View className="mb-6 flex-row gap-3">
                        <StatCard label="Deals" value={dealLabel} />
                        <StatCard
                            label="Documents"
                            value={String(partner.documents?.length ?? 0)}
                        />
                    </View>

                    <Section title="Contact Information">
                        <ContactRow
                            icon={<Mail size={18} color="#4C5FAB" />}
                            label="Email"
                            value={partner.contactEmail}
                            onPress={
                                partner.contactEmail
                                    ? () => openEmail(partner.contactEmail!)
                                    : undefined
                            }
                        />
                        <ContactRow
                            icon={<Phone size={18} color="#4C5FAB" />}
                            label="Phone"
                            value={partner.contactPhone}
                            onPress={
                                partner.contactPhone
                                    ? () => dialPhone(partner.contactPhone!)
                                    : undefined
                            }
                        />
                        <ContactRow
                            icon={<MapPin size={18} color="#4C5FAB" />}
                            label="Address"
                            value={partner.address}
                        />
                        <ContactRow
                            icon={<Mail size={18} color="#4C5FAB" />}
                            label="Alternate Email"
                            value={partner.alternateContactEmail}
                            onPress={
                                partner.alternateContactEmail
                                    ? () =>
                                          openEmail(
                                              partner.alternateContactEmail!,
                                          )
                                    : undefined
                            }
                        />
                        <ContactRow
                            icon={<Phone size={18} color="#4C5FAB" />}
                            label="Alternate Phone"
                            value={partner.alternateContactPhone}
                            onPress={
                                partner.alternateContactPhone
                                    ? () =>
                                          dialPhone(
                                              partner.alternateContactPhone!,
                                          )
                                    : undefined
                            }
                        />
                    </Section>

                    {partner.engagementTags?.length ? (
                        <Section title="Engagement Tags">
                            <View className="flex-row flex-wrap gap-2">
                                {partner.engagementTags.map((tag) => (
                                    <View
                                        key={tag}
                                        className="rounded-full bg-blue-100 px-3 py-1"
                                    >
                                        <Text className="text-sm font-kumbhBold text-blue-800">
                                            {tag}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </Section>
                    ) : null}

                    <Section title="Notes">
                        <View className="rounded-xl bg-gray-50 p-4">
                            <Text className="font-kumbh text-gray-700">
                                {partner.notes || "No notes added."}
                            </Text>
                        </View>
                    </Section>

                    <Section title="Metadata">
                        <View className="rounded-xl bg-gray-50 p-4">
                            <Text className="mb-2 text-sm font-kumbh text-gray-600">
                                Created: {formatDate(partner.createdAt)}
                            </Text>
                            <Text className="text-sm font-kumbh text-gray-600">
                                Last Updated: {formatDate(partner.updatedAt)}
                            </Text>
                        </View>
                    </Section>

                    <View className="mb-10" />
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}
