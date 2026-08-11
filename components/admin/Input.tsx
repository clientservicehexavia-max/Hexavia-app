import clsx from "clsx";
import { ReturnKeyTypeOptions, TextInput } from "react-native";

export default function Input({
    multiline,
    placeholder,
    keyboardType,
    value,
    onChangeText,
    returnKeyType = "default",
}: {
    multiline?: boolean;
    placeholder?: string;
    keyboardType?: "default" | "numeric";
    value?: string;
    onChangeText?: (t: string) => void;
    returnKeyType?: ReturnKeyTypeOptions;
}) {
    return (
        <TextInput
            placeholder={placeholder}
            multiline={multiline}
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
            className={clsx(
                "bg-gray-200 rounded-2xl px-4 py-4 font-kumbh text-text",
                multiline && "min-h-[88px]",
            )}
            placeholderTextColor="#9CA3AF"
            returnKeyType={returnKeyType}
            blurOnSubmit={!multiline}
        />
    );
}
