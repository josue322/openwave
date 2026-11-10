import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { getDatabase } from '../src/core/database/connection';
import { ErrorBoundary } from '../src/core/errors/ErrorBoundary';

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database and run pending migrations on startup
    getDatabase().catch((err) => {
      console.error('Failed to initialize OpenWave database:', err);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="player/index"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />
        </Stack>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

