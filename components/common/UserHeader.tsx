import AvatarPlaceholder from "@/components/staff/AvatarPlaceHolder";
import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import type { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
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
                profile: "/(admin)/profile",
                notifications: "/(admin)/notifications",
            };
    }
}

function UserHeaderCore({
    variant,
    rightIcon,
    onRightPress,
    onAvatarPress,
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
            <View className="px-5 pt-8 pb-4">
                <ActivityIndicator style={{ marginTop: 8 }} />
            </View>
        );
    }

    const greetingName = firstNameOf(user?.fullname);
    const roleText = prettyRole(user?.role || "Hexavia Staff");

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
        <View className="pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
                <Pressable onPress={handleAvatarPress}>
                    <AvatarPlaceholder avatar={user?.profilePicture} />
                </Pressable>

                <View>
                    <Text className="text-2xl ios:font-bold font-kumbh text-text">
                        {greetingName ? `Hi ${greetingName}` : "Hi there!"}
                    </Text>
                    {roleText ? (
                        <View className="self-start rounded-full border border-emerald-300 px-3 ios:py-1 android:py-[1px]">
                            <Text className="text-emerald-600 text-[12px] font-kumbhBold">
                                {roleText}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>

            <Pressable
                onPress={handleRightPress}
                className="w-11 h-11 rounded-2xl bg-white shadow-sm items-center justify-center"
            >
                <Bell size={20} color="#111827" />
            </Pressable>
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
