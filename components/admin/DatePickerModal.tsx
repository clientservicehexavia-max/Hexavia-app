import BottomSheetModal from "@/components/ui/BottomSheetModal";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";

type IOSDatePickerModalProps = {
    visible: boolean;
    value: Date;
    onCancel: () => void;
    onDone: () => void;
    onDateChange: (date: Date) => void;
};

const MIN_DATE = new Date(2000, 0, 1);
const MAX_DATE = new Date(2100, 11, 31);

function isUsableDate(value?: Date) {
    return (
        value instanceof Date &&
        !Number.isNaN(value.getTime()) &&
        value >= MIN_DATE &&
        value <= MAX_DATE
    );
}

export default function DatePickerModal({
    visible,
    value,
    onCancel,
    onDone,
    onDateChange,
}: IOSDatePickerModalProps) {
    const safeValue = useMemo(
        () => (isUsableDate(value) ? value : new Date()),
        [value],
    );
    const [draftDate, setDraftDate] = useState(safeValue);

    useEffect(() => {
        if (visible) {
            setDraftDate(safeValue);
        }
    }, [safeValue, visible]);

    if (!visible) return null;

    if (Platform.OS !== "ios") {
        return (
            <DateTimePicker
                value={draftDate}
                mode="date"
                display="default"
                minimumDate={MIN_DATE}
                maximumDate={MAX_DATE}
                onChange={(e, d) => {
                    if (!d || e?.type === "dismissed") {
                        onCancel();
                        return;
                    }
                    if (!isUsableDate(d)) return;
                    setDraftDate(d);
                    onDateChange(d);
                    onDone();
                }}
            />
        );
    }

    return (
        <BottomSheetModal
            visible={visible}
            onRequestClose={onCancel}
            onDone={onDone}
        >
            <View className="flex-row justify-center">
                <DateTimePicker
                    value={draftDate}
                    mode="date"
                    display="spinner"
                    minimumDate={MIN_DATE}
                    maximumDate={MAX_DATE}
                    themeVariant="light"
                    style={{ backgroundColor: "transparent" }}
                    onChange={(e, d) => {
                        if (!d || e?.type === "dismissed") {
                            onCancel();
                            return;
                        }
                        if (!isUsableDate(d)) return;
                        setDraftDate(d);
                        onDateChange(d);
                    }}
                    // accentColor="red"
                />
            </View>
        </BottomSheetModal>
    );
}
