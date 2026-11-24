import * as Notifications from "expo-notifications";
import {
    AlarmClock,
    AtSign,
    Briefcase,
    DollarSign,
    Gift,
    MessageSquare,
    Plus,
    Search,
    Users,
} from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Modal,
    Platform,
    SectionList,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    AppNotification,
    NotificationKind,
} from "@/redux/notifications/notification.types";
import { registerForPushNotificationsAsync } from "@/redux/notifications/notifications";
import {
    selectNotifications,
    selectNotificationsStatus,
} from "@/redux/notifications/notifications.slice";
import {
    fetchNotifications,
    sendMassNotification,
} from "@/redux/notifications/notifications.thunks";
import { selectUser } from "@/redux/user/user.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isAdminLikeRole } from "@/utils/roles";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import PlatformAdaptiveHeader from "./PlatformAdaptiveHeader";

function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return `just now`;
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    return `${days} days`;
}

function dateBucketLabel(date: Date) {
    const now = new Date();
    const one = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();
    const startOfGiven = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
    ).getTime();

    if (startOfGiven === startOfToday) return "Today";
    if (startOfToday - startOfGiven === one) return "Yesterday";

    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function iconFor(kind: NotificationKind) {
    switch (kind) {
        case "project":
            return <Briefcase size={22} color="white" />;
        case "task":
            return <AlarmClock size={22} color="white" />;
        case "mention":
            return <AtSign size={22} color="white" />;
        case "finance":
            return <DollarSign size={22} color="white" />;
        case "channel":
            return <MessageSquare size={22} color="white" />;
        case "mass":
            return <Users size={22} color="white" />;
        case "birthday":
            return <Gift size={22} color="white" />;
        default:
            return <Briefcase size={22} color="white" />;
    }
}

interface MassNotificationModalProps {
    visible: boolean;
    onClose: () => void;
    onSend: (title: string, message: string) => void;
}

function MassNotificationModal({
    visible,
    onClose,
    onSend,
}: MassNotificationModalProps) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");

    const handleSend = () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert("Error", "Please fill in both title and message");
            return;
        }
        onSend(title.trim(), message.trim());
        setTitle("");
        setMessage("");
        onClose();
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View className="flex-1 justify-end bg-black/50">
                <View className="rounded-t-[28px] border-t border-gray-100 bg-white p-6">
                    <View className="mb-4 items-center">
                        <View className="h-1.5 w-11 rounded-full bg-gray-200" />
                    </View>
                    <Text className="mb-4 font-kumbhBold text-xl text-[#111827]">
                        Send Mass Notification
                    </Text>

                    <TextInput
                        placeholder="Notification Title"
                        placeholderTextColor="#9CA3AF"
                        value={title}
                        onChangeText={setTitle}
                        className="mb-3 rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3.5 font-kumbh text-[#111827]"
                    />

                    <TextInput
                        placeholder="Notification Message"
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                        className="mb-4 h-28 rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 py-3.5 font-kumbh text-[#111827]"
                    />

                    <View className="flex-row justify-end gap-2.5">
                        <TouchableOpacity
                            onPress={onClose}
                            className="rounded-2xl border border-gray-200 bg-[#F5F7FB] px-5 py-3"
                        >
                            <Text className="font-kumbhBold text-gray-700">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSend}
                            className="rounded-2xl bg-primary px-5 py-3"
                        >
                            <Text className="font-kumbhBold text-white">
                                Send
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

/**
 * Lightweight shimmer/skeleton without extra deps.
 * Uses a pulsing opacity animation.
 */
function NotificationsSkeleton() {
    const pulse = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 0.9,
                    duration: 700,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 0.35,
                    duration: 700,
                    easing: Easing.inOut(Easing.quad),
                    useNativeDriver: true,
                }),
            ]),
        );
        anim.start();
        return () => anim.stop();
    }, [pulse]);

    const Row = () => (
        <View className="mb-2.5 flex-row items-start rounded-[20px] border border-gray-100 bg-white p-4">
            <Animated.View
                style={{ opacity: pulse }}
                className="mr-3 h-11 w-11 rounded-2xl bg-gray-200"
            />
            <View className="flex-1">
                <Animated.View
                    style={{ opacity: pulse }}
                    className="mb-2 h-4 w-3/5 rounded bg-gray-200"
                />
                <Animated.View
                    style={{ opacity: pulse }}
                    className="mb-2 h-3 w-full rounded bg-gray-200"
                />
                <Animated.View
                    style={{ opacity: pulse }}
                    className="h-3 w-2/5 rounded bg-gray-200"
                />
            </View>
        </View>
    );

    const SectionHeader = () => (
        <View className="px-1 py-2">
            <Animated.View
                style={{ opacity: pulse }}
                className="h-3 w-28 rounded bg-gray-200"
            />
        </View>
    );

    return (
        <View>
            <SectionHeader />
            <Row />
            <Row />
            <Row />
            <SectionHeader />
            <Row />
            <Row />
            <Row />
        </View>
    );
}

