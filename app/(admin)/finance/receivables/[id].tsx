// app/(admin)/finance/receivables/[id].tsx
import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Plus } from "lucide-react-native";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchClientById } from "@/redux/client/client.thunks";
import { makeSelectClientById } from "@/redux/client/client.selectors";

import {
  selectRows,
  selectTotalAmount,
  selectAmountPaid,
  selectDerivedRemaining,
} from "@/redux/installments/installments.selectors";

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-5 pt-5 pb-3 flex-row items-center justify-between gap-4">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center"
        >
          <ArrowLeft size={24} color="#111827" />
        </Pressable>
        <Text className="text-3xl font-kumbhBold text-[#111827]">
          Receivable
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        {/* Top card */}
        <View className="rounded-2xl bg-gray-100 border border-[#4C5FAB]/30 px-4 py-10 items-center my-4">
          <Text className="text-[26px] font-kumbhBold text-[#111827]">
            {NGN(Number(client?.payableAmount || 0))}
          </Text>
          <Text className="mt-1 text-[12px] tracking-widest text-gray-600 font-kumbhBold">
            TOTAL RECEIVABLE AMOUNT
          </Text>
        </View>

        {/* Client panel */}
        <View className="rounded-2xl bg-gray-100 px-5 py-6 mb-4">
          <KV label="Client" value={client?.name || "—"} />
          <KV label="Project" value={client?.projectName || "—"} />
          <KV label="Status" value={client?.status || "—"} />
          <KV label="Created" value={dmy(client?.createdAt)} />
        </View>

        {/* Installments summary */}
        <Text className="text-base font-kumbhBold text-[#111827] mb-2">
          Installments
        </Text>
        {/* <View className="rounded-2xl bg-gray-100 px-5 py-6 mb-3">
          <KV label="Plan Total" value={NGN(Number(totalAmount || 0))} />
          <KV label="Amount Paid" value={NGN(Number(amountPaid || 0))} />
          <KV label="Remaining" value={NGN(Number(remaining || 0))} />
        </View> */}

        {/* Installments list */}
        <View className="rounded-2xl bg-white border border-gray-200">
          {rows && rows.length > 0 ? (
            rows.map(
              (r, idx) =>
                r.due && (
                  <View
                    key={(r.paymentId || r._localId || String(idx)) + ""}
                    className="px-5 py-4 border-b border-gray-100 flex-row items-center justify-between"
                  >
                    <Text className="text-sm text-gray-600 font-kumbh">
                      Due {r.due || "—"}
                    </Text>
                    <Text className="text-sm font-kumbhBold text-[#111827]">
                      {NGN(Number(r.amount || 0))}
                    </Text>
                  </View>
                )
            )
          ) : (
            <Text className="px-5 py-6 text-gray-500 font-kumbh">
              No installments added yet.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Bottom buttons */}
      <View className="px-5 pb-6 flex-row items-center justify-between gap-3">
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(admin)/clients/installments",
              params: { clientId: id },
            })
          }
          className="flex-1 h-12 rounded-2xl border border-[#4C5FAB] items-center justify-center flex-row"
        >
          <View className="w-6 h-6 rounded-full bg-[#4C5FAB]/10 items-center justify-center mr-2">
            <Plus size={16} color="#4C5FAB" />
          </View>
          <Text className="text-[#4C5FAB] font-kumbhBold">
            Manage Installments
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(admin)")}
          className="flex-1 h-12 rounded-2xl bg-[#4C5FAB] items-center justify-center"
        >
          <Text className="text-white font-kumbhBold">Back to Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text className="text-[15px] text-gray-500 font-kumbh">{label}</Text>
      <Text className="text-[15px] font-kumbhBold text-[#111827]">{value}</Text>
    </View>
  );
}
