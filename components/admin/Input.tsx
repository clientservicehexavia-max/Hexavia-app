import { CustomTextInput } from "@/components/ui/CustomInput";
import clsx from "clsx";
import { ReturnKeyTypeOptions, View } from "react-native";

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
        <View
            className={clsx(
                "rounded-2xl border border-gray-200 bg-white px-4 justify-center",
                multiline ? "py-3 min-h-[96px] justify-start" : "h-14",
            )}
        >
            <CustomTextInput
                placeholder={placeholder}
                multiline={multiline}
                keyboardType={keyboardType}
                value={value}
                onChangeText={onChangeText}
                textAlignVertical={multiline ? "top" : "center"}
                className={multiline ? "w-full min-h-[72px]" : "h-full w-full"}
                returnKeyType={returnKeyType}
                blurOnSubmit={!multiline}
            />
        </View>
    );
}
