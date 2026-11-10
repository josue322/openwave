import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/colors';
import { getDatabase } from '../src/core/database/connection';
import { ErrorBoundary } from '../src/core/errors/ErrorBoundary';
import { TrackDao } from '../src/data/local/track-dao';
import { useLibraryStore } from '../src/store/library-store';
import { loadDemoTracksIntoLibrary } from '../src/core/utils/sample-data';

export default function RootLayout() {
  useEffect(() => {
    // Initialize SQLite database and hydrate local library store on startup
    async function initApp() {
      try {
        await getDatabase();
        const trackDao = new TrackDao();
        const existing = await trackDao.getAllTracks();
        if (existing.length > 0) {
          const favs = await trackDao.getFavorites();
          useLibraryStore.getState().setTracks(existing);
          useLibraryStore.getState().setFavorites(favs);
        } else {
          // If library is totally clean on first install, load initial royalty-free demo tracks
          await loadDemoTracksIntoLibrary();
        }
      } catch (err) {
        console.error('Failed to initialize OpenWave data:', err);
      }
    }
    initApp();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" />
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

