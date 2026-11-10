import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  SlidersHorizontal,
  Cast,
  Search,
  Music2,
  Disc,
  Calendar,
  ListMusic,
  FolderPlus,
  Radio,
  Play,
  ChevronRight,
  PlusCircle,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { WaveLogo } from '../../src/components/common/WaveLogo';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlayerStore } from '../../src/store/player-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { LocalFileImporter } from '../../src/core/utils/local-file-importer';
import { DEMO_TRACKS, loadDemoTracksIntoLibrary } from '../../src/core/utils/sample-data';
import { Track } from '../../src/domain/entities/track';

export default function HomeScreen() {
  const router = useRouter();
  const tracks = useLibraryStore((s) => s.tracks);
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    // If library is totally empty on first launch, offer or auto-load demo tracks
    if (tracks.length === 0) {
      loadDemoTracksIntoLibrary().catch(console.error);
    }
  }, []);

  const handlePickLocalMusic = async () => {
    try {
      const imported = await LocalFileImporter.pickAndImportAudioFiles();
      if (imported.length > 0) {
        Alert.alert(
          '¡Música importada!',
          `Se agregaron ${imported.length} archivo(s) de audio local a tu biblioteca de OpenWave.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo seleccionar el archivo.');
    }
  };

  const handlePlayTrack = (track: Track, list: Track[], index: number) => {
    playbackService.playTrack(track, list, index);
  };

  // Group or sample albums
  const displayAlbums = tracks.slice(0, 8);
  const recentAlbums = tracks.slice(0, 4);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Bar matching Reference 1 */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <WaveLogo size={30} />
          <Text style={styles.brandTitle}>OPENWAVE</Text>
        </View>

        <View style={styles.headerActionPill}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/library' as any)}
          >
            <SlidersHorizontal color="#FFFFFF" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/equalizer' as any)}
          >
            <Cast color="#FFFFFF" size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/search' as any)}
          >
            <Search color="#FFFFFF" size={18} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Action Capsules (2 Columns) from Reference 1 */}
        <View style={styles.mixesGrid}>
          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.8}
          >
            <Music2 color="#A5B4FC" size={18} />
            <Text style={styles.mixText}>Track mix</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.8}
          >
            <Disc color="#A5B4FC" size={18} />
            <Text style={styles.mixText}>Album mix</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.8}
          >
            <Calendar color="#A5B4FC" size={18} />
            <Text style={styles.mixText}>Decade mix</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/player/queue' as any)}
            activeOpacity={0.8}
          >
            <ListMusic color="#A5B4FC" size={18} />
            <Text style={styles.mixText}>Queues</Text>
          </TouchableOpacity>

          {/* User's requested: Upload / Pick Local Music */}
          <TouchableOpacity
            style={[styles.mixCapsule, styles.highlightMixCapsule]}
            onPress={handlePickLocalMusic}
            activeOpacity={0.8}
          >
            <FolderPlus color={colors.primary} size={18} />
            <Text style={[styles.mixText, { color: colors.primary, fontWeight: '700' }]}>
              Subir Música Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => loadDemoTracksIntoLibrary()}
            activeOpacity={0.8}
          >
            <Radio color="#A5B4FC" size={18} />
            <Text style={styles.mixText}>Internet radios</Text>
          </TouchableOpacity>
        </View>

        {/* MOST PLAYED ALBUMS Section from Reference 1 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MOST PLAYED ALBUMS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
            <ChevronRight color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <View style={styles.albumsGrid}>
          {displayAlbums.map((item, index) => (
            <View key={item.id} style={styles.albumItem}>
              <TouchableOpacity
                style={styles.coverWrapper}
                onPress={() => handlePlayTrack(item, displayAlbums, index)}
                activeOpacity={0.9}
              >
                {item.artworkUri ? (
                  <Image source={{ uri: item.artworkUri }} style={styles.albumCover} />
                ) : (
                  <View style={styles.placeholderCover}>
                    <Music2 color={colors.primary} size={32} />
                  </View>
                )}
                {/* Play Button Overlay (bottom-left) as in Reference 1 */}
                <View style={styles.playOverlay}>
                  <Play color="#FFFFFF" size={14} fill="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>
              </TouchableOpacity>

              <Text style={styles.albumTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {item.artistName || 'Artista desconocido'}
              </Text>
            </View>
          ))}
        </View>

        {/* RECENTLY ADDED ALBUMS Section from Reference 1 */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>RECENTLY ADDED ALBUMS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library' as any)}>
            <ChevronRight color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {recentAlbums.map((item, index) => (
            <View key={`recent_${item.id}`} style={styles.recentAlbumItem}>
              <TouchableOpacity
                style={styles.recentCoverWrapper}
                onPress={() => handlePlayTrack(item, recentAlbums, index)}
                activeOpacity={0.9}
              >
                {item.artworkUri ? (
                  <Image source={{ uri: item.artworkUri }} style={styles.recentAlbumCover} />
                ) : (
                  <View style={styles.placeholderCover}>
                    <Disc color={colors.primary} size={48} />
                  </View>
                )}
                <View style={styles.recentPlayOverlay}>
                  <Play color="#FFFFFF" size={18} fill="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>
              </TouchableOpacity>

              <Text style={styles.recentTitle} numberOfLines={1}>
                {item.albumTitle || item.title}
              </Text>
              <Text style={styles.recentArtist} numberOfLines={1}>
                {item.artistName || 'OpenWave Collection'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15', // Deep rich dark tone from Reference 1
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  headerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C', // Rounded pill container from Reference 1
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 16,
  },
  headerIconButton: {
    padding: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  mixesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    marginBottom: 26,
  },
  mixCapsule: {
    width: '48.3%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A28',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  highlightMixCapsule: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  mixText: {
    ...typography.caption,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#A5B4FC', // Violet-indigo accent tone from Reference 1
    letterSpacing: 1,
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  albumItem: {
    width: '23%', // 4 items per row as in Reference 1
  },
  coverWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E2538',
    position: 'relative',
    marginBottom: 6,
  },
  albumCover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A2133',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  albumArtist: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  horizontalScroll: {
    gap: 16,
    paddingRight: 16,
  },
  recentAlbumItem: {
    width: 150,
  },
  recentCoverWrapper: {
    width: 150,
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1E2538',
    position: 'relative',
    marginBottom: 8,
  },
  recentAlbumCover: {
    width: '100%',
    height: '100%',
  },
  recentPlayOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentTitle: {
    ...typography.bodyBold,
    color: '#F3F4F6',
  },
  recentArtist: {
    ...typography.caption,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
