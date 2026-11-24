import clsx from "clsx";
import React, { useEffect, useMemo, useState } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Option {
    label: string;
    value: string | number;
}

interface OptionSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelect?: (value: string | number) => void;
    onSelectMultiple?: (values: (string | number)[]) => void;
    title: string;
    options: Option[];
    selectedValue?: string | number;
    selectedValues?: (string | number)[];
    searchable?: boolean;
    searchPlaceholder?: string;
    multiSelect?: boolean;
    applyText?: string;
    emptyText?: string;
    fullScreen?: boolean;
}

const EMPTY_SELECTED_VALUES: (string | number)[] = [];

function sameValues(a: (string | number)[], b: (string | number)[]) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
        if (String(a[i]) !== String(b[i])) return false;
    }
    return true;
}

export default function OptionSheet({
    visible,
    onClose,
    onSelect,
    onSelectMultiple,
    title,
    options,
    selectedValue,
    selectedValues = EMPTY_SELECTED_VALUES,
    searchable = false,
    searchPlaceholder = "Search...",
    multiSelect = false,
    applyText = "Apply",
    emptyText = "No options found",
    fullScreen = false,
}: OptionSheetProps) {
    const [query, setQuery] = useState("");
    const [draftSelectedValues, setDraftSelectedValues] =
        useState<(string | number)[]>(selectedValues);

    useEffect(() => {
        if (!visible) return;
        setQuery("");
        setDraftSelectedValues((current) =>
            sameValues(current, selectedValues) ? current : selectedValues,
        );
    }, [selectedValues, visible]);

    const normalizedQuery = query.trim().toLowerCase();
    const filteredOptions = useMemo(() => {
        if (!normalizedQuery) return options;
        return options.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
        );
    }, [normalizedQuery, options]);

    const isSelected = (value: string | number) => {
        if (multiSelect) {
            return draftSelectedValues.some(
                (selected) => String(selected) === String(value),
            );
        }
        return String(selectedValue) === String(value);
    };

    const handleSelect = (value: string | number) => {
        if (multiSelect) {
            setDraftSelectedValues((current) => {
                const exists = current.some(
                    (selected) => String(selected) === String(value),
                );
                if (exists) {
                    return current.filter(
                        (selected) => String(selected) !== String(value),
                    );
                }
                return [...current, value];
            });
            return;
        }

        onSelect?.(value);
        onClose();
    };

    const handleApply = () => {
        onSelectMultiple?.(draftSelectedValues);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            presentationStyle="overFullScreen"
        >
            <Pressable
                onPress={onClose}
                className={`flex-1 ${fullScreen ? "justify-start" : "justify-end"} bg-black/50`}
            >
                {fullScreen ? (
                    <SafeAreaView
                        edges={["top", "bottom"]}
                        className="flex-1 bg-white"
                    >
                        <View className="items-center justify-center border-b border-gray-100 px-6 py-4">
                            <Text className="text-center font-kumbhBold text-lg text-[#111827]">
                                {title}
                            </Text>
                        </View>
                        {searchable && (
                            <View className="px-5 pt-4">
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder={searchPlaceholder}
                                    placeholderTextColor="#9CA3AF"
                                    className="h-12 rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 font-kumbh text-[#111827]"
                                />
                            </View>
                        )}
                        <ScrollView className="px-3 py-2">
                            {filteredOptions.length === 0 ? (
                                <View className="py-10">
                                    <Text className="text-center font-kumbh text-gray-500">
                                        {emptyText}
                                    </Text>
                                </View>
                            ) : (
                                filteredOptions.map((option) => {
                                    const selected = isSelected(option.value);

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() =>
                                                handleSelect(option.value)
                                            }
                                            className={clsx(
                                                "my-1 rounded-2xl border px-4 py-3.5",
                                                selected
                                                    ? "border-primary/20 bg-[#EEF2FF]"
                                                    : "border-transparent bg-white",
                                            )}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <Text
                                                    className={`flex-1 font-kumbh text-base capitalize ${
                                                        selected
                                                            ? "font-kumbhBold text-primary"
                                                            : "text-[#111827]"
                                                    }`}
                                                >
                                                    {option.label}
                                                </Text>
                                                {multiSelect && selected && (
                                                    <Text className="ml-2 font-kumbhBold text-sm text-primary">
                                                        Done
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                        <View className="border-t border-gray-100 px-5 py-4">
                            {multiSelect && (
                                <TouchableOpacity
                                    onPress={handleApply}
                                    className="mb-2.5 rounded-2xl bg-primary py-3.5"
                                >
                                    <Text className="text-center font-kumbhBold text-white">
                                        {applyText}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={onClose}
                                className="rounded-2xl border border-gray-200 bg-[#F5F7FB] py-3.5"
                            >
                                <Text className="text-center font-kumbhBold text-gray-700">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                ) : (
                    <View className="max-h-[540px] rounded-t-[28px] border-t border-gray-100 bg-white">
                        <View className="items-center pt-3">
                            <View className="h-1.5 w-11 rounded-full bg-gray-200" />
                        </View>
                        <View className="items-center justify-center border-b border-gray-100 px-6 py-3.5">
                            <Text className="text-center font-kumbhBold text-lg text-[#111827]">
                                {title}
                            </Text>
                        </View>
                        {searchable && (
                            <View className="px-5 pt-4">
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder={searchPlaceholder}
                                    placeholderTextColor="#9CA3AF"
                                    className="h-12 rounded-2xl border border-gray-200 bg-[#F5F7FB] px-4 font-kumbh text-[#111827]"
                                />
                            </View>
                        )}
                        <ScrollView className="px-3 py-2">
                            {filteredOptions.length === 0 ? (
                                <View className="py-10">
                                    <Text className="text-center font-kumbh text-gray-500">
                                        {emptyText}
                                    </Text>
                                </View>
                            ) : (
                                filteredOptions.map((option) => {
                                    const selected = isSelected(option.value);

                                    return (
                                        <TouchableOpacity
                                            key={option.value}
                                            onPress={() =>
                                                handleSelect(option.value)
                                            }
                                            className={clsx(
                                                "my-1 rounded-2xl border px-4 py-3.5",
                                                selected
                                                    ? "border-primary/20 bg-[#EEF2FF]"
                                                    : "border-transparent bg-white",
                                            )}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <Text
                                                    className={`flex-1 font-kumbh text-base capitalize ${
                                                        selected
                                                            ? "font-kumbhBold text-primary"
                                                            : "text-[#111827]"
                                                    }`}
                                                >
                                                    {option.label}
                                                </Text>
                                                {multiSelect && selected && (
                                                    <Text className="ml-2 font-kumbhBold text-sm text-primary">
                                                        Done
                                                    </Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </ScrollView>
                        <View className="border-t border-gray-100 px-5 py-4">
                            {multiSelect && (
                                <TouchableOpacity
                                    onPress={handleApply}
                                    className="mb-2.5 rounded-2xl bg-primary py-3.5"
                                >
                                    <Text className="text-center font-kumbhBold text-white">
                                        {applyText}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={onClose}
                                className="rounded-2xl border border-gray-200 bg-[#F5F7FB] py-3.5"
                            >
                                <Text className="text-center font-kumbhBold text-gray-700">
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Pressable>
        </Modal>
    );
}
