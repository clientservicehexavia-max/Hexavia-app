// store/index.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";

import {
    FLUSH,
    PAUSE,
    PERSIST,
    persistStore,
    PURGE,
    REGISTER,
    REHYDRATE,
} from "redux-persist";

import adminReducer from "@/redux/admin/admin.slice";
import authReducer from "@/redux/auth/auth.slice";
import channelLinksReducer from "@/redux/channelLinks/channelLinks.slice";
import channelNotesReducer from "@/redux/channelNotes/channelNotes.slice";
import channelsReducer from "@/redux/channels/channels.slice";
import { chatMiddleware } from "@/redux/chat/chat.middleware";
import chatReducer from "@/redux/chat/chat.slice";
import clientReducer from "@/redux/client/client.slice";
import financeReducer from "@/redux/finance/finance.slice";
import installmentsReducer from "@/redux/installments/installments.slice";
import notificationsReducer from "@/redux/notifications/notifications.slice";
import partnershipReducer from "@/redux/partnership/partnership.slice";
import personalTasksReducer from "@/redux/personalTasks/personalTasks.slice";
import sanctionsReducer from "@/redux/sanctions/sanctions.slice";
import uploadReducer from "@/redux/upload/upload.slice";
import userReducer from "@/redux/user/user.slice";

// 1) Define rootReducer so types don't depend on the constructed store
export const rootReducer = combineReducers({
    auth: authReducer,
    user: userReducer,
    channels: channelsReducer,
    channelLinks: channelLinksReducer,
    channelNotes: channelNotesReducer,
    upload: uploadReducer,
    sanctions: sanctionsReducer,
    admin: adminReducer,
    chat: chatReducer,
    client: clientReducer,
    installments: installmentsReducer,
    finance: financeReducer,
    personalTasks: personalTasksReducer,
    notifications: notificationsReducer,
    partnership: partnershipReducer,
});

// 2) Export RootState from the reducer (no circular reference)
export type RootState = ReturnType<typeof rootReducer>;

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // ignore redux-persist actions
                ignoredActions: [
                    FLUSH,
                    REHYDRATE,
                    PAUSE,
                    PERSIST,
                    PURGE,
                    REGISTER,
                ],
            },
        }).concat(chatMiddleware),
});

export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
