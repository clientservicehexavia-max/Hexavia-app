import { ChevronRight, Mail, UserRound, Users } from "lucide-react-native";
import React from "react";
import { Pressable, Text, View } from "react-native";

type CandidateCardProps = {
    fullName: string;
    clientName?: string;
    recruitmentName?: string;
    recruiter?: string;
    email?: string;
    updatedAt?: string;
    status?: string;
    onPress: () => void;
};

export default function CandidateCard({
    fullName,
    clientName,
    recruitmentName,
    recruiter,
    email,
    updatedAt,
    status,
    onPress,
}: CandidateCardProps) {
    const stageText = status || "New";
    const stageTone = getStageTone(stageText);

    return (
        <Pressable
            onPress={onPress}
            className="mb-3 rounded-[24px] border border-gray-100 bg-white p-4 active:opacity-90"
        >
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 flex-row items-center pr-2">
                    <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                        <Text className="text-sm font-kumbhBold text-[#4C5FAB]">
                            {getInitials(fullName)}
                        </Text>
                    </View>
                    <View className="flex-1">
                        <Text
                            className="text-[15px] font-kumbhBold text-[#111827]"
                            numberOfLines={1}
                        >
                            {fullName}
                        </Text>
                        <Text
                            className="mt-0.5 text-xs font-kumbh text-[#6B7280]"
                            numberOfLines={1}
                        >
                            {clientName || "No company"}
                        </Text>
                    </View>
                </View>

                <View
                    className={`rounded-full px-3 py-1.5 ${stageTone.badge}`}
                >
                    <Text
                        className={`text-[11px] font-kumbhBold ${stageTone.text}`}
                    >
                        {stageText}
                    </Text>
                </View>
            </View>

            <View className="mt-3 flex-row flex-wrap gap-2">
                {recruitmentName ? (
                    <MetaPill
                        icon={<Users size={13} color="#4C5FAB" />}
                        value={recruitmentName}
                        tone="bg-[#EEF2FF]"
                        textTone="text-[#3341A3]"
                    />
                ) : null}
                <MetaPill
                    icon={<UserRound size={13} color="#0F766E" />}
                    value={recruiter || "—"}
                    tone="bg-emerald-50"
                    textTone="text-emerald-800"
                />
                <MetaPill
                    icon={<Mail size={13} color="#6B7280" />}
                    value={email || "—"}
                    tone="bg-[#F5F7FB]"
                    textTone="text-[#374151]"
                />
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-gray-100 pt-2.5">
                <Text className="text-[11px] font-kumbh text-[#9CA3AF]">
                    Updated {formatUpdatedAt(updatedAt)}
                </Text>
                <View className="flex-row items-center gap-1">
                    <Text className="text-xs font-kumbhBold text-[#4C5FAB]">
                        Details
                    </Text>
                    <ChevronRight size={14} color="#4C5FAB" />
                </View>
            </View>
        </Pressable>
    );
}

function getInitials(name: string) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function MetaPill({
    icon,
    value,
    tone,
    textTone = "text-slate-800",
}: {
    icon: React.ReactNode;
    value: string;
    tone: string;
    textTone?: string;
}) {
    return (
        <View
            className={`max-w-full flex-row items-center rounded-full px-3 py-1.5 ${tone}`}
        >
            <View className="mr-1.5">{icon}</View>
            <Text
                className={`shrink text-xs font-kumbhBold ${textTone}`}
                numberOfLines={1}
            >
                {value}
            </Text>
        </View>
    );
}

function formatUpdatedAt(value?: string) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString();
}

function getStageTone(status: string) {
    const normalized = status.toLowerCase();
    if (normalized.includes("offer") || normalized.includes("employed")) {
        return {
            badge: "bg-emerald-50",
            text: "text-emerald-700",
        };
    }
    if (normalized.includes("interview")) {
        return {
            badge: "bg-amber-50",
            text: "text-amber-700",
        };
    }
    return {
        badge: "bg-[#EEF2FF]",
        text: "text-[#3341A3]",
    };
}
