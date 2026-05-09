import * as Notifications from "expo-notifications";
import {
    AlarmClock,
    AtSign,
    Briefcase,
    DollarSign,
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
                <View className="bg-white rounded-t-3xl p-6">
                    <Text className="text-xl font-bold mb-4">
                        Send Mass Notification
                    </Text>

                    <TextInput
                        placeholder="Notification Title"
                        value={title}
                        onChangeText={setTitle}
                        className="border border-gray-300 rounded-lg p-3 mb-3"
                    />

                    <TextInput
                        placeholder="Notification Message"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={4}
                        className="border border-gray-300 rounded-lg p-3 mb-4 h-24"
                    />

                    <View className="flex-row justify-end space-x-3">
                        <TouchableOpacity
                            onPress={onClose}
                            className="px-4 py-2"
                        >
                            <Text className="text-gray-600">Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSend}
                            className="px-4 py-2 bg-blue-500 rounded-lg"
                        >
                            <Text className="text-white font-semibold">
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
        <View className="flex-row items-start px-4 py-3 border-b border-gray-100">
            <Animated.View
                style={{ opacity: pulse }}
                className="w-10 h-10 rounded-full bg-gray-200 mr-3"
            />
            <View className="flex-1">
                <Animated.View
                    style={{ opacity: pulse }}
                    className="h-4 bg-gray-200 rounded mb-2 w-3/5"
                />
                <Animated.View
                    style={{ opacity: pulse }}
                    className="h-3 bg-gray-200 rounded mb-2 w-full"
                />
                <Animated.View
                    style={{ opacity: pulse }}
                    className="h-3 bg-gray-200 rounded w-2/5"
                />
            </View>
        </View>
    );

    const SectionHeader = () => (
        <View className="bg-gray-50 px-4 py-2">
            <Animated.View
                style={{ opacity: pulse }}
                className="h-3 bg-gray-200 rounded w-28"
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

    const isAdmin = user?.role === "admin" || user?.role === "super-admin";

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white px-4"
        >
            <StatusBar style="dark" />

            {/* Header */}
            <PlatformAdaptiveHeader title="Notifications" />

            {/* Search */}
            <View className="py-3 border-b border-gray-200">
                <View className="flex-row items-center bg-gray-100 rounded-lg px-3 h-12">
                    <Search size={20} color="#6B7280" />
                    <TextInput
                        placeholder="Search notifications..."
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={setQuery}
                        className="flex-1 ml-2 text-base h-full"
                    />
                </View>
            </View>

            {/* Loading shimmer (initial load) */}
            {isInitialLoading ? (
                <NotificationsSkeleton />
            ) : (
                <SectionList
                    sections={filtered}
                    keyExtractor={(item, index) =>
                        String(
                            item.id ??
                                `${item.createdAt ?? "no-date"}-${index}`,
                        )
                    }
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    renderSectionHeader={({ section: { title } }) => (
                        <View className="bg-gray-50 py-2">
                            <Text className="text-sm font-medium text-gray-600">
                                {title}
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => (
                        <View className="flex-row items-start p-3 border-b border-gray-100">
                            <View className="w-10 h-10 rounded-full bg-blue-500 items-center justify-center mr-3">
                                {iconFor(item.kind)}
                            </View>
                            <View className="flex-1">
                                <Text className="font-semibold text-base mb-1">
                                    {item.title}
                                </Text>
                                <Text className="text-gray-600 mb-1">
                                    {item.message}
                                </Text>
                                <Text className="text-xs text-gray-500">
                                    {timeAgo(item.createdAt)}
                                </Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View className="flex-1 items-center justify-center py-14 px-6">
                            <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
                                <MessageSquare size={22} color="#6B7280" />
                            </View>
                            <Text className="text-base font-semibold text-gray-800 mb-1">
                                No notifications
                            </Text>
                            <Text className="text-gray-500 text-center">
                                {query.trim()
                                    ? "No results match your search."
                                    : "When something important happens, you will see it here."}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* FAB for Admin */}
            {isAdmin && (
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
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
