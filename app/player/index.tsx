import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Sliders,
  ListMusic,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Music,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlayerStore } from '../../src/store/player-store';
import { useLibraryStore } from '../../src/store/library-store';
import { PlaybackService } from '../../src/playback/service/playback-service';

export default function FullPlayerScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const playbackService = PlaybackService.getInstance();

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#FFFFFF" size={26} />
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
      {/* Dynamic Ambient Background Glow from Reference 2 */}
      <View style={styles.ambientGlow} />

      {/* Top Header from Reference 2 */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTrackName} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Hero Circular Artwork Vignette from Reference 2 */}
      <View style={styles.artworkSection}>
        <View style={styles.circularArtworkFrame}>
          {currentTrack.artworkUri ? (
            <Image source={{ uri: currentTrack.artworkUri }} style={styles.circularArtwork} />
          ) : (
            <View style={styles.placeholderCircular}>
              <Music color="#38BDF8" size={72} />
            </View>
          )}
        </View>

        {/* Track Title & Artist from Reference 2 */}
        <Text style={styles.trackTitle} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.artistName || 'Artista desconocido'}
        </Text>

        {/* Action Pills Row (Heart, Equalizer, Queue) from Reference 2 */}
        <View style={styles.actionPillRow}>
          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => toggleFavorite(currentTrack.id)}
            activeOpacity={0.8}
          >
            <Heart
              color={currentTrack.isFavorite ? colors.error : '#E2E8F0'}
              size={20}
              fill={currentTrack.isFavorite ? colors.error : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => router.push('/equalizer' as any)}
            activeOpacity={0.8}
          >
            <Sliders color="#E2E8F0" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => router.push('/player/queue' as any)}
            activeOpacity={0.8}
          >
            <ListMusic color="#E2E8F0" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Glassmorphic Player Controls Card from Reference 2 */}
      <View style={styles.glassmorphicCard}>
        {/* Progress Bar & Timestamps */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            if (durationMs > 0) {
              const approxRatio = Math.max(0, Math.min(1, locationX / 300));
              playbackService.seekTo(approxRatio * durationMs);
            }
          }}
          style={styles.seekTrack}
        >
          <View style={[styles.seekFill, { width: `${progress * 100}%` }]}>
            <View style={styles.seekThumb} />
          </View>
        </TouchableOpacity>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(positionMs)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
        </View>

        {/* Media Controls Row: [Prev] [-10] [Big Play] [+10] [Next] from Reference 2 */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={() => playbackService.skipPrevious()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SkipBack color="#FFFFFF" size={26} fill="#FFFFFF" />
          </TouchableOpacity>

          {/* Rewind 10 Seconds */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => playbackService.seekRelative(-10000)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RotateCcw color="#FFFFFF" size={18} />
            <Text style={styles.secondsLabel}>10</Text>
          </TouchableOpacity>

          {/* Center Play/Pause Circle */}
          <TouchableOpacity
            style={styles.bigPlayButton}
            onPress={() => playbackService.togglePlayPause()}
            activeOpacity={0.85}
          >
            {isPlaying ? (
              <Pause color="#0A0D15" size={30} fill="#0A0D15" />
            ) : (
              <Play color="#0A0D15" size={30} fill="#0A0D15" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          {/* Forward 10 Seconds */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => playbackService.seekRelative(10000)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RotateCw color="#FFFFFF" size={18} />
            <Text style={styles.secondsLabel}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => playbackService.skipNext()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SkipForward color="#FFFFFF" size={26} fill="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#0A0F1A', // Deep emerald/navy ambient base from Reference 2
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: 'rgba(16, 53, 42, 0.45)', // Atmospheric green haze from Reference 2
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTrackName: {
    fontSize: 18,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    maxWidth: '70%',
  },
  artworkSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 10,
  },
  circularArtworkFrame: {
    width: 240,
    height: 240,
    borderRadius: 120, // Circular vignette from Reference 2
    overflow: 'hidden',
    backgroundColor: '#1E2538',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 26,
  },
  circularArtwork: {
    width: '100%',
    height: '100%',
  },
  placeholderCircular: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121826',
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  trackArtist: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionPillButton: {
    padding: 4,
  },
  glassmorphicCard: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(23, 29, 44, 0.85)', // Translucent glass effect from Reference 2
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  seekTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 2,
    position: 'relative',
    marginTop: 6,
  },
  seekFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  seekThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginRight: -6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 16,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  secondsLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    top: 17,
  },
  bigPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
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
