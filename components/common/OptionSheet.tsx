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
                className="flex-1 justify-end bg-black/50"
            >
                <View className="bg-white rounded-t-xl max-h-96">
                    <View className="px-6 py-3 border-b border-gray-200 justify-center items-center">
                        <Text className="text-xl font-kumbhBold text-center">
                            {title}
                        </Text>
                    </View>
                    {searchable && (
                        <View className="px-6 pt-4">
                            <TextInput
                                value={query}
                                onChangeText={setQuery}
                                placeholder={searchPlaceholder}
                                placeholderTextColor="#9CA3AF"
                                className="rounded-xl bg-gray-100 px-4 py-3 text-gray-800 font-kumbh"
                            />
                        </View>
                    )}
                    <ScrollView className="px-1 py-2">
                        {filteredOptions.length === 0 ? (
                            <View className="py-8">
                                <Text className="text-center text-gray-500 font-kumbh">
                                    {emptyText}
                                </Text>
                            </View>
                        ) : (
                            filteredOptions.map((option, index) => {
                                const selected = isSelected(option.value);

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() =>
                                            handleSelect(option.value)
                                        }
                                        className={clsx(
                                            "py-4 border-b border-gray-100 px-4 rounded-xl",
                                            selected
                                                ? "bg-blue-50 border-b-0"
                                                : "",
                                            filteredOptions.length - 1 === index
                                                ? "border-b-0"
                                                : "",
                                        )}
                                    >
                                        <View className="flex-row items-center justify-between">
                                            <Text
                                                className={`text-base font-kumbh ${
                                                    selected
                                                        ? "text-blue-600 font-kumbhBold"
                                                        : "text-gray-700"
                                                }`}
                                            >
                                                {option.label}
                                            </Text>
                                            {multiSelect && selected && (
                                                <Text className="text-blue-600 font-kumbhBold">
                                                    Done
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </ScrollView>
                    <View className="px-6 py-4">
                        {multiSelect && (
                            <TouchableOpacity
                                onPress={handleApply}
                                className="mb-3 py-3 bg-primary-500 rounded-lg"
                            >
                                <Text className="text-center text-white font-kumbhBold">
                                    {applyText}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            onPress={onClose}
                            className="py-3 bg-gray-100 rounded-lg"
                        >
                            <Text className="text-center text-gray-600 font-kumbhBold">
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}
