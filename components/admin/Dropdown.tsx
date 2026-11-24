import clsx from "clsx";
import { ChevronDown } from "lucide-react-native";
import { Pressable, Text } from "react-native";

export default function Dropdown({
  value,
  open,
  onToggle,
}: {
  value: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={clsx(
        "flex-row items-center justify-between rounded-2xl border border-gray-200 bg-[#F9FAFB] px-4 py-3.5"
      )}
    >
      <Text className="font-kumbh text-[15px] text-[#111827]">{value}</Text>
      <ChevronDown size={18} color="#6B7280" />
    </Pressable>
  );
}
