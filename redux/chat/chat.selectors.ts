import type { RootState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";

export const selectChatState = (s: RootState) => s.chat;
export const selectActiveChatChannelId = createSelector(
    selectChatState,
    (s) => s.activeChannelId,
);
export const selectCurrentThread = createSelector(selectChatState, (s) =>
    s.currentThreadId ? s.threads[s.currentThreadId] : null,
);
export const selectMessagesForCurrent = createSelector(selectChatState, (s) => {
    const t = s.currentThreadId ? s.threads[s.currentThreadId] : null;
    return t ? t.messages.map((id) => s.messages[id]).filter(Boolean) : [];
});
