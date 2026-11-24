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
                className="rounded-[20px] border border-gray-100 bg-white p-4 flex-row items-stretch"
            >
                <View
                    className="w-1.5 rounded-full mr-3.5"
                    style={{ backgroundColor: statusColor }}
                />
                <View className="flex-1">
                    <Text className="font-kumbhBold text-[#111827] text-[15px] capitalize">
                        {task.title}
                    </Text>
                    {task.description ? (
                        <Text
                            className="font-kumbh text-[#6B7280] mt-1 text-[13px] leading-5"
                            numberOfLines={2}
                        >
                            {task.description}
                        </Text>
                    ) : null}
                </View>
            </Pressable>

            <TaskDetailModal
                visible={show}
                onClose={() => setShow(false)}
                task={task}
            />
        </>
    );
}
