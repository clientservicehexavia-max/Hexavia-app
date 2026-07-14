import AvatarPlaceholder from "@/components/staff/AvatarPlaceHolder";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

type Variant = "admin" | "staff" | "client";

function firstNameOf(fullname?: string | null) {
    if (!fullname) return "User";
    return fullname.trim().split(/\s+/)[0];
}
function prettyRole(role?: string | null) {
    if (!role) return "Project Member";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function prettyVariant(variant: Variant) {
    if (variant === "admin") return "Admin";
    if (variant === "staff") return "Staff";
    return "Client";
}

type BaseProps = {
    /** Optional explicit title line above greeting (rarely needed) */
    title?: string;
    /** Small badge/pill under greeting (e.g., "Admin", "Finance Team") */
    subtitleBadge?: string;
    /** Icon to render on the right (e.g., <Bell .../>) */
    rightIcon?: React.ReactNode;
    /** Called when right icon is pressed */
    onRightPress?: () => void;
    /** Override avatar press route; otherwise we infer from variant */
    onAvatarPress?: () => void;
    /** Add extra content on the right (beside rightIcon), e.g. a filter button */
    rightExtra?: React.ReactNode;
    /** Layout className overrides if needed */
    containerClassName?: string;
};

type VariantProps = BaseProps & {
    variant: Variant;
};

function routesFor(variant: Variant) {
    switch (variant) {
        case "staff":
            return {
                profile: "/(staff)/(tabs)/profile",
                notifications: "/(staff)/notifications",
            };
        case "client":
            return {
                profile: "/(client)/(tabs)/profile",
                notifications: "/(client)/notifications",
            };
        default:
            return {
                profile: "/(admin)/(tabs)/profile",
                notifications: "/(admin)/notifications",
            };
    }
}

function UserHeaderCore({
    variant,
    title,
    subtitleBadge,
    rightIcon,
    onRightPress,
    onAvatarPress,
    rightExtra,
    containerClassName,
}: VariantProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const user = useAppSelector(selectUser);
    const { phase } = useAppSelector((s: RootState) => s.auth);

    useEffect(() => {
        // Safe to dispatch on mount to keep profile fresh (cached server-side / reducer)
        dispatch(fetchProfile());
    }, [dispatch]);

    const loadingProfile = phase === "loading" || !user;

    if (loadingProfile) {
        return (
            <View className={`pt-5 pb-3 ${containerClassName ?? ""}`}>
                <View className="flex-row items-center px-1">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <ActivityIndicator size="small" color="#4C5FAB" />
                    </View>
                    <Text className="font-kumbh text-sm text-gray-500">
                        Loading profile...
                    </Text>
                </View>
            </View>
        );
    }

    const greetingName = firstNameOf(user?.fullname);
    const computedRoleText = prettyRole(user?.role || undefined);
    const variantText = prettyVariant(variant);

    const { profile, notifications } = routesFor(variant);

    const handleAvatarPress = () => {
        if (onAvatarPress) return onAvatarPress();
        router.push(profile as any);
    };

    const handleRightPress = () => {
        if (onRightPress) return onRightPress();
        router.push(notifications as any);
    };

    return (
        <View className={`pt-0 pb-3 ${containerClassName ?? ""}`}>
            <View className="flex-row items-center justify-between">
                <Pressable onPress={handleAvatarPress}>
                    <View className="rounded-2xl">
                        <AvatarPlaceholder avatar={user?.profilePicture} />
                    </View>
                </Pressable>

                <View className="flex-row items-center gap-2">
                    {rightExtra}
                    <Pressable
                        onPress={handleRightPress}
                        className="h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-white"
                    >
                        {rightIcon ?? (
                            <Ionicons
                                name="notifications-outline"
                                size={18}
                                color="#4C5FAB"
                            />
                        )}
                    </Pressable>
                </View>
            </View>

            <View className="mt-3">
                {title ? (
                    <Text className="mb-1 font-kumbhBold text-[10px] uppercase tracking-[2px] text-gray-500">
                        {title}
                    </Text>
                ) : null}

                <Text className="font-kumbhBold text-[20px] leading-7 text-[#111827]">
                    {greetingName ? `Hi, ${greetingName}!` : "Hi there!"}
                </Text>
                <Text className="mt-0.5 font-kumbh text-xs text-gray-500 uppercase">
                    {timeGreeting()}
                </Text>

                {/* {subtitleBadge || computedRoleText ? (
                    <View className="mt-2 flex-row items-center">
                        <View className="self-start rounded-full bg-primary px-3 py-1">
                            <Text className="font-kumbhBold text-[11px] text-white">
                                {subtitleBadge ?? computedRoleText}
                            </Text>
                        </View>
                    </View>
                ) : null} */}
            </View>

            <View className="mt-1 h-px bg-gray-100" />
        </View>
    );
}

/** Public wrappers that keep your current API tidy */
export function AdminHeader(props: Omit<VariantProps, "variant">) {
    return <UserHeaderCore variant="admin" {...props} />;
}
export function StaffHeader(props: Omit<VariantProps, "variant">) {
    return <UserHeaderCore variant="staff" {...props} />;
}
export function ClientHeader(props: Omit<VariantProps, "variant">) {
    return <UserHeaderCore variant="client" {...props} />;
}

export default UserHeaderCore;
