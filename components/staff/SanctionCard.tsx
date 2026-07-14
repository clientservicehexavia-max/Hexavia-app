import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

const SanctionCard = () => {
    const router = useRouter();

    return (
        <View
            className="mt-5 overflow-hidden rounded-3xl border border-rose-100 bg-[#FFF6F8] px-5 py-5"
            style={{ elevation: 1 }}
        >
            <View className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#F43F5E]/10" />
            <View className="absolute -left-10 -bottom-12 h-40 w-40 rounded-full bg-[#F43F5E]/10" />

            <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                    <View className="mb-2 self-start rounded-full bg-rose-100 px-3 py-1">
                        <Text className="font-kumbhBold text-[10px] uppercase tracking-widest text-rose-700">
                            Compliance
                        </Text>
                    </View>
                    <Text className="font-kumbhBold text-2xl text-[#3F0A17]">
                        Sanction Grid
                    </Text>
                    <Text className="mt-1 font-kumbh text-sm text-[#7A1E34]">
                        Track accountability actions and enforce team standards.
                    </Text>
                </View>

                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#F43F5E]/15">
                    <Ionicons
                        name="shield-checkmark"
                        size={22}
                        color="#BE123C"
                    />
                </View>
            </View>

            <View className="mt-5 flex-row items-center gap-2">
                <View className="rounded-full bg-white/90 px-2.5 py-1">
                    <Text className="font-kumbh text-[11px] text-[#9F1239]">
                        Policy
                    </Text>
                </View>
                <View className="rounded-full bg-white/90 px-2.5 py-1">
                    <Text className="font-kumbh text-[11px] text-[#9F1239]">
                        Escalation
                    </Text>
                </View>
                <View className="rounded-full bg-white/90 px-2.5 py-1">
                    <Text className="font-kumbh text-[11px] text-[#9F1239]">
                        History
                    </Text>
                </View>
            </View>

            <Pressable
                className="mt-5 flex-row items-center justify-center rounded-2xl bg-[#BE123C] py-3.5"
                onPress={() => router.push("/(staff)/sanctions")}
            >
                <Text className="font-kumbhBold text-sm text-white">
                    View Sanctions
                </Text>
                <Ionicons
                    name="arrow-forward"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginLeft: 6 }}
                />
            </Pressable>
        </View>
    );
};

export default SanctionCard;
