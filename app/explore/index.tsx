import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Globe,
  Wifi,
  WifiOff,
  Download,
  Play,
  Pause,
  Trash2,
  Heart,
  ListPlus,
  HardDrive,
  RefreshCw,
  Music,
  X,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { Track } from '../../src/domain/entities/track';
import { ProviderRegistry } from '../../src/integrations/providers/provider-registry';
import { InternetArchiveProvider } from '../../src/integrations/providers/internet-archive-provider';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { DownloadManager } from '../../src/data/remote/download-manager';
import { useDownloadStore } from '../../src/store/download-store';
import { usePlayerStore } from '../../src/store/player-store';
import { useLibraryStore } from '../../src/store/library-store';
import { useNetworkStatus } from '../../src/core/network/network-monitor';
import {
  toggleFavoritePersisted,
  ensureTrackInDatabase,
  formatFileSize,
} from '../../src/core/utils/track-actions';
import { AddToPlaylistModal } from '../../src/components/library/AddToPlaylistModal';

type ExploreTab = 'popular' | 'new' | 'genres' | 'downloads';

const GENRES = ['Ambient', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Pop', 'Lo-Fi'];

export default function ExploreOnlineScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ExploreTab>('popular');
  const [selectedGenre, setSelectedGenre] = useState('Ambient');
  const [onlineTracks, setOnlineTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inspectTrack, setInspectTrack] = useState<Track | null>(null);
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [playlistTarget, setPlaylistTarget] = useState<Track | null>(null);

  const { isConnected, isChecking, refresh: refreshNetwork } = useNetworkStatus();
  const streamQuality = usePlayerStore((s) => s.streamQuality);
  const setStreamQuality = usePlayerStore((s) => s.setStreamQuality);
  const downloadItems = useDownloadStore((s) => s.items);
  const totalBytesUsed = useDownloadStore((s) => s.totalBytesUsed);
  const libraryTracks = useLibraryStore((s) => s.tracks);

  const playbackService = PlaybackService.getInstance();
  const registry = ProviderRegistry.getInstance();
  const ccProvider = registry.getProvider('cc_open_catalog');
  const iaProvider = registry.getProvider('internet_archive_cc') as InternetArchiveProvider | undefined;

  useEffect(() => {
    DownloadManager.calculateDiskUsage().catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'downloads') {
      loadCatalog();
    }
  }, [activeTab, selectedGenre]);

  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      let fetched: Track[] = [];
      const fallbackTracks = ccProvider ? await ccProvider.getFeaturedTracks() : [];

      if (iaProvider) {
        if (activeTab === 'popular') {
          fetched = await iaProvider.getFeaturedTracks();
        } else if (activeTab === 'new') {
          fetched = await iaProvider.getNewReleases();
        } else if (activeTab === 'genres') {
          fetched = await iaProvider.getByGenre(selectedGenre);
        }
      }

      const merged = fetched.length > 0 ? [...fallbackTracks, ...fetched] : fallbackTracks;
      setOnlineTracks(merged);
    } catch {
      const fallback = ccProvider ? await ccProvider.getFeaturedTracks() : [];
      setOnlineTracks(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTrackDetails = async (track: Track) => {
    setInspectTrack(track);
    try {
      const sims = iaProvider ? await iaProvider.getByGenre(track.genre || 'Ambient') : [];
      setSimilarTracks(sims.filter((s) => s.id !== track.id).slice(0, 5));
    } catch {
      setSimilarTracks([]);
    }
  };

  const handleStartDownload = async (track: Track) => {
    try {
      Alert.alert(
        'Descarga Creative Commons',
        `Iniciando descarga en calidad ${streamQuality === 'high' ? 'Alta' : 'Estándar'}: "${track.title}".`
      );
      await DownloadManager.startDownload(track, streamQuality);
    } catch (err: any) {
      Alert.alert('Error de descarga', err?.message || 'No se pudo descargar la canción.');
    }
  };

  const downloadedList = Object.values(downloadItems);
  const offlineSavedTracks = libraryTracks.filter((t) => t.folderPath === 'Descargas Online');

  const renderOnlineTrack = ({ item, index }: { item: Track; index: number }) => {
    const dlState = downloadItems[item.id];
    const isFav = libraryTracks.some((t) => t.id === item.id && t.isFavorite) || item.isFavorite;

    return (
      <TouchableOpacity
        style={styles.trackRow}
        onPress={() => playbackService.playTrack(item, onlineTracks, index)}
        onLongPress={() => handleOpenTrackDetails(item)}
        activeOpacity={0.75}
      >
        <View style={styles.coverBox}>
          {item.artworkUri ? (
            <Image source={{ uri: item.artworkUri }} style={styles.coverImg} />
          ) : (
            <Globe color={colors.primary} size={20} />
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackSub} numberOfLines={1}>
            {item.artistName || 'Creative Commons'} • {item.genre || 'Música Libre'}
          </Text>
          {dlState && dlState.status === 'downloading' && (
            <Text style={styles.dlProgressText}>
              Descargando {Math.round(dlState.progress * 100)}%
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => toggleFavoritePersisted({ ...item, isFavorite: isFav })}
        >
          <Heart
            color={isFav ? colors.error : colors.textMuted}
            size={18}
            fill={isFav ? colors.error : 'transparent'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={async () => {
            await ensureTrackInDatabase(item);
            setPlaylistTarget(item);
          }}
        >
          <ListPlus color="#A5B4FC" size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} onPress={() => handleStartDownload(item)}>
          <Download
            color={dlState?.status === 'completed' ? colors.secondary : colors.primary}
            size={18}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronDown color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Explorar Música Online</Text>
        <TouchableOpacity
          style={styles.qualityPill}
          onPress={() => setStreamQuality(streamQuality === 'high' ? 'standard' : 'high')}
        >
          <Text style={styles.qualityText}>
            {streamQuality === 'high' ? 'HD' : 'STD'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Network Status Bar */}
      <View style={[styles.networkBanner, !isConnected && styles.networkOffline]}>
        {isConnected ? (
          <Wifi color={colors.secondary} size={15} />
        ) : (
          <WifiOff color={colors.error} size={15} />
        )}
        <Text style={styles.networkText}>
          {isChecking
            ? 'Comprobando conexión HTTPS...'
            : isConnected
            ? `Conectado HTTPS • Streaming calidad ${streamQuality === 'high' ? 'Alta (192+ kbps)' : 'Estándar (64 kbps)'}`
            : 'Sin conexión a Internet • Reproduciendo solo música descargada y local'}
        </Text>
        <TouchableOpacity onPress={refreshNetwork}>
          <RefreshCw color={colors.textSecondary} size={15} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(
          [
            ['popular', 'Populares'],
            ['new', 'Nuevos'],
            ['genres', 'Categorías'],
            ['downloads', 'Descargas'],
          ] as Array<[ExploreTab, string]>
        ).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tabPill, activeTab === key && styles.tabPillActive]}
            onPress={() => setActiveTab(key)}
          >
            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Genres Filter Chips */}
      {activeTab === 'genres' && (
        <View style={{ marginBottom: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genresScroll}
          >
            {GENRES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genreChip, selectedGenre === g && styles.genreChipActive]}
                onPress={() => setSelectedGenre(g)}
              >
                <Text
                  style={[
                    styles.genreText,
                    selectedGenre === g && { color: '#0A0D15', fontWeight: '700' },
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Body */}
      {activeTab === 'downloads' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.storageCard}>
            <HardDrive color={colors.primary} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={styles.storageTitle}>Espacio ocupado por descargas</Text>
              <Text style={styles.storageSub}>
                {formatFileSize(totalBytesUsed)} • {offlineSavedTracks.length} pistas listas offline
              </Text>
            </View>
          </View>

          {downloadedList.length === 0 && offlineSavedTracks.length === 0 ? (
            <View style={styles.emptyBox}>
              <Download color={colors.textDisabled} size={44} />
              <Text style={styles.emptyTitle}>Sin descargas activas</Text>
              <Text style={styles.emptySub}>
                Toca el icono de descarga junto a cualquier canción libre Creative Commons para guardarla offline.
              </Text>
            </View>
          ) : (
            <>
              {downloadedList.map((dl) => (
                <View key={dl.track.id} style={styles.dlCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {dl.track.title}
                    </Text>
                    <Text style={styles.trackSub}>
                      Estado: {dl.status.toUpperCase()} • {Math.round(dl.progress * 100)}%
                    </Text>
                  </View>
                  {dl.status === 'downloading' && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => DownloadManager.pauseDownload(dl.track.id)}
                    >
                      <Pause color={colors.warning} size={18} />
                    </TouchableOpacity>
                  )}
                  {(dl.status === 'paused' || dl.status === 'error') && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => DownloadManager.resumeDownload(dl.track.id)}
                    >
                      <Play color={colors.primary} size={18} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => DownloadManager.cancelDownload(dl.track.id)}
                  >
                    <Trash2 color={colors.error} size={18} />
                  </TouchableOpacity>
                </View>
              ))}

              {offlineSavedTracks.map((t, idx) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.trackRow}
                  onPress={() => playbackService.playTrack(t, offlineSavedTracks, idx)}
                >
                  <View style={styles.coverBox}>
                    {t.artworkUri ? (
                      <Image source={{ uri: t.artworkUri }} style={styles.coverImg} />
                    ) : (
                      <Music color={colors.secondary} size={18} />
                    )}
                  </View>
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={styles.trackSub} numberOfLines={1}>
                      {t.artistName || 'Descargada'} • {formatFileSize(t.fileSize)}
                    </Text>
                  </View>
                  <Play color={colors.primary} size={18} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      ) : isLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingLabel}>Explorando catálogo abierto...</Text>
        </View>
      ) : (
        <FlatList
          data={onlineTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderOnlineTrack}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Track Info / Artist / Recommendations Modal */}
      <Modal
        visible={inspectTrack !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectTrack(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {inspectTrack?.title}
              </Text>
              <TouchableOpacity onPress={() => setInspectTrack(null)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.trackSub}>
              Artista: {inspectTrack?.artistName || 'Creative Commons'}
            </Text>
            <Text style={styles.trackSub}>
              Álbum: {inspectTrack?.albumTitle || 'Catálogo Abierto'} • Año: {inspectTrack?.year || 'N/D'}
            </Text>
            <Text style={styles.similarHeader}>Canciones similares recomendadas</Text>
            {similarTracks.length === 0 ? (
              <Text style={styles.trackSub}>Sin recomendaciones adicionales.</Text>
            ) : (
              similarTracks.map((sim) => (
                <TouchableOpacity
                  key={sim.id}
                  style={styles.simRow}
                  onPress={() => {
                    setInspectTrack(null);
                    playbackService.playTrack(sim, similarTracks);
                  }}
                >
                  <Play color={colors.primary} size={15} />
                  <Text style={styles.simText} numberOfLines={1}>
                    {sim.title} — {sim.artistName}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      <AddToPlaylistModal
        track={playlistTarget}
        visible={playlistTarget !== null}
        onClose={() => setPlaylistTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  qualityPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 229, 255, 0.14)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  networkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 200, 150, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 150, 0.25)',
  },
  networkOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  networkText: {
    flex: 1,
    fontSize: 11,
    color: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#141A28',
  },
  tabPillActive: {
    backgroundColor: '#2D3A56',
  },
  tabText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  genresScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#141A28',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  genreChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genreText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  coverBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#161C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  trackSub: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  dlProgressText: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 7,
  },
  storageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#141A28',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  storageTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  storageSub: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  dlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 10,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySub: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#141A28',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    flex: 1,
    marginRight: 10,
  },
  similarHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  simRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  simText: {
    ...typography.body,
    color: '#F8FAFC',
    flex: 1,
  },
});

