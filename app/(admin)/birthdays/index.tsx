import {
    BirthdayPerson,
    BirthdayScope,
    BirthdaySummary,
    fetchBirthdaySummary,
} from "@/api/birthdays";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { formatBirthdayDate } from "@/utils/birthday";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Gift } from "lucide-react-native";
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

function BirthdayRow({ person }: { person: BirthdayPerson }) {
    return (
        <View className="flex-row items-center rounded-xl border border-gray-100 bg-white px-3 py-3">
            <View className="mr-3 h-10 w-12 items-center justify-center rounded-xl bg-amber-50">
                <Text className="text-xs font-kumbhBold text-amber-800">
                    {formatBirthdayDate(person.occurrence)}
                </Text>
            </View>
            <View className="flex-1">
                <Text className="font-kumbhBold text-gray-900">
                    {person.name}
                </Text>
                <Text className="mt-0.5 text-xs font-kumbh capitalize text-gray-500">
                    {person.kind}
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
    return (
        <View className="mb-6">
            <Text
                className={`mb-2 text-xs font-kumbhBold tracking-widest ${highlighted ? "text-amber-700" : "text-gray-500"}`}
            >
                {title}
            </Text>
            <View className="gap-2">
                {people.map((person) => (
                    <BirthdayRow
                        key={`${person.kind}-${person._id}`}
                        person={person}
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

    return (
        <SafeAreaView
            className="flex-1 bg-white"
            edges={isIOS ? ["left", "right"] : ["top", "left", "right"]}
        >
            <PlatformAdaptiveHeader title="Birthday Centre" />
            <ScrollView
                className="flex-1"
                contentContainerClassName="px-4 pb-10 mt-3"
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void load(true)}
                    />
                }
            >
                <View className="mb-6 flex-row gap-2">
                    {scopes.map((item) => (
                        <Pressable
                            key={item.key}
                            onPress={() => setScope(item.key)}
                            className={`rounded-full border px-4 py-2 ${scope === item.key ? "border-[#4C5FAB] bg-[#4C5FAB]" : "border-gray-200 bg-white"}`}
                        >
                            <Text
                                className={`font-kumbhBold ${scope === item.key ? "text-white" : "text-gray-700"}`}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {loading ? (
                    <View className="py-20 items-center">
                        <ActivityIndicator color="#4C5FAB" />
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
                    <View className="mt-14 items-center rounded-2xl border border-dashed border-gray-200 px-6 py-10">
                        <View className="mb-3 h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                            <Gift size={24} color="#A16207" />
                        </View>
                        <Text className="font-kumbhBold text-gray-900">
                            No birthdays coming up.
                        </Text>
                        <Text className="mt-1 text-center font-kumbh text-sm text-gray-500">
                            Birthdays appear here once clients, partners, or
                            team members have a date of birth.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
