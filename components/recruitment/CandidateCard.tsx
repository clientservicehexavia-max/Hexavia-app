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
            className="mb-3 rounded-xl border border-slate-200 bg-white p-2.5"
        >
            <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 pr-3">
                    <Text
                        className="text-base font-kumbhBold text-slate-900"
                        numberOfLines={1}
                    >
                        {fullName}
                    </Text>
                    <Text
                        className="mt-1 text-xs font-kumbh text-slate-500"
                        numberOfLines={1}
                    >
                        {clientName || "No company"}
                    </Text>
                </View>

                <View className="items-end">
                    <View
                        className={`rounded-full px-3 py-1 ${stageTone.badge}`}
                    >
                        <Text
                            className={`text-[11px] font-kumbhBold ${stageTone.text}`}
                        >
                            {stageText}
                        </Text>
                    </View>
                    <View className="mt-2 flex-row items-center">
                        <Text className="mr-1 text-[11px] font-kumbh text-slate-400">
                            {formatUpdatedAt(updatedAt)}
                        </Text>
                        <ChevronRight size={14} color="#94A3B8" />
                    </View>
                </View>
            </View>

            <View className="mt-2 flex-row flex-wrap gap-2">
                {recruitmentName ? (
                    <MetaPill
                        icon={<Users size={14} color="#4F46E5" />}
                        value={recruitmentName}
                        tone="bg-indigo-50"
                    />
                ) : null}
                <MetaPill
                    icon={<UserRound size={14} color="#0F766E" />}
                    value={recruiter || "—"}
                    tone="bg-emerald-50"
                />
                <MetaPill
                    icon={<Mail size={14} color="#475569" />}
                    value={email || "—"}
                    tone="bg-slate-100"
                />
            </View>
        </Pressable>
    );
}

function MetaPill({
    icon,
    value,
    tone,
}: {
    icon: React.ReactNode;
    value: string;
    tone: string;
}) {
    return (
        <View
            className={`max-w-full flex-row items-center rounded-full px-3 py-2 ${tone}`}
        >
            <View className="mr-2">{icon}</View>
            <Text
                className="shrink text-xs font-kumbhBold text-slate-800"
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
