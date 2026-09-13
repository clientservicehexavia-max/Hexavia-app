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
    minimumDate?: Date;
    maximumDate?: Date;
};

const MIN_DATE = new Date(1900, 0, 1);
const MAX_DATE = new Date(2100, 11, 31);

function isUsableDate(value?: Date, minDate = MIN_DATE, maxDate = MAX_DATE) {
    return (
        value instanceof Date &&
        !Number.isNaN(value.getTime()) &&
        value >= minDate &&
        value <= maxDate
    );
}

export default function DatePickerModal({
    visible,
    value,
    onCancel,
    onDone,
    onDateChange,
    minimumDate = MIN_DATE,
    maximumDate = MAX_DATE,
}: IOSDatePickerModalProps) {
    const safeValue = useMemo(
        () => (isUsableDate(value, minimumDate, maximumDate) ? value : new Date()),
        [value, minimumDate, maximumDate],
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
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(e, d) => {
                    if (!d || e?.type === "dismissed") {
                        onCancel();
                        return;
                    }
                    if (!isUsableDate(d, minimumDate, maximumDate)) return;
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
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    themeVariant="light"
                    style={{ backgroundColor: "transparent" }}
                    onChange={(e, d) => {
                        if (!d || e?.type === "dismissed") {
                            onCancel();
                            return;
                        }
                        if (!isUsableDate(d, minimumDate, maximumDate)) return;
                        setDraftDate(d);
                        onDateChange(d);
                    }}
                    // accentColor="red"
                />
            </View>
        </BottomSheetModal>
    );
}
