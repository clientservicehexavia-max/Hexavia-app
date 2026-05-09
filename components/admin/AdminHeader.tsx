import { selectUser } from "@/redux/user/user.slice";
import { fetchProfile } from "@/redux/user/user.thunks";
import { RootState } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import AvatarPlaceholder from "../staff/AvatarPlaceHolder";

function firstNameOf(fullname?: string | null) {
    if (!fullname) return "User";
    return fullname.trim().split(/\s+/)[0];
}
function prettyRole(role?: string | null) {
    if (!role) return "Project Member";
    return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminHeader({
    title,
    subtitleBadge,
    rightIcon,
    onRightPress,
}: {
    title: string;
    subtitleBadge?: string;
    rightIcon?: React.ReactNode;
    onRightPress?: () => void;
}) {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    useEffect(() => {
        dispatch(fetchProfile());
    }, [dispatch]);

    const { phase } = useAppSelector((s: RootState) => s.auth);

    const loadingProfile = phase === "loading" || !user;
    // if (loadingProfile) {
    //   return (
    //     <View style={{ flex: 1, padding: 16 }}>
    //       <ActivityIndicator style={{ marginTop: 24 }} />
    //     </View>
    //   );
    // }

    const greetingName = firstNameOf(user?.fullname);
    const roleText = prettyRole(user?.role || "Hexavia Staff");
    const router = useRouter();

    return (
        <View className="pt-5 pb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
                <Pressable onPress={() => router.push("/(admin)/profile")}>
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
                onPress={onRightPress}
                className="w-11 h-11 rounded-2xl bg-white shadow-sm items-center justify-center"
            >
                {rightIcon}
            </Pressable>
        </View>
    );
}
