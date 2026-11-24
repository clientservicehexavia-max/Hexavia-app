import { CustomTextInput } from "@/components/ui/CustomInput";
import { selectAllPartners, selectPartnerLoading } from "@/redux/partner/partner.selectors";
import { fetchPartners } from "@/redux/partner/partner.thunks";
import type { Partner } from "@/redux/partner/partner.types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Check, ChevronDown, Search, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";

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
        <View className="w-full">
            <Pressable
                onPress={() => setIsOpen(true)}
                disabled={disabled}
                className={`h-14 flex-row items-center justify-between rounded-2xl border border-gray-200 px-4 ${
                    disabled ? "bg-gray-100" : "bg-white"
                }`}
            >
                <Text
                    className={`font-kumbh text-[15px] flex-1 ${
                        selectedPartner ? "text-[#111827]" : "text-[#9CA3AF]"
                    }`}
                    numberOfLines={1}
                >
                    {selectedPartner?.name || placeholder}
                </Text>
                <ChevronDown size={18} color="#4C5FAB" />
            </Pressable>

            <Modal
                visible={isOpen}
                transparent
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <View className="flex-1 bg-black/40 justify-end">
                    <View className="max-h-[82%] bg-white rounded-t-[28px] pt-3 pb-6">
                        <View className="w-10 h-1 rounded-full bg-gray-200 self-center mb-3" />
                        <View className="flex-row items-center justify-between px-5 pb-3.5 border-b border-gray-100">
                            <Text className="text-[18px] font-kumbhBold text-[#111827]">
                                Select Partner
                            </Text>
                            <Pressable
                                onPress={() => setIsOpen(false)}
                                className="h-9 w-9 rounded-full bg-gray-100 items-center justify-center"
                            >
                                <X size={17} color="#374151" />
                            </Pressable>
                        </View>

                        <View className="px-5 py-3 border-b border-gray-100">
                            <View className="h-12 flex-row items-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-3.5">
                                <Search size={16} color="#6B7280" />
                                <CustomTextInput
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    placeholder="Search partners..."
                                    className="flex-1 h-full ml-2"
                                />
                            </View>
                        </View>

                        <FlatList
                            data={filteredPartners}
                            keyExtractor={(item) => item._id}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => {
                                const active = item._id === value;
                                return (
                                    <Pressable
                                        onPress={() => handleSelectPartner(item)}
                                        className="px-5 py-3.5 border-b border-gray-100 flex-row items-center justify-between"
                                    >
                                        <View className="flex-1 pr-3">
                                            <Text className="text-[#111827] font-kumbhBold text-[15px]">
                                                {item.name}
                                            </Text>
                                            {item.company ? (
                                                <Text className="text-[#6B7280] font-kumbh text-[12px] mt-0.5">
                                                    {item.company}
                                                </Text>
                                            ) : null}
                                        </View>
                                        {active ? (
                                            <Check size={17} color="#4C5FAB" />
                                        ) : null}
                                    </Pressable>
                                );
                            }}
                            ListEmptyComponent={
                                <View className="px-5 py-10 items-center">
                                    <Text className="text-[#6B7280] font-kumbh text-center">
                                        {loading
                                            ? "Loading partners..."
                                            : "No partners found"}
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};
