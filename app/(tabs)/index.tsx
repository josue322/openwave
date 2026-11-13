import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  SlidersHorizontal,
  History,
  Search,
  Music2,
  Disc,
  Calendar,
  ListMusic,
  FolderPlus,
  Radio,
  Play,
  ChevronRight,
  Heart,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { WaveLogo } from '../../src/components/common/WaveLogo';
import { LibrarySkeletonList } from '../../src/components/common/SkeletonLoader';
import { useThemeColors } from '../../src/theme/theme-hook';
import { useTranslation } from '../../src/core/i18n/translations';
import { useLibraryStore } from '../../src/store/library-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { LocalFileImporter } from '../../src/core/utils/local-file-importer';
import { TrackDao } from '../../src/data/local/track-dao';
import { Track } from '../../src/domain/entities/track';
import { CastButton } from '../../src/components/player/CastButton';

export default function HomeScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { t } = useTranslation();
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const tracks = useLibraryStore((s) => s.tracks);
  const favorites = useLibraryStore((s) => s.favorites);
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    async function loadLibraryIfNeeded() {
      if (tracks.length === 0) {
        setIsInitialLoading(true);
        try {
          const trackDao = new TrackDao();
          const all = await trackDao.getAllTracks();
          if (all.length > 0) {
            const favs = await trackDao.getFavorites();
            useLibraryStore.getState().setTracks(all);
            useLibraryStore.getState().setFavorites(favs);
          }
        } finally {
          setIsInitialLoading(false);
        }
      }
    }
    loadLibraryIfNeeded().catch(() => {});
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

  const handlePlayTrackMix = () => {
    if (tracks.length === 0) {
      router.push('/(tabs)/library' as any);
      return;
    }
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playbackService.playTrack(shuffled[0], shuffled, 0);
  };

  // Orden real: Más escuchadas (playCount DESC) y Añadidas recientemente (dateAdded DESC)
  const displayAlbums = [...tracks]
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
    .slice(0, 8);
  const recentAlbums = [...tracks]
    .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0))
    .slice(0, 8);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Top Bar matching Reference 1 */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <WaveLogo size={30} />
          <Text style={[styles.brandTitle, { color: palette.textPrimary }]}>OPENWAVE</Text>
        </View>

        <View style={[styles.headerActionPill, { backgroundColor: palette.surfaceElevated }]}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/equalizer' as any)}
          >
            <SlidersHorizontal color={palette.textPrimary} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/stats' as any)}
          >
            <History color={palette.textPrimary} size={18} />
          </TouchableOpacity>
          <CastButton
            size={18}
            color={palette.textPrimary}
            buttonStyle={styles.headerIconButton}
          />
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.push('/(tabs)/search' as any)}
          >
            <Search color={palette.textPrimary} size={18} />
          </TouchableOpacity>
        </View>
      </View>

      {isInitialLoading && tracks.length === 0 ? (
        <LibrarySkeletonList rows={6} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quick Action Capsules (2 Columns) from Reference 1 */}
        <View style={styles.mixesGrid}>
          <TouchableOpacity
            style={[styles.mixCapsule, styles.favoriteMixCapsule]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/library',
                params: { tab: 'favorites' },
              } as any)
            }
            activeOpacity={0.8}
          >
            <Heart color="#EF4444" size={17} fill="#EF4444" />
            <Text style={[styles.mixText, { color: '#FCA5A5', fontWeight: '700' }]} numberOfLines={1}>
              {favorites.length > 0 ? `Favoritos (${favorites.length})` : 'Favoritos'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mixCapsule, { backgroundColor: palette.surface, borderColor: palette.border }]}
            onPress={handlePlayTrackMix}
            activeOpacity={0.8}
          >
            <Music2 color={palette.primary} size={17} />
            <Text style={[styles.mixText, { color: palette.textPrimary }]} numberOfLines={1}>
              {t.home.trackMix}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => {
              if (tracks.length === 0) {
                router.push('/(tabs)/library' as any);
                return;
              }
              const byAlbum = [...tracks].sort((a, b) =>
                (a.albumTitle || '').localeCompare(b.albumTitle || '')
              );
              playbackService.playTrack(byAlbum[0], byAlbum, 0);
            }}
            activeOpacity={0.8}
          >
            <Disc color="#A5B4FC" size={17} />
            <Text style={styles.mixText} numberOfLines={1}>Mix de álbumes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => {
              if (tracks.length === 0) {
                router.push('/(tabs)/library' as any);
                return;
              }
              const byYear = [...tracks].sort((a, b) => (b.year || 0) - (a.year || 0));
              playbackService.playTrack(byYear[0], byYear, 0);
            }}
            activeOpacity={0.8}
          >
            <Calendar color="#A5B4FC" size={17} />
            <Text style={styles.mixText} numberOfLines={1}>Mix por décadas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/player/queue' as any)}
            activeOpacity={0.8}
          >
            <ListMusic color="#A5B4FC" size={17} />
            <Text style={styles.mixText} numberOfLines={1}>Cola de pistas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/importer' as any)}
            activeOpacity={0.8}
          >
            <FolderPlus color="#A5B4FC" size={17} />
            <Text style={styles.mixText} numberOfLines={1}>Importar CSV / Listas</Text>
          </TouchableOpacity>

          {/* User's requested: Upload / Pick Local Music */}
          <TouchableOpacity
            style={[styles.mixCapsule, styles.highlightMixCapsule]}
            onPress={handlePickLocalMusic}
            activeOpacity={0.8}
          >
            <FolderPlus color={colors.primary} size={17} />
            <Text style={[styles.mixText, { color: colors.primary, fontWeight: '700' }]} numberOfLines={1}>
              Subir Música Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mixCapsule}
            onPress={() => router.push('/explore' as any)}
            activeOpacity={0.8}
          >
            <Radio color="#A5B4FC" size={17} />
            <Text style={styles.mixText} numberOfLines={1}>Explorar Online</Text>
          </TouchableOpacity>
        </View>

        {/* ÁLBUMES MÁS ESCUCHADOS Section from Reference 1 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ÁLBUMES MÁS ESCUCHADOS</Text>
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

        {/* AÑADIDOS RECIENTEMENTE Section from Reference 1 */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Text style={styles.sectionTitle}>AÑADIDOS RECIENTEMENTE</Text>
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
                {item.artistName || 'Colección OpenWave'}
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
      )}
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
    paddingVertical: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.4,
  },
  headerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C', // Rounded pill container from Reference 1
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 12,
  },
  headerIconButton: {
    padding: 3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 24,
  },
  mixesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 4,
    marginBottom: 22,
  },
  mixCapsule: {
    width: '48.2%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A28',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  highlightMixCapsule: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  favoriteMixCapsule: {
    backgroundColor: 'rgba(239, 68, 68, 0.09)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  mixText: {
    ...typography.caption,
    color: '#D1D5DB',
    fontWeight: '600',
    flex: 1,
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
