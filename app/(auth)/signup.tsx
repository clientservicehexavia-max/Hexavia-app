import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useToast } from "react-native-toast-notifications";
import CustomTextInput from "@/components/ui/CustomInput";
import HexButton from "@/components/ui/HexButton";
import {
  Mail,
  User,
  AtSign,
  Phone,
  ChevronDown,
  Search,
  X,
} from "lucide-react-native";
import { useAppDispatch } from "@/store/hooks";
import { register as registerThunk } from "@/redux/auth/auth.thunks";

type Country = {
  name: string;
  code: string;
  dialCode: string;
  flagPng: string;
};

type FormValues = {
  fullname: string;
  username: string;
  email: string;
  phoneNumber: string;
};

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
    .matches(/^[0-9]{6,}$/, "Enter a valid phone number")
    .required("Phone number is required"),
});

const maskEmail = (v: string) => {
  if (!v.includes("@")) return v;
  const [user, domain] = v.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${"*".repeat(Math.max(3, user.length - 2))}${user.slice(-1)}@${domain}`;
};

const FALLBACK_COUNTRIES: Country[] = [
  {
    name: "Nigeria",
    code: "NG",
    dialCode: "+234",
    flagPng: "https://flagcdn.com/w40/ng.png",
  },
  {
    name: "United States",
    code: "US",
    dialCode: "+1",
    flagPng: "https://flagcdn.com/w40/us.png",
  },
  {
    name: "United Kingdom",
    code: "GB",
    dialCode: "+44",
    flagPng: "https://flagcdn.com/w40/gb.png",
  },
];

export default function SignupScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormValues>({
    mode: "onChange",
    resolver: yupResolver(schema),
    defaultValues: { fullname: "", username: "", email: "", phoneNumber: "" },
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [search, setSearch] = useState("");
  const [focusedField, setFocusedField] = useState<
    "fullname" | "username" | "email" | "phoneNumber" | null
  >(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await axios.get(
          "https://restcountries.com/v3.1/all?fields=name,idd,cca2,flags"
        );
        if (!isMounted) return;

        const parsed: Country[] = res.data
          .map((c: any) => {
            const root = c?.idd?.root ?? "";
            const suffix =
              Array.isArray(c?.idd?.suffixes) && c.idd.suffixes.length > 0
                ? c.idd.suffixes[0]
                : "";
            const dial = `${root}${suffix}`.trim();
            if (!dial) return null;
            return {
              name: c?.name?.common ?? "",
              code: c?.cca2 ?? "",
              dialCode: dial.startsWith("+") ? dial : `+${dial}`,
              flagPng: c?.flags?.png ?? "",
            } as Country;
          })
          .filter(Boolean)
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));

        const finalList = parsed.length ? parsed : FALLBACK_COUNTRIES;
        setCountries(finalList);

        const defaultC =
          finalList.find((c) => c.code === "NG") ??
          finalList[0] ??
          FALLBACK_COUNTRIES[0];
        setSelectedCountry(defaultC);
      } catch (e) {
        setCountries(FALLBACK_COUNTRIES);
        setSelectedCountry(FALLBACK_COUNTRIES[0]);
        console.log("Using fallback country list (network error).");
      } finally {
        if (isMounted) setLoadingCountries(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredCountries = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q)
    );
  }, [countries, search]);

  const onSubmit = async (values: FormValues) => {
    try {
      await dispatch(
        registerThunk({
          fullname: values.fullname,
          username: values.username,
          email: values.email,
        })
      ).unwrap();

      router.push({
        pathname: "/otp-verification",
        params: {
          email: maskEmail(values.email),
          type: "signup",
          phoneNumber: `${selectedCountry?.dialCode ?? ""}${values.phoneNumber}`,
        },
      });
    } catch (err) {
      console.log("Register failed:", err);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        className="flex-1 bg-[#F5F7FB]"
      >
        <StatusBar style="dark" />
        <KeyboardAwareScrollView
          enableOnAndroid
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 32,
          }}
        >
          <View className="flex-row justify-between gap-2">
            <View className="h-1.5 flex-1 rounded-full bg-primary" />
            <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
            <View className="h-1.5 flex-1 rounded-full bg-gray-200" />
          </View>
          {/* Title + subtitle */}
          <View className="mt-6 mb-7">
            <Text className="font-kumbhBold text-3xl text-[#111827]">
              Create an Account
            </Text>
            <Text className="mt-2 font-kumbh text-[15px] leading-6 text-gray-500">
              Manage projects, oversee finances, and stay connected with your
              team all within Hexavian ERP.
            </Text>
          </View>

          {/* Full Name */}
          <View>
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Full Name
            </Text>
            <Controller
              control={control}
              name="fullname"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "fullname";
                return (
                  <View
                    className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                      isFocused ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    <User
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Enter Full Name"
                      onFocus={() => setFocusedField("fullname")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "fullname" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      className="ml-3 h-full flex-1"
                    />
                  </View>
                );
              }}
            />
            {errors.fullname && (
              <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                {errors.fullname.message}
              </Text>
            )}
          </View>

          {/* Username */}
          <View className="mt-4">
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Username
            </Text>
            <Controller
              control={control}
              name="username"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "username";
                return (
                  <View
                    className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                      isFocused ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    <AtSign
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Enter Username"
                      onFocus={() => setFocusedField("username")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "username" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      className="ml-3 h-full flex-1"
                    />
                  </View>
                );
              }}
            />
            {errors.username && (
              <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                {errors.username.message}
              </Text>
            )}
          </View>

          {/* Email */}
          <View className="mt-4">
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Email Address
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "email";
                return (
                  <View
                    className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-4 ${
                      isFocused ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    <Mail
                      size={18}
                      color={isFocused ? "#4C5FAB" : "#6B7280"}
                    />
                    <CustomTextInput
                      placeholder="Enter Email Address"
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "email" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={onChange}
                      value={value}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="ml-3 h-full flex-1"
                    />
                  </View>
                );
              }}
            />
            {errors.email && (
              <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Phone Number */}
          <View className="mt-4">
            <Text className="mb-2 font-kumbhBold text-sm text-[#374151]">
              Phone Number
            </Text>
            <Controller
              control={control}
              name="phoneNumber"
              render={({ field: { onChange, onBlur, value } }) => {
                const isFocused = focusedField === "phoneNumber";
                return (
                  <View
                    className={`h-14 w-full flex-row items-center rounded-2xl border bg-white px-3 ${
                      isFocused ? "border-primary" : "border-gray-200"
                    }`}
                  >
                    {/* Code/flag trigger */}
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      className="flex-row items-center rounded-lg px-1 py-1"
                    >
                      {selectedCountry ? (
                        <Image
                          source={{ uri: selectedCountry.flagPng }}
                          className="mr-2 h-6 w-6 rounded-sm"
                        />
                      ) : (
                        <Phone size={18} color="#6B7280" />
                      )}
                      <Text className="mr-1 font-kumbh text-[#111827]">
                        {selectedCountry?.dialCode ?? ""}
                      </Text>
                      <ChevronDown size={16} color="#6B7280" />
                    </Pressable>

                    <View className="mx-3 h-7 w-px bg-gray-200" />

                    {/* Local phone input */}
                    <CustomTextInput
                      placeholder="Enter Phone Number"
                      onFocus={() => setFocusedField("phoneNumber")}
                      onBlur={() => {
                        setFocusedField((cur) =>
                          cur === "phoneNumber" ? null : cur,
                        );
                        onBlur();
                      }}
                      onChangeText={(t) => onChange(t.replace(/[^\d]/g, ""))}
                      value={value}
                      keyboardType="phone-pad"
                      className="h-full flex-1"
                    />
                  </View>
                );
              }}
            />
            {errors.phoneNumber && (
              <Text className="mt-1.5 font-kumbh text-xs text-red-500">
                {errors.phoneNumber.message}
              </Text>
            )}
          </View>

          {/* Submit */}
          <View className="mt-8">
            <HexButton
              title={isSubmitting ? "Please wait..." : "Continue"}
              onPress={handleSubmit(onSubmit)}
              disabled={
                !isValid || isSubmitting || loadingCountries || !selectedCountry
              }
            />
          </View>

          <View className="mt-6 items-center">
            <Text className="font-kumbh text-gray-600">
              Already have an account?{" "}
              <Text
                className="font-kumbhBold text-primary"
                onPress={() => router.push("/(auth)/login")}
              >
                Log in
              </Text>
            </Text>
          </View>
        </KeyboardAwareScrollView>

        {/* Country Picker Modal */}
        <Modal
          visible={pickerOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerOpen(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[75%] rounded-t-[28px] border-t border-gray-100 bg-white p-5">
              <View className="mb-3 items-center">
                <View className="h-1.5 w-11 rounded-full bg-gray-200" />
              </View>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="font-kumbhBold text-lg text-[#111827]">
                  Select your country
                </Text>
                <Pressable onPress={() => setPickerOpen(false)} className="p-2">
                  <X size={20} color="#111827" />
                </Pressable>
              </View>

              {/* Search */}
              <View className="mb-3 h-12 flex-row items-center rounded-2xl border border-gray-200 bg-[#F5F7FB] px-3.5">
                <Search size={18} color="#6B7280" />
                <CustomTextInput
                  placeholder="Search country or code"
                  className="ml-2 h-full flex-1"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>

              {loadingCountries ? (
                <View className="items-center py-6">
                  <ActivityIndicator />
                  <Text className="mt-2 font-kumbh text-gray-500">
                    Loading countries…
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.code}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        setSelectedCountry(item);
                        setPickerOpen(false);
                      }}
                      className="flex-row items-center rounded-xl px-2 py-3"
                    >
                      <Image
                        source={{ uri: item.flagPng }}
                        className="mr-3 h-6 w-6 rounded-sm"
                      />
                      <Text className="flex-1 font-kumbh text-[#111827]">
                        {item.name}
                      </Text>
                      <Text className="font-kumbhBold text-gray-600">
                        {item.dialCode}
                      </Text>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => (
                    <View className="h-px bg-gray-100" />
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
