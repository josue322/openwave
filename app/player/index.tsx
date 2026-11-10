import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Sliders,
  Heart,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  ListMusic,
  Music,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlayerStore } from '../../src/store/player-store';
import { useLibraryStore } from '../../src/store/library-store';

export default function FullPlayerScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const skipNext = usePlayerStore((s) => s.skipNext);
  const skipPrevious = usePlayerStore((s) => s.skipPrevious);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const cycleRepeatMode = usePlayerStore((s) => s.cycleRepeatMode);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <ChevronDown color={colors.textPrimary} size={28} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Music color={colors.textDisabled} size={64} />
          <Text style={styles.emptyText}>No hay ninguna pista en reproducción</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerOverline}>REPRODUCIENDO</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {currentTrack.albumTitle || 'Biblioteca Local'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/equalizer' as any)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Sliders color={colors.textPrimary} size={22} />
        </TouchableOpacity>
      </View>

      {/* Album Artwork */}
      <View style={styles.artworkSection}>
        <View style={styles.artworkWrapper}>
          {currentTrack.artworkUri ? (
            <Image source={{ uri: currentTrack.artworkUri }} style={styles.artwork} />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Music color={colors.primary} size={80} />
            </View>
          )}
        </View>
      </View>

      {/* Track Info */}
      <View style={styles.infoSection}>
        <View style={styles.titleWrapper}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artistName || 'Artista desconocido'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleFavorite(currentTrack.id)}
          style={styles.favoriteButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Heart
            color={currentTrack.isFavorite ? colors.error : colors.textMuted}
            size={24}
            fill={currentTrack.isFavorite ? colors.error : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Seek Bar */}
      <View style={styles.seekSection}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
        </View>
      </View>

      {/* Primary Controls */}
      <View style={styles.controlsSection}>
        <TouchableOpacity
          onPress={toggleShuffle}
          style={styles.auxControl}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Shuffle color={shuffle ? colors.primary : colors.textMuted} size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={skipPrevious}
          style={styles.skipControl}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <SkipBack color={colors.textPrimary} size={30} fill={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayPause}
          style={styles.playPauseButton}
          activeOpacity={0.8}
        >
          {isPlaying ? (
            <Pause color="#0A0D14" size={32} fill="#0A0D14" />
          ) : (
            <Play color="#0A0D14" size={32} fill="#0A0D14" style={{ marginLeft: 3 }} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={skipNext}
          style={styles.skipControl}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <SkipForward color={colors.textPrimary} size={30} fill={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={cycleRepeatMode}
          style={styles.auxControl}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {repeatMode === 'one' ? (
            <Repeat1 color={colors.primary} size={22} />
          ) : (
            <Repeat color={repeatMode === 'all' ? colors.primary : colors.textMuted} size={22} />
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom Bar: Queue toggle */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.queueButton}
          onPress={() => router.push('/player/queue' as any)}
          activeOpacity={0.7}
        >
          <ListMusic color={colors.textSecondary} size={20} />
          <Text style={styles.queueText}>Cola de reproducción</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleContainer: {
    alignItems: 'center',
    maxWidth: '70%',
  },
  headerOverline: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: 2,
  },
  artworkSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    marginVertical: 16,
  },
  artworkWrapper: {
    width: 280,
    height: 280,
    borderRadius: 24,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 12,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  placeholderArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  trackArtist: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  favoriteButton: {
    padding: 8,
  },
  seekSection: {
    paddingHorizontal: 28,
    marginTop: 10,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: colors.progressBarBackground,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    ...typography.small,
    color: colors.textMuted,
  },
  controlsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginVertical: 8,
  },
  auxControl: {
    padding: 10,
  },
  skipControl: {
    padding: 10,
  },
  playPauseButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  bottomBar: {
    alignItems: 'center',
    paddingTop: 8,
  },
  queueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  queueText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

