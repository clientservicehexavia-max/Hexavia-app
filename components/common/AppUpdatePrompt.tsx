import * as Updates from "expo-updates";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Modal,
  Platform,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Check, CloudDownload } from "lucide-react-native";

import { clearPendingUpdate, setPendingUpdate } from "@/storage/appUpdate";

export default function AppUpdatePrompt() {
  const [downloading, setDownloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [percent, setPercent] = useState(0);

  // Listen to native updates state machine changes (both available & pending)
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();

  const dismissedRef = useRef(false);
  const isPromptingRef = useRef(false);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0.7)).current;

  // Pulse & bounce loops while downloading
  useEffect(() => {
    if (!downloading || isComplete) return;

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.18,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 4,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();
    bounceLoop.start();

    return () => {
      pulseLoop.stop();
      bounceLoop.stop();
    };
  }, [downloading, isComplete, pulseAnim, bounceAnim]);

  // Listener to track numeric percentage for UI
  useEffect(() => {
    const listenerId = progressAnim.addListener(({ value }) => {
      setPercent(Math.min(100, Math.max(0, Math.round(value))));
    });
    return () => {
      progressAnim.removeListener(listenerId);
    };
  }, [progressAnim]);

  const handleDismiss = useCallback(async () => {
    dismissedRef.current = true;
    try {
      await setPendingUpdate({
        ota: true,
        latestVersion: null,
        storeUrl: null,
        checkedAt: Date.now(),
      });
    } catch {
      // ignore
    }
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      if (!Updates.fetchUpdateAsync || !Updates.reloadAsync) return;

      setDownloading(true);
      setIsComplete(false);
      progressAnim.setValue(0);
      successScaleAnim.setValue(0.7);

      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Smooth progress animation while bundle downloads
      Animated.timing(progressAnim, {
        toValue: 88,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      await Updates.fetchUpdateAsync();

      // Complete to 100%
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();

      setIsComplete(true);
      Animated.spring(successScaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }).start();

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {}

      try {
        await clearPendingUpdate();
      } catch {}

      setTimeout(async () => {
        try {
          await Updates.reloadAsync();
        } catch {
          setDownloading(false);
        }
      }, 750);
    } catch (error) {
      console.warn("[AppUpdatePrompt] Download failed:", error);
      setDownloading(false);
      Alert.alert(
        "Update Failed",
        "Could not download the update. Please try again later.",
      );
    }
  }, [progressAnim, successScaleAnim]);

  const promptForDownload = useCallback(() => {
    if (dismissedRef.current || isPromptingRef.current || downloading) return;
    isPromptingRef.current = true;

    Alert.alert(
      "Update Available",
      "A new update is available. Would you like to update now?",
      [
        {
          text: "Dismiss",
          style: "cancel",
          onPress: () => {
            isPromptingRef.current = false;
            handleDismiss();
          },
        },
        {
          text: "Download",
          onPress: () => {
            isPromptingRef.current = false;
            handleDownload();
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          isPromptingRef.current = false;
          handleDismiss();
        },
      },
    );
  }, [downloading, handleDismiss, handleDownload]);

  const promptForRestart = useCallback(() => {
    if (dismissedRef.current || isPromptingRef.current || downloading) return;
    isPromptingRef.current = true;

    Alert.alert(
      "Update Ready",
      "A new update has already been downloaded. Would you like to restart now to apply it?",
      [
        {
          text: "Later",
          style: "cancel",
          onPress: () => {
            isPromptingRef.current = false;
            handleDismiss();
          },
        },
        {
          text: "Restart Now",
          onPress: async () => {
            isPromptingRef.current = false;
            try {
              await clearPendingUpdate();
              await Updates.reloadAsync();
            } catch (err) {
              console.warn("[AppUpdatePrompt] Reload failed:", err);
            }
          },
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {
          isPromptingRef.current = false;
          handleDismiss();
        },
      },
    );
  }, [downloading, handleDismiss]);

  // Reactive listener to Expo native updates state
  useEffect(() => {
    if (dismissedRef.current || downloading || isPromptingRef.current) return;

    if (isUpdatePending) {
      console.log("[AppUpdatePrompt] Detected pending update on device");
      promptForRestart();
    } else if (isUpdateAvailable) {
      console.log("[AppUpdatePrompt] Detected update available from native state");
      promptForDownload();
    }
  }, [isUpdateAvailable, isUpdatePending, downloading, promptForRestart, promptForDownload]);

  // Manual check function (runs on mount and when app returns to foreground)
  const checkManually = useCallback(async () => {
    try {
      if (Platform.OS === "web" || !Updates.checkForUpdateAsync) return;
      if (!Updates.isEnabled && !__DEV__) {
        console.log("[AppUpdatePrompt] Updates not enabled in current environment");
        return;
      }

      console.log("[AppUpdatePrompt] Checking for updates on server...");
      const update = await Updates.checkForUpdateAsync();
      console.log("[AppUpdatePrompt] Check result:", update);

      if (update?.isAvailable) {
        promptForDownload();
      }
    } catch (error) {
      console.log("[AppUpdatePrompt] Manual check error:", error);
    }
  }, [promptForDownload]);

  useEffect(() => {
    // Initial check shortly after mount
    const timer = setTimeout(() => {
      checkManually();
    }, 600);

    // Re-check whenever user returns to the app from background
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        console.log("[AppUpdatePrompt] App foregrounded, re-checking for updates...");
        checkManually();
      }
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [checkManually]);

  if (Platform.OS === "web" || !downloading) return null;

  return (
    <Modal
      visible={downloading}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        /* prevent accidental dismissal during download */
      }}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 100}
          tint="dark"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        <View className="w-full max-w-sm rounded-[32px] bg-white p-7 items-center shadow-2xl border border-gray-100">
          {/* Animated Icon Container */}
          <View className="relative items-center justify-center mb-5">
            {/* Outer Pulsing Glow */}
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.18],
                  outputRange: [0.6, 0.15],
                }),
              }}
              className={`absolute w-24 h-24 rounded-full ${
                isComplete ? "bg-emerald-500/20" : "bg-[#4C5FAB]/20"
              }`}
            />

            {/* Middle Circle */}
            <View
              className={`w-20 h-20 rounded-full items-center justify-center ${
                isComplete ? "bg-emerald-50" : "bg-[#4C5FAB]/10"
              }`}
            >
              {/* Core Badge */}
              <Animated.View
                style={{
                  transform: isComplete
                    ? [{ scale: successScaleAnim }]
                    : [{ translateY: bounceAnim }],
                }}
                className={`w-14 h-14 rounded-full items-center justify-center shadow-md ${
                  isComplete
                    ? "bg-emerald-500 shadow-emerald-500/30"
                    : "bg-[#4C5FAB] shadow-[#4C5FAB]/30"
                }`}
              >
                {isComplete ? (
                  <Check size={28} color="#FFFFFF" strokeWidth={2.8} />
                ) : (
                  <CloudDownload
                    size={26}
                    color="#FFFFFF"
                    strokeWidth={2.2}
                  />
                )}
              </Animated.View>
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text className="text-xl font-kumbhBold text-gray-900 text-center">
            {isComplete ? "Update Ready!" : "Downloading Update"}
          </Text>
          <Text className="text-xs font-kumbh text-gray-500 text-center mt-1.5 px-2">
            {isComplete
              ? "Applying the latest changes and restarting..."
              : "Fetching the latest features and performance improvements..."}
          </Text>

          {/* Progress Track & Fill */}
          <View className="w-full mt-6">
            <View className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
              <Animated.View
                style={{
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                }}
                className={`h-full rounded-full ${
                  isComplete ? "bg-emerald-500" : "bg-[#4C5FAB]"
                }`}
              />
            </View>

            {/* Percent & Status row */}
            <View className="flex-row items-center justify-between mt-2.5 px-0.5">
              <Text className="text-[11px] font-kumbh text-gray-400">
                {isComplete ? "Restarting..." : "Please keep app open"}
              </Text>
              <Text
                className={`text-xs font-kumbhBold ${
                  isComplete ? "text-emerald-600" : "text-[#4C5FAB]"
                }`}
              >
                {percent}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
