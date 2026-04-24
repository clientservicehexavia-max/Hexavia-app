import React from "react";
import { Pressable, Text, View } from "react-native";

type TabItem = {
    id: string;
    label: string;
};

type Props = {
    tabs: TabItem[];
    activeTab: string;
    onChange: (tabId: string) => void;
};

export default function TabBar({ tabs, activeTab, onChange }: Props) {
    return (
        <View className="mx-4 mt-1 rounded-full bg-gray-100 p-1 flex-row shadow-sm">
            {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onChange(tab.id)}
                        className={`flex-1 rounded-full p-3 items-center justify-center ${
                            active ? "bg-white" : ""
                        }`}
                    >
                        <Text
                            className={`font-kumbhBold text-sm ${
                                active ? "text-gray-900" : "text-gray-500"
                            }`}
                        >
                            {tab.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
