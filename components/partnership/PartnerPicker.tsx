import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Modal } from "react-native";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import { selectAllPartners, selectPartnerLoading } from "@/redux/partner/partner.selectors";
import type { Partner } from "@/redux/partner/partner.types";

interface PartnerPickerProps {
    value?: string;
    onChange: (partnerId: string, partnerName: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const PartnerPicker: React.FC<PartnerPickerProps> = ({
    value,
    onChange,
    placeholder = "Select a partner",
    disabled = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    const dispatch = useAppDispatch();
    const allPartners = useAppSelector(selectAllPartners);
    const loading = useAppSelector(selectPartnerLoading);

    useEffect(() => {
        if (allPartners.length === 0) {
            dispatch(fetchPartners({}));
        }
    }, [dispatch, allPartners.length]);

    const filteredPartners = allPartners.filter((partner) =>
        partner.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const selectedPartner = allPartners.find((p) => p._id === value);

    const handleSelectPartner = (partner: Partner) => {
        onChange(partner._id, partner.name);
        setIsOpen(false);
        setSearchText("");
    };

    return (
        <View className="w-full mb-4">
            <TouchableOpacity
                onPress={() => setIsOpen(true)}
                disabled={disabled}
                className={`w-full border border-gray-300 rounded-lg px-4 py-3 ${
                    disabled ? "bg-gray-100" : "bg-white"
                }`}
            >
                <Text className={selectedPartner ? "text-gray-900" : "text-gray-500"}>
                    {selectedPartner?.name || placeholder}
                </Text>
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <View className="flex-1 bg-white mt-12">
                    <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                        <Text className="text-lg font-semibold">Select Partner</Text>
                        <TouchableOpacity
                            onPress={() => setIsOpen(false)}
                            className="px-4 py-2"
                        >
                            <Text className="text-gray-600 text-base">✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View className="px-4 py-3 border-b border-gray-200">
                        <Text className="text-gray-600 text-sm mb-2">Search</Text>
                        <View className="border border-gray-300 rounded-lg px-3 py-2">
                            <Text
                                onPress={() => {}} // placeholder for input
                                className="text-gray-900"
                            >
                                {searchText || "Type partner name..."}
                            </Text>
                        </View>
                    </View>

                    <FlatList
                        data={filteredPartners}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => handleSelectPartner(item)}
                                className="px-4 py-3 border-b border-gray-100"
                            >
                                <Text className="text-gray-900 font-medium">
                                    {item.name}
                                </Text>
                                {item.company && (
                                    <Text className="text-gray-600 text-sm">
                                        {item.company}
                                    </Text>
                                )}
                                <Text className="text-gray-500 text-xs">
                                    Status: {item.status}
                                </Text>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View className="px-4 py-8">
                                <Text className="text-gray-500 text-center">
                                    {loading ? "Loading partners..." : "No partners found"}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
        </View>
    );
};
