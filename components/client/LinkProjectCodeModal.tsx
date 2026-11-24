import CustomTextInput from "@/components/ui/CustomInput";
import { showError } from "@/components/ui/toast";
import { fetchChannels } from "@/redux/channels/channels.thunks";
import { fetchProfile, linkProjectCode } from "@/redux/user/user.thunks";
import { useAppDispatch } from "@/store/hooks";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    Text,
    View,
} from "react-native";

type LinkProjectCodeModalProps = {
    visible: boolean;
    onClose: () => void;
    onLinked?: () => void;
    allowDismiss?: boolean;
};

export default function LinkProjectCodeModal({
    visible,
    onClose,
    onLinked,
    allowDismiss = true,
}: LinkProjectCodeModalProps) {
    const dispatch = useAppDispatch();
    const [code, setCode] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const normalized = useMemo(
        () => code.trim().replace(/^#/, "").replace(/\s+/g, ""),
        [code],
    );

    const handleClose = () => {
        if (!allowDismiss || submitting) return;
        onClose();
    };

    const handleLink = async () => {
        if (!normalized) {
            showError("Project code is required");
            return;
        }

        try {
            setSubmitting(true);
            await dispatch(
                linkProjectCode({ projectCode: `#${normalized}` }),
            ).unwrap();
            await dispatch(fetchProfile()).unwrap();
            await dispatch(fetchChannels()).unwrap();
            onLinked?.();
            onClose();
            setCode("");
        } catch {
            // Error toast is emitted by thunk.
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View className="flex-1 justify-center bg-black/45 px-5">
                <View className="rounded-[28px] border border-gray-100 bg-white p-6">
                    <Text className="font-kumbhBold text-xl text-[#111827]">
                        Link Your Project
                    </Text>
                    <Text className="mt-2 font-kumbh text-sm leading-5 text-gray-500">
                        Enter your project code to connect your account to your
                        project chat.
                    </Text>

                    <View className="mt-4 h-14 flex-row items-center rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4">
                        <Text className="font-kumbhBold text-base text-[#6B7280]">
                            #
                        </Text>
                        <CustomTextInput
                            value={normalized}
                            onChangeText={setCode}
                            placeholder="e.g. 5839"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!submitting}
                            className="ml-2 h-full flex-1 text-base"
                        />
                    </View>

                    <Pressable
                        onPress={handleLink}
                        disabled={submitting || !normalized}
                        className={`mt-5 h-12 items-center justify-center rounded-2xl ${
                            submitting || !normalized
                                ? "bg-gray-200"
                                : "bg-primary"
                        }`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text
                                className={`font-kumbhBold ${
                                    submitting || !normalized
                                        ? "text-gray-400"
                                        : "text-white"
                                }`}
                            >
                                Link Project
                            </Text>
                        )}
                    </Pressable>

                    {allowDismiss ? (
                        <Pressable
                            onPress={handleClose}
                            disabled={submitting}
                            className="mt-3 h-11 rounded-2xl items-center justify-center border border-gray-200"
                        >
                            <Text className="text-[#111827] font-kumbh">
                                Not now
                            </Text>
                        </Pressable>
                    ) : null}

                    {Platform.OS === "ios" ? (
                        <Text className="text-xs text-gray-400 font-kumbh mt-3 text-center">
                            You can request the project code from your project
                            manager.
                        </Text>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}
