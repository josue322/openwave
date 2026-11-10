import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, SkipForward, Music } from 'lucide-react-native';
import { usePlayerStore } from '../../store/player-store';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const skipNext = usePlayerStore((s) => s.skipNext);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);

  if (!currentTrack) {
    return null;
  }

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View style={styles.container}>
      {/* Progress Bar Header */}
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <TouchableOpacity
        style={styles.content}
        activeOpacity={0.9}
        onPress={() => router.push('/player' as any)}
      >
        {/* Artwork / Icon */}
        <View style={styles.artworkContainer}>
          {currentTrack.artworkUri ? (
            <Image source={{ uri: currentTrack.artworkUri }} style={styles.artwork} />
          ) : (
            <View style={styles.placeholderArtwork}>
              <Music color={colors.primary} size={20} />
            </View>
          )}
        </View>

        {/* Track Title and Artist */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artistName || 'Artista desconocido'}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isPlaying ? (
              <Pause color={colors.textPrimary} size={22} fill={colors.textPrimary} />
            ) : (
              <Play color={colors.textPrimary} size={22} fill={colors.textPrimary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              skipNext();
            }}
            style={styles.controlButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SkipForward color={colors.textSecondary} size={22} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressBackground: {
    height: 2,
    backgroundColor: colors.progressBarBackground,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  artworkContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHighlight,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  placeholderArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
  },
  infoContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  artist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlButton: {
    padding: 6,
  },
});

