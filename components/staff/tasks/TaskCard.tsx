import { STATUS_META, Task } from "@/features/staff/types";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import TaskDetailModal from "./modals/TaskDetailModal";

export default function TaskCard({
    task,
    openDetail = false,
}: {
    task: Task;
    openDetail?: boolean;
}) {
    const [show, setShow] = useState(false);
    const statusColor = STATUS_META[task.status]?.bgColor ?? "#E5E7EB";

    return (
        <>
            <Pressable
                onPress={() => setShow(true)}
                className="rounded-2xl border px-3 py-3"
                style={{ borderColor: statusColor, backgroundColor: "#FFFFFF" }}
            >
                <View className="flex-row items-center mb-1">
                    <Text
                        className="font-kumbh text-[11px] px-2 py-[2px] rounded-full"
                        style={{
                            backgroundColor:
                                task.channelCode === "personal"
                                    ? "#E1F5FE"
                                    : "#EEF2FF",
                            color:
                                task.channelCode === "personal"
                                    ? "#01579B"
                                    : "#3730A3",
                        }}
                    >
                        {task.channelCode === "personal"
                            ? "Personal"
                            : task.channelCode}
                    </Text>
                </View>
                <Text className="font-kumbh text-[#111827] text-base capitalize">
                    {task.title}
                </Text>
                {task.description ? (
                    <Text className="font-kumbh text-[#6B7280] mt-1 text-sm">
                        {task.description}
                    </Text>
                ) : null}
            </Pressable>

            <TaskDetailModal
                visible={show}
                onClose={() => setShow(false)}
                task={task}
            />
        </>
    );
}