export default function NotificationsScreen() {
    const isIOS = Platform.OS === "ios";

    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const notifications = useAppSelector(selectNotifications);
    const status = useAppSelector(selectNotificationsStatus);

    const [query, setQuery] = useState("");
    const [modalVisible, setModalVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const notifListener = useRef<Notifications.Subscription | null>(null);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    useEffect(() => {
        (async () => {
            await registerForPushNotificationsAsync();
            notifListener.current =
                Notifications.addNotificationReceivedListener((n) => {
                    const data = n.request.content.data as
                        | Partial<AppNotification>
                        | undefined;

                    const newNotif: AppNotification = {
                        id: String(
                            data?.id ??
                                n.request.identifier ??
                                `${Date.now()}-${Math.random()}`,
                        ),
                        kind: (data?.kind as NotificationKind) || "channel",
                        title:
                            data?.title ||
                            n.request.content.title ||
                            "New Update",
                        message: data?.message || n.request.content.body || "",
                        createdAt: new Date().toISOString(),
                    };

                    dispatch({
                        type: "notifications/addNotification",
                        payload: newNotif,
                    });
                });
        })();

        return () => {
            notifListener.current?.remove();
        };
    }, [dispatch]);

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.resolve(dispatch(fetchNotifications()));
        } finally {
            setRefreshing(false);
        }
    };

    const isInitialLoading =
        status === "loading" && (notifications?.length ?? 0) === 0;

    const normalized = useMemo(() => {
        return (notifications ?? []).map((n: any, idx: number) => ({
            ...n,
            id: String(
                n.id ??
                    n._id ??
                    n.uuid ??
                    `${n.createdAt ?? "no-date"}-${n.kind ?? "no-kind"}-${idx}`,
            ),
        })) as AppNotification[];
    }, [notifications]);

    // Filter by search only
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        const base = (normalized ?? []).filter((n) => {
            if (!q) return true;
            return (
                (n.title ?? "").toLowerCase().includes(q) ||
                (n.message ?? "").toLowerCase().includes(q)
            );
        });

        const map = new Map<string, AppNotification[]>();
        base.forEach((n) => {
            const label = dateBucketLabel(new Date(n.createdAt));
            if (!map.has(label)) map.set(label, []);
            map.get(label)!.push(n);
        });

        // Optional: ensure newest first inside each section
        const sections = Array.from(map.entries()).map(([title, data]) => ({
            title,
            data: data.sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            ),
        }));

        return sections;
    }, [notifications, query]);

    const handleSendMass = (title: string, message: string) => {
        dispatch(sendMassNotification({ title, message }));
    };

    const isAdmin = isAdminLikeRole(user?.role);

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-[#F5F7FB] px-4"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <PlatformAdaptiveHeader
                title="Notifications"
                backgroundColor="#F5F7FB"
            />

            {/* Search */}
            <View className="py-3">
                <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 bg-white px-3.5">
                    <Search size={18} color="#6B7280" />
                    <TextInput
                        placeholder="Search notifications..."
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={setQuery}
                        className="ml-2 h-full flex-1 font-kumbh text-base text-[#111827]"
                    />
                </View>
            </View>

            {/* Loading shimmer (initial load) */}
            {isInitialLoading ? (
                <NotificationsSkeleton />
            ) : (
                <View className="flex-1">
                    <SectionList
                        className="flex-1"
                        sections={filtered}
                        contentContainerStyle={{ paddingBottom: 84 }}
                        keyExtractor={(item, index) =>
                            String(
                                item.id ??
                                    `${item.createdAt ?? "no-date"}-${index}`,
                            )
                        }
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        renderSectionHeader={({ section: { title } }) => (
                            <View className="bg-[#F5F7FB] px-1 py-2">
                                <Text className="font-kumbhBold text-xs uppercase tracking-[1.5px] text-gray-500">
                                    {title}
                                </Text>
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <View className="mb-2.5 flex-row items-start rounded-[20px] border border-gray-100 bg-white p-4">
                                <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                                    {iconFor(item.kind)}
                                </View>
                                <View className="flex-1">
                                    <Text className="mb-0.5 font-kumbhBold text-base text-[#111827]">
                                        {item.title}
                                    </Text>
                                    <Text className="mb-1 font-kumbh text-sm leading-5 text-gray-600">
                                        {item.message}
                                    </Text>
                                    <Text className="font-kumbh text-xs text-gray-400">
                                        {timeAgo(item.createdAt)}
                                    </Text>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View className="mt-6 items-center justify-center rounded-[24px] border border-gray-100 bg-white px-6 py-12">
                                <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                                    <MessageSquare size={22} color="#4C5FAB" />
                                </View>
                                <Text className="mb-1 font-kumbhBold text-base text-[#111827]">
                                    No notifications
                                </Text>
                                <Text className="text-center font-kumbh text-sm text-gray-500">
                                    {query.trim()
                                        ? "No results match your search."
                                        : "When something important happens, you will see it here."}
                                </Text>
                            </View>
                        }
                    />
                </View>
            )}

            {/* FAB for Admin */}
            {isAdmin && (
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
                >
                    <Plus size={24} color="white" />
                </TouchableOpacity>
            )}

            <MassNotificationModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSend={handleSendMass}
            />
        </SafeAreaView>
    );
}
