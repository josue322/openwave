import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../src/theme/colors';
import { getDatabase } from '../src/core/database/connection';
import { ErrorBoundary } from '../src/core/errors/ErrorBoundary';
import { TrackDao } from '../src/data/local/track-dao';
import { useLibraryStore } from '../src/store/library-store';
import { useSettingsStore } from '../src/store/settings-store';
import { useEqualizerStore } from '../src/store/equalizer-store';
import { TrackRepository } from '../src/data/repositories/track-repository';
import { loadDemoTracksIntoLibrary } from '../src/core/utils/sample-data';
import { PlaybackService } from '../src/playback/service/playback-service';

export default function RootLayout() {
  useEffect(() => {
    async function initApp() {
      try {
        await getDatabase();
        await Promise.all([
          useSettingsStore.getState().loadSettings(),
          useEqualizerStore.getState().loadSavedEqState(),
        ]);

        const trackDao = new TrackDao();
        let allTracks = await trackDao.getAllTracks();

        if (allTracks.length > 0) {
          const favs = await trackDao.getFavorites();
          useLibraryStore.getState().setTracks(allTracks);
          useLibraryStore.getState().setFavorites(favs);
        } else {
          allTracks = await loadDemoTracksIntoLibrary();
        }

        // Restore last active track, queue, speed and exact position
        await PlaybackService.getInstance().restoreSession(allTracks);

        // Auto-scan device audio on launch if enabled in Settings
        if (useSettingsStore.getState().autoScanOnLaunch) {
          new TrackRepository()
            .scanAndSaveTracks()
            .then((fresh) => {
              useLibraryStore.getState().setTracks(fresh);
              useLibraryStore
                .getState()
                .setFavorites(fresh.filter((t) => t.isFavorite));
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to initialize OpenWave data:', err);
      }
    }
    initApp();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        PlaybackService.getInstance().persistSessionSnapshot().catch(() => {});
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
