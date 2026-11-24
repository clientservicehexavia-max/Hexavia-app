// app/(admin)/finance/receivables/[id].tsx
import PlatformAdaptiveHeader from "@/components/common/PlatformAdaptiveHeader";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClientById } from "@/redux/client/client.thunks";
import { makeSelectClientById } from "@/redux/client/client.selectors";
import {
  selectAmountPaid,
  selectDerivedRemaining,
  selectRows,
  selectTotalAmount,
} from "@/redux/installments/installments.selectors";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowDownLeft, CalendarDays, Plus } from "lucide-react-native";
import React, { useEffect } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(
    n
  );

const dmy = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function ReceivableDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();

  // load client
  useEffect(() => {
    if (id) dispatch(fetchClientById(id) as any);
  }, [dispatch, id]);

  const selectClient = makeSelectClientById(id || "");
  const client = useAppSelector(selectClient);

  // installments (current local state; replace later with your GET thunk when available)
  const rows = useAppSelector(selectRows);
  const totalAmount = useAppSelector(selectTotalAmount);
  const amountPaid = useAppSelector(selectAmountPaid);
  const remaining = useAppSelector(selectDerivedRemaining);

  const isIOS = Platform.OS === "ios";

  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F7FB]"
      edges={isIOS ? ["left", "right"] : ["top", "left", "right", "bottom"]}
    >
      {/* Header */}
      <PlatformAdaptiveHeader title="Receivable" backgroundColor="#F5F7FB" />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-3 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Top card */}
        <View className="rounded-[28px] bg-white border border-gray-100 px-5 py-7 items-center mb-4">
          <View className="h-12 w-12 rounded-2xl bg-emerald-50 items-center justify-center mb-3">
            <ArrowDownLeft size={22} color="#059669" />
          </View>
          <View className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 mb-2.5">
            <Text className="text-[11px] tracking-wider text-emerald-700 font-kumbhBold">
              TOTAL RECEIVABLE AMOUNT
            </Text>
          </View>
          <Text className="text-[28px] font-kumbhBold text-[#111827]">
            {NGN(Number(client?.payableAmount || 0))}
          </Text>
        </View>

        {/* Client panel */}
        <View className="rounded-[28px] bg-white border border-gray-100 px-5 py-2 mb-5">
          <KV label="Client" value={client?.name || "—"} />
          <KV label="Project" value={client?.projectName || "—"} />
          <KV label="Status" value={client?.status || "—"} />
          <KV label="Created" value={dmy(client?.createdAt)} isLast />
        </View>

        {/* Installments summary */}
        <View className="flex-row items-center justify-between mb-2.5 px-1">
          <Text className="text-[15px] font-kumbhBold text-[#111827]">
            Installments
          </Text>
          {rows && rows.length > 0 ? (
            <View className="rounded-full bg-[#EEF2FF] px-2.5 py-0.5">
              <Text className="text-[12px] font-kumbhBold text-primary">
                {rows.filter((r) => Boolean(r.due)).length}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Installments list */}
        <View className="rounded-[28px] bg-white border border-gray-100 overflow-hidden">
          {rows && rows.some((r) => Boolean(r.due)) ? (
            rows.map((r, idx) =>
              r.due ? (
                <View
                  key={(r.paymentId || r._localId || String(idx)) + ""}
                  className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2.5">
                    <View className="h-8 w-8 rounded-xl bg-[#EEF2FF] items-center justify-center">
                      <CalendarDays size={15} color="#4C5FAB" />
                    </View>
                    <Text className="text-[13px] text-[#4B5563] font-kumbh">
                      Due {r.due || "—"}
                    </Text>
                  </View>
                  <Text className="text-[14px] font-kumbhBold text-[#111827]">
                    {NGN(Number(r.amount || 0))}
                  </Text>
                </View>
              ) : null,
            )
          ) : (
            <View className="px-5 py-8 items-center">
              <Text className="text-[#6B7280] font-kumbh text-[13px]">
                No installments added yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View className="px-4 pb-5 pt-2 flex-row items-center gap-3">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(admin)/clients/installments",
              params: { clientId: id },
            })
          }
          className="flex-1 h-14 rounded-2xl bg-white border border-[#4C5FAB] items-center justify-center flex-row px-3"
        >
          <View className="w-6 h-6 rounded-full bg-[#EEF2FF] items-center justify-center mr-2">
            <Plus size={14} color="#4C5FAB" />
          </View>
          <Text
            className="text-[#4C5FAB] text-[13px] font-kumbhBold"
            numberOfLines={1}
          >
            Installments
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(admin)")}
          className="flex-1 h-14 rounded-2xl bg-[#4C5FAB] items-center justify-center active:opacity-90"
        >
          <Text className="text-white text-[14px] font-kumbhBold">
            Back to Home
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function KV({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${
        isLast ? "" : "border-b border-gray-100"
      }`}
    >
      <Text className="text-[13px] text-[#6B7280] font-kumbh">{label}</Text>
      <Text className="text-[14px] font-kumbhBold text-[#111827]">{value}</Text>
    </View>
  );
}
