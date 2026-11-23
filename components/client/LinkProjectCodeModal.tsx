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
    TextInput,
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
            <View className="flex-1 bg-black/50 px-5 justify-center">
                <View className="bg-white rounded-3xl p-5">
                    <Text className="text-xl text-[#111827] font-kumbhBold">
                        Link Your Project
                    </Text>
                    <Text className="text-sm text-gray-500 font-kumbh mt-2">
                        Enter your project code to connect your account to your
                        project chat.
                    </Text>

                    <View className="mt-4 rounded-2xl border border-gray-200 px-4 py-3 flex-row items-center">
                        <Text className="text-base text-[#6B7280] font-kumbh">
                            #
                        </Text>
                        <TextInput
                            value={normalized}
                            onChangeText={setCode}
                            placeholder="e.g. 5839"
                            placeholderTextColor="#9CA3AF"
                            autoCapitalize="characters"
                            autoCorrect={false}
                            editable={!submitting}
                            className="flex-1 ml-2 text-base text-[#111827] font-kumbh"
                        />
                    </View>

                    <Pressable
                        onPress={handleLink}
                        disabled={submitting || !normalized}
                        className={`mt-4 h-12 rounded-2xl items-center justify-center ${
                            submitting || !normalized
                                ? "bg-gray-300"
                                : "bg-[#4C5FAB]"
                        }`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-kumbhBold">
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
