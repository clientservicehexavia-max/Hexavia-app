import { yupResolver } from "@hookform/resolvers/yup";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import {
    AtSign,
    Copy,
    Mail,
    Phone,
    RefreshCcw,
    User,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";

import { api } from "@/api/axios";
import Field from "@/components/admin/Field";
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import HexButton from "@/components/ui/HexButton";
import { showError, showPromise, showSuccess } from "@/components/ui/toast";

const schema = yup.object({
    fullname: yup
        .string()
        .trim()
        .min(2, "Full name is too short")
        .required("Full name is required"),
    username: yup
        .string()
        .trim()
        .matches(/^[a-zA-Z0-9_.-]{5,}$/, "Min 5 chars; letters, numbers, _ . -")
        .required("Username is required"),
    email: yup
        .string()
        .trim()
        .email("Enter a valid email")
        .required("Email is required"),
    phoneNumber: yup
        .string()
        .trim()
        .min(6, "Enter a valid phone number")
        .required("Phone number is required"),
});

type FormValues = yup.InferType<typeof schema>;

type CreatedMember = {
    fullname: string;
    email: string;
    password: string;
};

function generatePassword(length = 12) {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const all = `${letters}${numbers}`;

    const required = [
        letters[Math.floor(Math.random() * letters.length)],
        letters[Math.floor(Math.random() * letters.length)].toLowerCase(),
        numbers[Math.floor(Math.random() * numbers.length)],
    ];

    const rest = Array.from(
        { length: Math.max(length - required.length, 0) },
        () => all[Math.floor(Math.random() * all.length)],
    );

    const combined = [...required, ...rest];
    for (let i = combined.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined.join("");
}

export default function CreateTeamMemberScreen() {
    const router = useRouter();
    const isIOS = Platform.OS === "ios";
    const [generatedPassword, setGeneratedPassword] = useState(() =>
        generatePassword(),
    );
    const [createdMember, setCreatedMember] = useState<CreatedMember | null>(
        null,
    );

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isValid, isSubmitting },
    } = useForm<FormValues>({
        mode: "onChange",
        resolver: yupResolver(schema),
        defaultValues: {
            fullname: "",
            username: "",
            email: "",
            phoneNumber: "",
        },
    });

    const regeneratePassword = () => {
        setGeneratedPassword(generatePassword());
        showSuccess("Generated a new password");
    };

    const copyPassword = async () => {
        await Clipboard.setStringAsync(generatedPassword);
        showSuccess("Password copied to clipboard");
    };

    const onSubmit = async (values: FormValues) => {
        const password = generatedPassword;
        try {
            const payload = {
                fullname: values.fullname.trim(),
                username: values.username.trim(),
                email: values.email.trim().toLowerCase(),
                phoneNumber: values.phoneNumber.trim(),
                password,
                role: "staff",
            };

            await showPromise(
                api.post("/auth/register", payload),
                "Creating account…",
                "Team member created",
            );

            setCreatedMember({
                fullname: payload.fullname,
                email: payload.email,
                password,
            });

            reset({ fullname: "", username: "", email: "", phoneNumber: "" });
            setGeneratedPassword(generatePassword());
        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Could not create team member";
            showError(msg);
        }
    };

    const generatedPasswordHint = useMemo(
        () => "Password is auto-generated and meets account requirements.",
        [],
    );

    return (
        <SafeAreaView
            edges={
                isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]
            }
            className="flex-1 bg-white"
        >
            <PlatformAdaptiveHeader title="Add Team Member" />

            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.select({
                    ios: "padding",
                    android: "height",
                })}
            >
                <ScrollView
                    className="flex-1 px-4"
                    showsVerticalScrollIndicator={false}
                    contentContainerClassName="pb-32 pt-4"
                    keyboardShouldPersistTaps="handled"
                >
                    <View className="mb-6 rounded-2xl bg-primary-50 border border-primary-100 p-4">
                        <Text className="text-xl font-kumbhBold text-text">
                            Create a team account
                        </Text>
                        <Text className="mt-1 text-gray-600 font-kumbh">
                            Use the same details as a normal account signup. The
                            password is generated automatically.
                        </Text>
                    </View>

                    <Field label="Full name">
                        <Controller
                            control={control}
                            name="fullname"
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                    <User size={18} color="#6B7280" />
                                    <TextInput
                                        placeholder="Enter full name"
                                        placeholderTextColor="#9CA3AF"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        autoCapitalize="words"
                                        className="flex-1 h-full ml-2 text-black font-kumbh py-0 text-[16px] leading-[20px]"
                                        style={{
                                            paddingVertical: 0,
                                            height: 56,
                                        }}
                                    />
                                </View>
                            )}
                        />
                        {errors.fullname ? (
                            <Text className="mt-1 text-xs font-kumbh text-red-500">
                                {errors.fullname.message}
                            </Text>
                        ) : null}
                    </Field>

                    <Field label="Username">
                        <Controller
                            control={control}
                            name="username"
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                    <AtSign size={18} color="#6B7280" />
                                    <TextInput
                                        placeholder="Enter username"
                                        placeholderTextColor="#9CA3AF"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        autoCapitalize="none"
                                        className="flex-1 h-full ml-2 text-black font-kumbh py-0 text-[16px] leading-[20px]"
                                        style={{
                                            paddingVertical: 0,
                                            height: 56,
                                        }}
                                    />
                                </View>
                            )}
                        />
                        {errors.username ? (
                            <Text className="mt-1 text-xs font-kumbh text-red-500">
                                {errors.username.message}
                            </Text>
                        ) : null}
                    </Field>

                    <Field label="Email">
                        <Controller
                            control={control}
                            name="email"
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                    <Mail size={18} color="#6B7280" />
                                    <TextInput
                                        placeholder="Enter email"
                                        placeholderTextColor="#9CA3AF"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        className="flex-1 h-full ml-2 text-black font-kumbh py-0 text-[16px] leading-[20px]"
                                        style={{
                                            paddingVertical: 0,
                                            height: 56,
                                        }}
                                    />
                                </View>
                            )}
                        />
                        {errors.email ? (
                            <Text className="mt-1 text-xs font-kumbh text-red-500">
                                {errors.email.message}
                            </Text>
                        ) : null}
                    </Field>

                    <Field label="Phone number">
                        <Controller
                            control={control}
                            name="phoneNumber"
                            render={({
                                field: { onChange, onBlur, value },
                            }) => (
                                <View className="w-full h-14 px-4 rounded-xl bg-gray-100 flex-row items-center">
                                    <Phone size={18} color="#6B7280" />
                                    <TextInput
                                        placeholder="Enter phone number"
                                        placeholderTextColor="#9CA3AF"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        keyboardType="phone-pad"
                                        autoCapitalize="none"
                                        className="flex-1 h-full ml-2 text-black font-kumbh py-0 text-[16px] leading-[20px]"
                                        style={{
                                            paddingVertical: 0,
                                            height: 56,
                                        }}
                                    />
                                </View>
                            )}
                        />
                        {errors.phoneNumber ? (
                            <Text className="mt-1 text-xs font-kumbh text-red-500">
                                {errors.phoneNumber.message}
                            </Text>
                        ) : null}
                    </Field>

                    <Field label="Generated password">
                        <View className="rounded-2xl bg-gray-100 border border-gray-200 px-4 py-4">
                            <View className="flex-row items-center justify-between gap-3">
                                <Text
                                    className="flex-1 text-base text-text font-kumbhBold"
                                    numberOfLines={1}
                                >
                                    {generatedPassword}
                                </Text>
                                <Pressable
                                    onPress={copyPassword}
                                    className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
                                    hitSlop={8}
                                >
                                    <Copy size={18} color="#111827" />
                                </Pressable>
                                <Pressable
                                    onPress={regeneratePassword}
                                    className="w-10 h-10 rounded-full bg-white border border-gray-200 items-center justify-center"
                                    hitSlop={8}
                                >
                                    <RefreshCcw size={18} color="#111827" />
                                </Pressable>
                            </View>
                            <Text className="mt-2 text-xs text-gray-500 font-kumbh">
                                {generatedPasswordHint}
                            </Text>
                        </View>
                    </Field>

                    {createdMember ? (
                        <View className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
                            <Text className="text-lg font-kumbhBold text-green-900">
                                Team member created
                            </Text>
                            <Text className="mt-1 text-sm text-green-800 font-kumbh">
                                {createdMember.fullname} ({createdMember.email})
                            </Text>
                            <Text className="mt-3 text-sm text-green-800 font-kumbh">
                                Password:
                            </Text>
                            <View className="mt-2 flex-row items-center justify-between gap-3 rounded-xl bg-white border border-green-200 px-4 py-3">
                                <Text
                                    className="flex-1 text-base font-kumbhBold text-text"
                                    numberOfLines={1}
                                >
                                    {createdMember.password}
                                </Text>
                                <Pressable
                                    onPress={async () => {
                                        await Clipboard.setStringAsync(
                                            createdMember.password,
                                        );
                                        showSuccess(
                                            "Created password copied to clipboard",
                                        );
                                    }}
                                    className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 items-center justify-center"
                                    hitSlop={8}
                                >
                                    <Copy size={18} color="#111827" />
                                </Pressable>
                            </View>
                            <Text className="mt-2 text-xs text-green-700 font-kumbh">
                                Share this password securely with the team
                                member.
                            </Text>
                        </View>
                    ) : null}

                    <View className="mt-8 gap-3">
                        <HexButton
                            title={
                                isSubmitting
                                    ? "Creating…"
                                    : "Create Team Member"
                            }
                            onPress={handleSubmit(onSubmit)}
                            disabled={!isValid || isSubmitting}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
