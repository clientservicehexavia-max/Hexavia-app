import clsx from "clsx";
import { Text } from "react-native";

export default function SectionTitle({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <Text
            className={clsx(
                "text-base font-kumbhBold text-[#111827]",
                className,
            )}
        >
            {children}
        </Text>
    );
}
