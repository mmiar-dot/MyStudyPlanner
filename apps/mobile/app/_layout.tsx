import React, { useEffect, useMemo, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet, Platform, Text, useColorScheme } from "react-native";
import { useAuthStore } from "../src/store/authStore";
import { ThemeProvider, useTheme } from "../src/contexts/ThemeContext";
import { runAutoUpdate } from "../src/services/updater";

/**
 * Safely detects if we're running inside a Tauri WebView (desktop).
 * - Works on web (Tauri) and stays false on iOS/Android/regular web.
 */
function isTauriRuntime(): boolean {
  if (Platform.OS !== "web") return false;
  // Tauri injects window.__TAURI__ (v1) / window.__TAURI_INTERNALS__ (some setups)
  const w = globalThis as any;
  return Boolean(w?.__TAURI__ || w?.__TAURI_INTERNALS__);
}

type UpdateState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "downloading"; version?: string }
  | { status: "installing"; version?: string }
  | { status: "error"; message: string };

export default function RootLayout() {
  const { checkAuth, isLoading, isAuthenticated, theme } = useAuthStore();
  const systemColorScheme = useColorScheme();

  const [isReady, setIsReady] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateState>({ status: "idle" });
  const [debugInfo, setDebugInfo] = useState<string>("Starting...");

  // Determine actual theme
  const actualTheme = theme === 'system' ? systemColorScheme || 'light' : theme;

  const segments = useSegments();
  const router = useRouter();

  const inAuthGroup = useMemo(() => segments?.[0] === "(auth)", [segments]);

  // 1) Desktop (Tauri) updater check: safe + non-breaking on mobile/web
  useEffect(() => {
    const runUpdater = async () => {
      // Only run in Tauri environment, skip on web browser
      if (!isTauriRuntime()) {
        return;
      }

      try {
        setUpdateState({ status: "checking" });

        // Dynamic import only in Tauri context - wrap in try-catch for web safety
        let check: any;
        try {
          const updaterModule = await import("@tauri-apps/plugin-updater");
          check = updaterModule.check;
        } catch {
          // Module not available - not in Tauri context
          setUpdateState({ status: "idle" });
          return;
        }
        
        const update = await check();

        // No update
        if (!update) {
          setUpdateState({ status: "idle" });
          return;
        }

        setUpdateState({ status: "downloading", version: update.version });
        await update.downloadAndInstall();

        setUpdateState({ status: "installing", version: update.version });

        // Best effort relaunch:
        try {
          const { relaunch } = await import("@tauri-apps/plugin-process");
          await relaunch();
          return;
        } catch {
          // Fallback: reload the webview
          if (typeof window !== "undefined") window.location.reload();
        }
      } catch (e: any) {
        // Don't block app if update check fails (common in dev)
        setUpdateState({
          status: "error",
          message: e?.message ? String(e.message) : "Update check failed",
        });

        // Hide the error after a short time (optional)
        setTimeout(() => setUpdateState({ status: "idle" }), 2500);
      }
    };

    runUpdater();
  }, []);

  // 2) Auth init - with timeout to prevent infinite loading
  useEffect(() => {
    const init = async () => {
      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('Auth check timeout - continuing without auth');
        setIsReady(true);
      }, 5000); // 5 second timeout
      
      try {
        await checkAuth();
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        clearTimeout(timeoutId);
        setIsReady(true);
      }
    };
    init();
  }, []);

  // 3) Route guard
  useEffect(() => {
    if (!isReady) return;

    // Allow access to legal page without authentication
    const currentPath = segments?.join('/') || '';
    const isLegalPage = currentPath === 'legal' || segments?.[0] === 'legal';
    
    if (!isAuthenticated && !inAuthGroup && !isLegalPage) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, inAuthGroup, isReady, router, segments]);

  // Loading / Update screens - Don't block on isLoading after isReady
  const shouldBlockUI =
    !isReady ||
    updateState.status === "checking" ||
    updateState.status === "downloading" ||
    updateState.status === "installing";

  if (shouldBlockUI) {
    const label =
      updateState.status === "checking"
        ? "Vérification des mises à jour…"
        : updateState.status === "downloading"
          ? `Téléchargement de la mise à jour${updateState.version ? ` (${updateState.version})` : ""}…`
          : updateState.status === "installing"
            ? "Installation…"
            : "Chargement…";

    const bgColor = actualTheme === 'dark' ? '#111827' : '#FFFFFF';
    const textColor = actualTheme === 'dark' ? '#F9FAFB' : '#111827';

    return (
      <View style={[styles.loading, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={[styles.loadingText, { color: textColor }]}>{label}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <StatusBar style={actualTheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="badges" />
        <Stack.Screen name="calendar-sync" />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#111827",
  },
});
