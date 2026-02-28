import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setIsReady(true);
    };
    init();
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady || !navigationState?.key) return;
    
    const inAuthGroup = segments[0] === '(auth)';
    
    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated and not already in auth group
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home if authenticated but still in auth group
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isReady, navigationState?.key]);

  if (!isReady || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
