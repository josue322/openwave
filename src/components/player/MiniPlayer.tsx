import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Play, Pause, SkipBack, SkipForward, Heart, Music } from 'lucide-react-native';
import { usePlayerStore } from '../../store/player-store';
import { PlaybackService } from '../../playback/service/playback-service';
import { toggleFavoritePersisted } from '../../core/utils/track-actions';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

export const MiniPlayer: React.FC = () => {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);

  const playbackService = PlaybackService.getInstance();

  if (!currentTrack) {
    return null;
  }

  const progress = durationMs > 0 ? Math.min(1, positionMs / durationMs) : 0;

  return (
    <View style={styles.wrapper}>
      {/* Mini Player Floating Capsule */}
      <View style={styles.capsule}>
        {/* Progress indicator along top edge */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.mainRow}>
          {/* Left: Track Information Block with Artwork */}
          <TouchableOpacity
            style={styles.trackInfoBlock}
            activeOpacity={0.85}
            onPress={() => router.push('/player' as any)}
          >
            <View style={styles.artworkContainer}>
              {currentTrack.artworkUri ? (
                <Image source={{ uri: currentTrack.artworkUri }} style={styles.artwork} />
              ) : (
                <View style={styles.placeholderArtwork}>
                  <Music color={colors.primary} size={18} />
                </View>
              )}
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.artist} numberOfLines={1}>
                {playbackError
                  ? `⚠️ ${playbackError}`
                  : currentTrack.artistName || 'Artista desconocido'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: Media Controls from Reference Image 1 */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              onPress={() => playbackService.skipPrevious()}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SkipBack color={colors.textPrimary} size={18} fill={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => playbackService.togglePlayPause()}
              style={styles.playButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {isBuffering ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isPlaying ? (
                <Pause color={colors.textPrimary} size={22} fill={colors.textPrimary} />
              ) : (
                <Play color={colors.textPrimary} size={22} fill={colors.textPrimary} style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => playbackService.skipNext()}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <SkipForward color={colors.textPrimary} size={18} fill={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleFavoritePersisted(currentTrack)}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Heart
                color={currentTrack.isFavorite ? colors.error : colors.textPrimary}
                size={20}
                fill={currentTrack.isFavorite ? colors.error : 'transparent'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  capsule: {
    backgroundColor: '#121620',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  progressBar: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  trackInfoBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#274268', // Styled blue accent pill as in Reference 1
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  artworkContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHighlight,
    marginRight: 10,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  placeholderArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  artist: {
    ...typography.small,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 4,
  },
  iconButton: {
    padding: 4,
  },
  playButton: {
    padding: 4,
  },
});
