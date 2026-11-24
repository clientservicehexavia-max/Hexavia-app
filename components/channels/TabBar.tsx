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
        <View className="mx-4 mt-2 rounded-2xl bg-white border border-gray-200 p-1 flex-row">
            {tabs.map((tab) => {
                const active = tab.id === activeTab;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onChange(tab.id)}
                        className={`flex-1 rounded-xl py-2.5 px-3 items-center justify-center ${
                            active ? "bg-primary" : ""
                        }`}
                    >
                        <Text
                            className={`font-kumbhBold text-sm ${
                                active ? "text-white" : "text-[#6B7280]"
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
