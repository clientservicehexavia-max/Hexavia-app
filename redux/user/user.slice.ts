import { RootState } from "@/store";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { fetchProfile, linkProjectCode, updateProfile } from "./user.thunks";
import type { UserPhase, UserState } from "./user.types";

const initialState: UserState = {
    user: null,
    token: null,
    phase: "idle",
    error: null,
    lastEmailForOtp: null,
};

const slice = createSlice({
    name: "user",
    initialState,
    reducers: {
        setPhase(state, action: PayloadAction<UserPhase>) {
            state.phase = action.payload;
        },
        setError(state, action: PayloadAction<string | null>) {
            state.error = action.payload;
        },
        setLastEmail(state, action: PayloadAction<string | null>) {
            state.lastEmailForOtp = action.payload;
        },
        setUser(state, action: PayloadAction<UserState["user"]>) {
            state.user = action.payload;
        },
        setToken(state, action: PayloadAction<UserState["token"]>) {
            state.token = action.payload;
        },
        setSession(
            state,
            action: PayloadAction<{
                user: UserState["user"];
                token: string | null;
            }>,
        ) {
            state.user = action.payload.user ?? null;
            state.token = action.payload.token ?? null;
            state.phase = action.payload.user ? "authenticated" : "idle";
            state.error = null;
        },
        signOut(state) {
            state.user = null;
            state.token = null;
            state.phase = "idle";
            state.error = null;
            state.lastEmailForOtp = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProfile.pending, (state) => {
                state.phase = state.user ? "authenticated" : "loading";
                state.error = null;
            })
            .addCase(fetchProfile.fulfilled, (state, { payload }) => {
                state.user = payload;
                state.phase = "authenticated";
            })
            .addCase(fetchProfile.rejected, (state, { payload }) => {
                state.error = (payload as string) || "Failed to load profile";
                if (!state.user) state.phase = "idle";
            });

        builder
            .addCase(updateProfile.pending, (state) => {
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, { payload }) => {
                state.user = payload;
            })
            .addCase(updateProfile.rejected, (state, { payload }) => {
                state.error = (payload as string) || "Failed to update profile";
            })
            .addCase(linkProjectCode.pending, (state) => {
                state.error = null;
            })
            .addCase(linkProjectCode.fulfilled, (state, { payload }) => {
                state.user = payload;
            })
            .addCase(linkProjectCode.rejected, (state, { payload }) => {
                state.error = (payload as string) || "Failed to link project";
            });
    },
});

export const {
    setPhase,
    setError,
    setLastEmail,
    setUser,
    setToken,
    setSession,
    signOut,
} = slice.actions;

export default slice.reducer;

export const selectUser = (s: RootState) => s.user.user as UserState["user"];
export const selectRole = (s: RootState) => s.user.user?.role ?? null;
export const selectPhase = (s: RootState) => s.user.phase as UserPhase;
