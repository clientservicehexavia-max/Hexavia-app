import {
    BirthdayPerson,
    BirthdayScope,
    BirthdaySummary,
    fetchBirthdaySummary,
} from "@/api/birthdays";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { formatBirthdayDate } from "@/utils/birthday";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Cake, Gift } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const scopes: Array<{ key: BirthdayScope; label: string }> = [
    { key: "all", label: "All" },
    { key: "clients", label: "Clients" },
    { key: "partners", label: "Partners" },
    { key: "team", label: "Team" },
];

const KIND_STYLES: Record<
    BirthdayPerson["kind"],
    { bg: string; text: string; label: string }
> = {
    client: { bg: "bg-[#EEF2FF]", text: "text-primary", label: "Client" },
    partner: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        label: "Partner",
    },
    team: { bg: "bg-amber-50", text: "text-amber-800", label: "Team" },
};

function countdownLabel(daysUntil: number) {
    if (daysUntil <= 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    return `In ${daysUntil}d`;
}

function BirthdayRow({
    person,
    isTodaySection = false,
}: {
    person: BirthdayPerson;
    isTodaySection?: boolean;
}) {
    const isToday = person.daysUntil <= 0 || isTodaySection;
    const kindStyle = KIND_STYLES[person.kind] ?? KIND_STYLES.team;

    return (
        <View
            className={`flex-row items-center rounded-[22px] border p-3.5 ${
                isToday
                    ? "border-amber-200 bg-white"
                    : "border-gray-100 bg-white"
            }`}
        >
            <View
                className={`mr-3.5 h-12 w-14 items-center justify-center rounded-2xl px-1 ${
                    isToday ? "bg-amber-100" : "bg-[#EEF2FF]"
                }`}
            >
                <Text
                    className={`text-center text-[11px] font-kumbhBold ${
                        isToday ? "text-amber-900" : "text-primary"
                    }`}
                    numberOfLines={2}
                >
                    {formatBirthdayDate(person.occurrence)}
                </Text>
            </View>

            <View className="flex-1 mr-2">
                <Text
                    className="font-kumbhBold text-[15px] text-[#111827]"
                    numberOfLines={1}
                >
                    {person.name}
                </Text>
                <View className="mt-1 flex-row items-center">
                    <View className={`rounded-full px-2.5 py-0.5 ${kindStyle.bg}`}>
                        <Text
                            className={`text-[11px] font-kumbhBold ${kindStyle.text}`}
                        >
                            {kindStyle.label}
                        </Text>
                    </View>
                </View>
            </View>

            <View
                className={`rounded-full px-3 py-1 ${
                    isToday
                        ? "bg-amber-100 border border-amber-200"
                        : person.daysUntil === 1
                          ? "bg-[#EEF2FF]"
                          : "bg-[#F5F7FB]"
                }`}
            >
                <Text
                    className={`text-[11px] font-kumbhBold ${
                        isToday
                            ? "text-amber-800"
                            : person.daysUntil === 1
                              ? "text-primary"
                              : "text-[#6B7280]"
                    }`}
                >
                    {countdownLabel(person.daysUntil)}
                </Text>
            </View>
        </View>
    );
}

function BirthdaySection({
    title,
    people,
    highlighted = false,
}: {
    title: string;
    people: BirthdayPerson[];
    highlighted?: boolean;
}) {
    if (!people.length) return null;
    const isToday = title === "TODAY";

    return (
        <View className="mb-5">
            <View className="mb-2.5 flex-row items-center justify-between px-1">
                <Text
                    className={`text-xs font-kumbhBold uppercase tracking-wider ${
                        highlighted || isToday
                            ? "text-amber-700"
                            : "text-[#6B7280]"
                    }`}
                >
                    {title}
                </Text>
                <View
                    className={`rounded-full px-2.5 py-0.5 ${
                        highlighted || isToday ? "bg-amber-100" : "bg-[#EEF2FF]"
                    }`}
                >
                    <Text
                        className={`text-[11px] font-kumbhBold ${
                            highlighted || isToday
                                ? "text-amber-800"
                                : "text-primary"
                        }`}
                    >
                        {people.length}
                    </Text>
                </View>
            </View>
            <View className="gap-2.5">
                {people.map((person) => (
                    <BirthdayRow
                        key={`${person.kind}-${person._id}`}
                        person={person}
                        isTodaySection={isToday}
                    />
                ))}
            </View>
        </View>
    );
}

export default function BirthdayCentreScreen() {
    const isIOS = Platform.OS === "ios";
    const params = useLocalSearchParams<{
        filter?: string;
        section?: string;
    }>();
    const initialScope: BirthdayScope =
        params.filter === "clients" ||
        params.filter === "partners" ||
        params.filter === "team"
            ? params.filter
            : "all";
    const [scope, setScope] = useState<BirthdayScope>(initialScope);
    const [summary, setSummary] = useState<BirthdaySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => setScope(initialScope), [initialScope]);

    const load = useCallback(
        async (asRefresh = false) => {
            if (asRefresh) setRefreshing(true);
            else setLoading(true);
            try {
                setSummary(await fetchBirthdaySummary(scope));
            } catch {
                setSummary(null);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [scope],
    );

    useFocusEffect(
        useCallback(() => {
            void load();
        }, [load]),
    );

    const hasBirthdays = useMemo(() => Boolean(summary?.all.length), [summary]);
    const todayCount = summary?.counts.today ?? 0;
    const weekCount = summary?.counts.week ?? 0;
    const monthCount = summary?.counts.month ?? 0;

    return (
        <SafeAreaView
            className="flex-1 bg-[#F5F7FB]"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader
                title="Birthday Centre"
                backgroundColor="#F5F7FB"
            />
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-4 pb-10 pt-2"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void load(true)}
                    />
                }
            >
                {/* Hero Overview Card */}
                <View className="mb-4 rounded-[28px] bg-primary p-5">
                    <View className="flex-row items-center">
                        <View className="mr-3.5 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                            <Cake size={22} color="#FDE68A" />
                        </View>
                        <View className="flex-1">
                            <Text className="font-kumbhBold text-[18px] text-white">
                                Upcoming Celebrations
                            </Text>
                            <Text className="mt-0.5 font-kumbh text-xs text-white/80">
                                {todayCount > 0
                                    ? `${todayCount} ${
                                          todayCount === 1
                                              ? "person is"
                                              : "people are"
                                      } celebrating today!`
                                    : "Keep track of client, partner & team birthdays."}
                            </Text>
                        </View>
                    </View>

                    <View className="mt-4 flex-row gap-2.5">
                        <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
                            <Text className="font-kumbh text-[11px] text-white/75">
                                Today
                            </Text>
                            <Text className="mt-0.5 font-kumbhBold text-lg text-white">
                                {todayCount}
                            </Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
                            <Text className="font-kumbh text-[11px] text-white/75">
                                This Week
                            </Text>
                            <Text className="mt-0.5 font-kumbhBold text-lg text-white">
                                {weekCount}
                            </Text>
                        </View>
                        <View className="flex-1 rounded-2xl bg-white/15 px-3 py-2.5">
                            <Text className="font-kumbh text-[11px] text-white/75">
                                This Month
                            </Text>
                            <Text className="mt-0.5 font-kumbhBold text-lg text-white">
                                {monthCount}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Scope Segmented Control */}
                <View className="mb-5 h-11 flex-row rounded-2xl border border-gray-200 bg-white p-1">
                    {scopes.map((item) => {
                        const active = scope === item.key;
                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => setScope(item.key)}
                                className={`flex-1 rounded-xl items-center justify-center ${
                                    active ? "bg-primary" : ""
                                }`}
                            >
                                <Text
                                    className={`text-xs font-kumbhBold ${
                                        active ? "text-white" : "text-[#6B7280]"
                                    }`}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {loading && !refreshing ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator color="#4C5FAB" />
                        <Text className="mt-2 font-kumbh text-sm text-[#6B7280]">
                            Loading birthdays…
                        </Text>
                    </View>
                ) : hasBirthdays && summary ? (
                    <>
                        <BirthdaySection
                            title="TODAY"
                            people={summary.today}
                            highlighted={params.section === "today"}
                        />
                        <BirthdaySection
                            title="THIS WEEK"
                            people={summary.thisWeek}
                        />
                        <BirthdaySection
                            title="THIS MONTH"
                            people={summary.thisMonth}
                        />
                        <BirthdaySection
                            title="UPCOMING"
                            people={summary.upcoming}
                        />
                    </>
                ) : (
                    <View className="mt-4 items-center rounded-[28px] border border-gray-100 bg-white px-6 py-12">
                        <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                            <Gift size={24} color="#D97706" />
                        </View>
                        <Text className="font-kumbhBold text-base text-[#111827]">
                            No birthdays coming up
                        </Text>
                        <Text className="mt-1 text-center font-kumbh text-sm text-[#6B7280] leading-5">
                            Birthdays appear here once clients, partners, or
                            team members have a date of birth.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
