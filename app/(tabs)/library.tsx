import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Music,
  RefreshCw,
  Heart,
  FolderPlus,
  Play,
  Disc,
  MoreVertical,
  Image as ImageIcon,
  Trash2,
  ListPlus,
  SkipForward,
  Share2,
  X,
  Folder,
  Pencil,
  Sparkles,
  ArrowUpDown,
  User,
  Tag,
  Plus,
  ListMusic,
  ArrowDownToLine,
  AlertTriangle,
  Shuffle,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import {
  usePlaylistStore,
  SYSTEM_SMART_PLAYLISTS,
  evaluateSmartPlaylist,
  SmartPlaylistConfig,
} from '../../src/store/playlist-store';
import { Track } from '../../src/domain/entities/track';
import { TrackRepository } from '../../src/data/repositories/track-repository';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { LocalFileImporter } from '../../src/core/utils/local-file-importer';
import { FolderManager } from '../../src/data/local/scanner/folder-manager';
import { LibraryHealthService } from '../../src/core/utils/library-health';
import { ArtworkManager } from '../../src/core/utils/artwork-manager';
import { toggleFavoritePersisted, shareTrack } from '../../src/core/utils/track-actions';
import {
  sortAndFilterTracks,
  groupTracksByField,
  SortField,
  SortDirection,
  SourceFilter,
  GroupedCollection,
} from '../../src/core/utils/library-grouping';
import { TrackMetadataModal } from '../../src/components/library/TrackMetadataModal';
import { AddToPlaylistModal } from '../../src/components/library/AddToPlaylistModal';

type Tab =
  | 'songs'
  | 'favorites'
  | 'albums'
  | 'artists'
  | 'genres'
  | 'folders'
  | 'playlists'
  | 'health';

const SORT_LABELS: Record<SortField, string> = {
  title: 'Nombre',
  artist: 'Artista',
  album: 'Álbum',
  duration: 'Duración',
  dateAdded: 'Fecha',
};

export default function LibraryScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('songs');

  useEffect(() => {
    if (
      tab &&
      ['songs', 'favorites', 'albums', 'artists', 'genres', 'folders', 'playlists', 'health'].includes(tab)
    ) {
      setActiveTab(tab as Tab);
    }
  }, [tab]);
  const [sortBy, setSortBy] = useState<SortField>('title');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const [selectedTrackForMenu, setSelectedTrackForMenu] = useState<Track | null>(null);
  const [metadataEditTrack, setMetadataEditTrack] = useState<Track | null>(null);
  const [playlistTargetTrack, setPlaylistTargetTrack] = useState<Track | null>(null);
  const [activeCollection, setActiveCollection] = useState<GroupedCollection | null>(null);
  const [isCollectionAlbum, setIsCollectionAlbum] = useState(false);

  const [missingTracks, setMissingTracks] = useState<Track[]>([]);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const tracks = useLibraryStore((s) => s.tracks);
  const favorites = useLibraryStore((s) => s.favorites);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const setTracks = useLibraryStore((s) => s.setTracks);
  const setFavorites = useLibraryStore((s) => s.setFavorites);
  const setIsScanning = useLibraryStore((s) => s.setIsScanning);

  const playlists = usePlaylistStore((s) => s.playlists);
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);

  const trackRepo = new TrackRepository();
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'playlists') {
      loadPlaylists().catch(() => { });
    }
    if (activeTab === 'health') {
      runMissingFilesCheck();
    }
  }, [activeTab]);

  const loadInitialData = async () => {
    try {
      const all = await trackRepo.getAllTracks();
      const favs = await trackRepo.getFavorites();
      setTracks(all);
      setFavorites(favs);
      await loadPlaylists();
    } catch (err) {
      console.error('Error loading tracks from SQLite:', err);
    }
  };

  const runMissingFilesCheck = async () => {
    setCheckingHealth(true);
    try {
      const missing = await LibraryHealthService.findMissingLocalFiles(tracks);
      setMissingTracks(missing);
    } finally {
      setCheckingHealth(false);
    }
  };

  const handlePickLocalFile = async () => {
    try {
      const imported = await LocalFileImporter.pickAndImportAudioFiles();
      if (imported.length > 0) {
        Alert.alert(
          '¡Música importada!',
          `Se importaron ${imported.length} archivo(s) de audio local.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo seleccionar el archivo.');
    }
  };

  const handlePickFolder = async () => {
    try {
      const res = await FolderManager.pickAndImportFolder();
      if (res.folderLabel) {
        Alert.alert(
          'Carpeta escaneada',
          `Carpeta "${res.folderLabel}": se importaron ${res.importedCount} pistas de audio.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error al abrir carpeta', err?.message || 'No se pudo leer la carpeta.');
    }
  };

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const freshTracks = await trackRepo.scanAndSaveTracks();
      const favs = await trackRepo.getFavorites();
      setTracks(freshTracks);
      setFavorites(favs);
      Alert.alert('Escaneo completado', `Tu biblioteca ahora tiene ${freshTracks.length} canciones.`);
    } catch (err: any) {
      Alert.alert('Error al escanear', err?.message || 'No se pudo completar el escaneo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCycleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'dateAdded' ? 'desc' : 'asc');
    }
  };

  const handleConfirmDelete = (track: Track) => {
    setSelectedTrackForMenu(null);
    Alert.alert(
      'Eliminar canción',
      `¿Deseas quitar permanentemente "${track.title}" de OpenWave?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await LocalFileImporter.deleteTrackPermanently(track);
              setMissingTracks((prev) => prev.filter((m) => m.id !== track.id));
              Alert.alert('Eliminada', 'La canción ha sido removida.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar.');
            }
          },
        },
      ]
    );
  };

  const baseList = activeTab === 'favorites' ? favorites : tracks;
  const sortedTracks = useMemo(
    () => sortAndFilterTracks(baseList, sortBy, sortDir, sourceFilter),
    [baseList, sortBy, sortDir, sourceFilter]
  );

  const groupedAlbums = useMemo(() => groupTracksByField(tracks, 'album'), [tracks]);
  const groupedArtists = useMemo(() => groupTracksByField(tracks, 'artist'), [tracks]);
  const groupedGenres = useMemo(() => groupTracksByField(tracks, 'genre'), [tracks]);
  const groupedFolders = useMemo(() => groupTracksByField(tracks, 'folder'), [tracks]);
  const duplicateGroups = useMemo(() => LibraryHealthService.findDuplicateTracks(tracks), [tracks]);
  const noCoverTracks = useMemo(
    () => LibraryHealthService.findTracksWithoutArtwork(tracks),
    [tracks]
  );

  const renderTrackItem = ({
    item,
    index,
    queueContext,
  }: {
    item: Track;
    index: number;
    queueContext?: Track[];
  }) => {
    const context = queueContext || sortedTracks;
    return (
      <TouchableOpacity
        style={styles.trackRow}
        onPress={() => playbackService.playTrack(item, context, index)}
        onLongPress={() => setSelectedTrackForMenu(item)}
        activeOpacity={0.7}
      >
        <View style={styles.trackIconContainer}>
          {item.artworkUri ? (
            <Image source={{ uri: item.artworkUri }} style={styles.trackThumb} />
          ) : (
            <Music color={colors.primary} size={18} />
          )}
        </View>
        <View style={styles.trackDetails}>
          <View style={styles.titleLine}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={[
                styles.originBadge,
                item.sourceType === 'stream' ? styles.streamBadge : styles.localBadge,
              ]}
            >
              <Text style={styles.originBadgeText}>
                {item.sourceType === 'stream' ? 'Online' : 'Local'}
              </Text>
            </View>
          </View>
          <Text style={styles.trackSubtitle} numberOfLines={1}>
            {item.artistName || 'Artista desconocido'} • {formatDuration(item.duration)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleFavoritePersisted(item)}
          style={styles.favButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Heart
            color={item.isFavorite ? colors.error : colors.textMuted}
            size={20}
            fill={item.isFavorite ? colors.error : 'transparent'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTrackForMenu(item)}
          style={styles.optionsButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MoreVertical color={colors.textMuted} size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const openSmartPlaylist = (config: SmartPlaylistConfig) => {
    const matched = evaluateSmartPlaylist(config.id, tracks);
    setIsCollectionAlbum(false);
    setActiveCollection({
      key: config.id,
      title: config.name,
      subtitle: `${config.description} (${matched.length})`,
      artworkUri: matched.find((t) => Boolean(t.artworkUri))?.artworkUri || null,
      tracks: matched,
    });
  };

  const renderGroupRow = (
    item: GroupedCollection,
    icon: React.ReactNode,
    isAlbum: boolean = false
  ) => (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={() => {
        setIsCollectionAlbum(isAlbum);
        setActiveCollection(item);
      }}
      activeOpacity={0.75}
    >
      <View style={styles.trackIconContainer}>
        {item.artworkUri ? (
          <Image source={{ uri: item.artworkUri }} style={styles.trackThumb} />
        ) : (
          icon
        )}
      </View>
      <View style={styles.trackDetails}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.quickPlayMini}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() =>
          item.tracks.length > 0 && playbackService.playTrack(item.tracks[0], item.tracks, 0)
        }
      >
        <Play color={colors.primary} size={16} fill={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Biblioteca</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={handlePickLocalFile}
            activeOpacity={0.8}
          >
            <FolderPlus color={colors.primary} size={15} />
            <Text style={styles.actionPillText}>Archivo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={handlePickFolder}
            activeOpacity={0.8}
          >
            <Folder color={colors.secondary} size={15} />
            <Text style={styles.actionPillText}>Carpeta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionPillButton, isScanning && styles.buttonDisabled]}
            activeOpacity={0.8}
            onPress={handleScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw color={colors.primary} size={15} />
            )}
            <Text style={styles.actionPillText}>
              {isScanning ? '...' : 'Escanear'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Navigation Pills */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TabButton label="Canciones" active={activeTab === 'songs'} onPress={() => setActiveTab('songs')} />
          <TabButton label="Favoritos" active={activeTab === 'favorites'} onPress={() => setActiveTab('favorites')} />
          <TabButton label="Álbumes" active={activeTab === 'albums'} onPress={() => setActiveTab('albums')} />
          <TabButton label="Artistas" active={activeTab === 'artists'} onPress={() => setActiveTab('artists')} />
          <TabButton label="Géneros" active={activeTab === 'genres'} onPress={() => setActiveTab('genres')} />
          <TabButton label="Carpetas" active={activeTab === 'folders'} onPress={() => setActiveTab('folders')} />
          <TabButton label="Playlists" active={activeTab === 'playlists'} onPress={() => setActiveTab('playlists')} />
          <TabButton label="Salud" active={activeTab === 'health'} onPress={() => setActiveTab('health')} />
        </ScrollView>
      </View>

      {/* Sort & Origin Bar (only for Songs & Favorites) */}
      {(activeTab === 'songs' || activeTab === 'favorites') && tracks.length > 0 && (
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarScroll}
          >
            {(['title', 'artist', 'album', 'duration', 'dateAdded'] as SortField[]).map((field) => {
              const active = sortBy === field;
              return (
                <TouchableOpacity
                  key={field}
                  style={[styles.sortChip, active && styles.sortChipActive]}
                  onPress={() => handleCycleSort(field)}
                >
                  <ArrowUpDown color={active ? '#0A0D15' : '#94A3B8'} size={12} />
                  <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                    {SORT_LABELS[field]} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.filterDivider} />

            {(['all', 'local', 'stream'] as SourceFilter[]).map((src) => {
              const active = sourceFilter === src;
              const label = src === 'all' ? 'Todos' : src === 'local' ? 'Local' : 'Online';
              return (
                <TouchableOpacity
                  key={src}
                  style={[styles.sortChip, active && styles.originChipActive]}
                  onPress={() => setSourceFilter(src)}
                >
                  <Text style={[styles.sortChipText, active && { color: colors.primary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content */}
      {activeTab === 'songs' || activeTab === 'favorites' ? (
        sortedTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Music color={colors.textDisabled} size={48} />
            <Text style={styles.emptyText}>No hay pistas disponibles</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'favorites'
                ? 'Marca canciones con el corazón para verlas aquí.'
                : 'Presiona "Archivo", "Carpeta" o "Escanear" para añadir música de tu dispositivo.'}
            </Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={handlePickLocalFile}>
              <FolderPlus color="#0A0D15" size={18} />
              <Text style={styles.emptyAddText}>Seleccionar Audio Descargado</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sortedTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => renderTrackItem({ item, index, queueContext: sortedTracks })}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : activeTab === 'albums' ? (
        <View style={styles.albumsGridContainer}>
          <FlatList
            data={groupedAlbums}
            keyExtractor={(item) => item.key}
            numColumns={3}
            columnWrapperStyle={styles.albumsRow}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.albumGridCard}
                onPress={() => {
                  setIsCollectionAlbum(true);
                  setActiveCollection(item);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.albumCoverBox}>
                  {item.artworkUri ? (
                    <Image source={{ uri: item.artworkUri }} style={styles.gridCover} />
                  ) : (
                    <Disc color={colors.primary} size={36} />
                  )}
                  <TouchableOpacity
                    style={styles.gridPlayOverlay}
                    onPress={() =>
                      item.tracks.length > 0 &&
                      playbackService.playTrack(item.tracks[0], item.tracks, 0)
                    }
                  >
                    <Play color="#FFFFFF" size={12} fill="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.albumGridTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.albumGridArtist} numberOfLines={1}>
                  {item.tracks.length} {item.tracks.length === 1 ? 'pista' : 'pistas'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : activeTab === 'artists' ? (
        <FlatList
          data={groupedArtists}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            renderGroupRow(item, <User color={colors.primary} size={20} />, false)
          }
        />
      ) : activeTab === 'genres' ? (
        <FlatList
          data={groupedGenres}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) =>
            renderGroupRow(item, <Tag color={colors.secondary} size={20} />, false)
          }
        />
      ) : activeTab === 'folders' ? (
        <FlatList
          data={groupedFolders}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <TouchableOpacity style={styles.folderActionBanner} onPress={handlePickFolder}>
              <FolderPlus color={colors.primary} size={20} />
              <Text style={styles.folderBannerText}>
                Importar carpeta completa (Storage Access Framework)
              </Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) =>
            renderGroupRow(item, <Folder color="#F59E0B" size={20} />, false)
          }
        />
      ) : activeTab === 'playlists' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.playlistActionsRow}>
            <TouchableOpacity
              style={styles.primaryPillBtn}
              onPress={() => router.push('/playlist/create' as any)}
            >
              <Plus color="#0A0D15" size={18} />
              <Text style={styles.primaryPillBtnText}>Nueva Lista</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryPillBtn}
              onPress={() => router.push('/importer' as any)}
            >
              <ArrowDownToLine color={colors.primary} size={18} />
              <Text style={styles.secondaryPillBtnText}>Importar (.json/.csv/.m3u)</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.groupHeading}>Listas Inteligentes</Text>
          {SYSTEM_SMART_PLAYLISTS.map((smart) => {
            const count = evaluateSmartPlaylist(smart.id, tracks).length;
            return (
              <TouchableOpacity
                key={smart.id}
                style={styles.trackRow}
                onPress={() => openSmartPlaylist(smart)}
              >
                <View style={[styles.trackIconContainer, { backgroundColor: 'rgba(0, 229, 255, 0.12)' }]}>
                  <Sparkles color={colors.primary} size={20} />
                </View>
                <View style={styles.trackDetails}>
                  <Text style={styles.trackTitle}>{smart.name}</Text>
                  <Text style={styles.trackSubtitle}>
                    {smart.description} • {count} pistas
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.groupHeading, { marginTop: 18 }]}>Mis Listas Personalizadas</Text>
          {playlists.length === 0 ? (
            <Text style={styles.emptySubtext}>
              Aún no creas ninguna lista personalizada. Toca "Nueva Lista" arriba para empezar.
            </Text>
          ) : (
            playlists.map((pl) => (
              <TouchableOpacity
                key={pl.id}
                style={styles.trackRow}
                onPress={() => router.push(`/playlist/${pl.id}` as any)}
              >
                <View style={styles.trackIconContainer}>
                  {pl.artworkUri ? (
                    <Image source={{ uri: pl.artworkUri }} style={styles.trackThumb} />
                  ) : (
                    <ListMusic color={colors.secondary} size={20} />
                  )}
                </View>
                <View style={styles.trackDetails}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {pl.name}
                  </Text>
                  <Text style={styles.trackSubtitle} numberOfLines={1}>
                    {pl.trackCount || 0} canciones{pl.description ? ` • ${pl.description}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        /* Health / Mantenimiento Tab */
        <ScrollView contentContainerStyle={styles.listContent}>
          <View style={styles.healthSummaryRow}>
            <View style={styles.healthCard}>
              <Text style={styles.healthNumber}>{duplicateGroups.length}</Text>
              <Text style={styles.healthLabel}>Duplicados</Text>
            </View>
            <View style={styles.healthCard}>
              <Text style={styles.healthNumber}>{noCoverTracks.length}</Text>
              <Text style={styles.healthLabel}>Sin portada</Text>
            </View>
            <View style={styles.healthCard}>
              <Text style={styles.healthNumber}>{missingTracks.length}</Text>
              <Text style={styles.healthLabel}>Inaccesibles</Text>
            </View>
          </View>

          <Text style={styles.groupHeading}>Archivos duplicados detectados</Text>
          {duplicateGroups.length === 0 ? (
            <Text style={styles.cleanStatusText}>✓ No hay duplicados en tu biblioteca.</Text>
          ) : (
            duplicateGroups.map((grp) => (
              <View key={grp.key} style={styles.healthBox}>
                <Text style={styles.healthBoxTitle}>
                  {grp.title} ({grp.tracks.length} copias)
                </Text>
                {grp.tracks.map((t) => (
                  <View key={t.id} style={styles.healthTrackRow}>
                    <Text style={styles.healthUriText} numberOfLines={1}>
                      {t.uri}
                    </Text>
                    <TouchableOpacity onPress={() => handleConfirmDelete(t)}>
                      <Trash2 color={colors.error} size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}

          <Text style={[styles.groupHeading, { marginTop: 18 }]}>
            Canciones sin portada ({noCoverTracks.length})
          </Text>
          {noCoverTracks.slice(0, 15).map((t) => (
            <View key={t.id} style={styles.trackRow}>
              <View style={styles.trackDetails}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={styles.trackSubtitle} numberOfLines={1}>
                  {t.artistName || 'Artista desconocido'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionPillButton}
                onPress={() => ArtworkManager.pickAndSaveArtwork(t.id)}
              >
                <ImageIcon color={colors.primary} size={14} />
                <Text style={styles.actionPillText}>Poner portada</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.missingHeaderRow}>
            <Text style={[styles.groupHeading, { marginTop: 18 }]}>
              Archivos borrados o inaccesibles ({missingTracks.length})
            </Text>
            <TouchableOpacity onPress={runMissingFilesCheck}>
              <RefreshCw color={colors.primary} size={16} />
            </TouchableOpacity>
          </View>
          {checkingHealth ? (
            <ActivityIndicator color={colors.primary} />
          ) : missingTracks.length === 0 ? (
            <Text style={styles.cleanStatusText}>✓ Todos los archivos locales existen.</Text>
          ) : (
            missingTracks.map((m) => (
              <View key={m.id} style={styles.trackRow}>
                <AlertTriangle color={colors.warning} size={18} style={{ marginRight: 10 }} />
                <View style={styles.trackDetails}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {m.title}
                  </Text>
                  <Text style={styles.trackSubtitle} numberOfLines={1}>
                    {m.uri}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleConfirmDelete(m)}>
                  <Trash2 color={colors.error} size={18} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Collection Detail Modal (Album / Artist / Genre / Folder / Smart Playlist) */}
      <Modal
        visible={activeCollection !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveCollection(null)}
      >
        <SafeAreaView style={styles.collectionModal} edges={['top', 'bottom']}>
          <View style={styles.collectionHeader}>
            <TouchableOpacity onPress={() => setActiveCollection(null)}>
              <X color="#FFFFFF" size={26} />
            </TouchableOpacity>
            <Text style={styles.collectionHeaderTitle} numberOfLines={1}>
              {activeCollection?.title}
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <View style={styles.collectionHero}>
            <View style={styles.collectionCover}>
              {activeCollection?.artworkUri ? (
                <Image source={{ uri: activeCollection.artworkUri }} style={styles.trackThumb} />
              ) : (
                <Disc color={colors.primary} size={44} />
              )}
            </View>
            <Text style={styles.collectionTitle}>{activeCollection?.title}</Text>
            <Text style={styles.collectionSub}>{activeCollection?.subtitle}</Text>

            <View style={styles.collectionActions}>
              <TouchableOpacity
                style={styles.primaryPillBtn}
                onPress={() => {
                  const list = activeCollection?.tracks || [];
                  if (list.length > 0) playbackService.playTrack(list[0], list, 0);
                }}
              >
                <Play color="#0A0D15" size={16} fill="#0A0D15" />
                <Text style={styles.primaryPillBtnText}>Reproducir todo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryPillBtn}
                onPress={() => {
                  const list = [...(activeCollection?.tracks || [])].sort(() => Math.random() - 0.5);
                  if (list.length > 0) playbackService.playTrack(list[0], list, 0);
                }}
              >
                <Shuffle color={colors.primary} size={16} />
                <Text style={styles.secondaryPillBtnText}>Aleatorio</Text>
              </TouchableOpacity>

              {isCollectionAlbum && activeCollection && (
                <TouchableOpacity
                  style={styles.secondaryPillBtn}
                  onPress={async () => {
                    const uri = await ArtworkManager.pickAndSaveAlbumArtwork(activeCollection.key);
                    if (uri) {
                      setActiveCollection((prev) => (prev ? { ...prev, artworkUri: uri } : prev));
                      Alert.alert('¡Álbum actualizado!', 'Se actualizó la portada del álbum.');
                    }
                  }}
                >
                  <ImageIcon color={colors.secondary} size={16} />
                  <Text style={styles.secondaryPillBtnText}>Portada álbum</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={activeCollection?.tracks || []}
            keyExtractor={(t) => t.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) =>
              renderTrackItem({ item, index, queueContext: activeCollection?.tracks })
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Track Options Bottom Sheet Modal */}
      <Modal
        visible={selectedTrackForMenu !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTrackForMenu(null)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleBlock}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {selectedTrackForMenu?.title}
                </Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {selectedTrackForMenu?.artistName || 'Artista desconocido'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedTrackForMenu(null)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                if (selectedTrackForMenu) {
                  playbackService.insertNext(selectedTrackForMenu);
                  setSelectedTrackForMenu(null);
                  Alert.alert('Cola actualizada', 'Se reproducirá a continuación.');
                }
              }}
            >
              <SkipForward color={colors.primary} size={20} />
              <Text style={styles.sheetOptionText}>Reproducir siguiente</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                if (selectedTrackForMenu) {
                  playbackService.appendToQueue([selectedTrackForMenu]);
                  setSelectedTrackForMenu(null);
                  Alert.alert('Cola actualizada', 'Canción añadida al final de la cola.');
                }
              }}
            >
              <ListPlus color={colors.secondary} size={20} />
              <Text style={styles.sheetOptionText}>Añadir a la cola</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                const target = selectedTrackForMenu;
                setSelectedTrackForMenu(null);
                if (target) setPlaylistTargetTrack(target);
              }}
            >
              <ListMusic color="#A5B4FC" size={20} />
              <Text style={styles.sheetOptionText}>Añadir a una playlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                const target = selectedTrackForMenu;
                setSelectedTrackForMenu(null);
                if (target) setMetadataEditTrack(target);
              }}
            >
              <Pencil color="#F59E0B" size={20} />
              <Text style={styles.sheetOptionText}>Editar nombre, artista y álbum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={async () => {
                const target = selectedTrackForMenu;
                setSelectedTrackForMenu(null);
                if (!target) return;
                try {
                  const uri = await ArtworkManager.pickAndSaveArtwork(target.id);
                  if (uri) {
                    Alert.alert('¡Listo!', 'Portada personalizada guardada correctamente.');
                  }
                } catch (err: any) {
                  Alert.alert('Error', err?.message || 'No se pudo guardar la imagen.');
                }
              }}
            >
              <ImageIcon color="#A5B4FC" size={20} />
              <Text style={styles.sheetOptionText}>Cambiar portada / imagen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => {
                const target = selectedTrackForMenu;
                setSelectedTrackForMenu(null);
                if (target) shareTrack(target);
              }}
            >
              <Share2 color="#E2E8F0" size={20} />
              <Text style={styles.sheetOptionText}>Compartir canción</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sheetOption, styles.sheetDangerOption]}
              onPress={() => selectedTrackForMenu && handleConfirmDelete(selectedTrackForMenu)}
            >
              <Trash2 color={colors.error} size={20} />
              <Text style={[styles.sheetOptionText, { color: colors.error }]}>
                Eliminar canción permanentemente
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TrackMetadataModal
        track={metadataEditTrack}
        visible={metadataEditTrack !== null}
        onClose={() => setMetadataEditTrack(null)}
      />

      <AddToPlaylistModal
        track={playlistTargetTrack}
        visible={playlistTargetTrack !== null}
        onClose={() => setPlaylistTargetTrack(null)}
      />
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    ...typography.h1,
    color: '#FFFFFF',
    fontSize: 24,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  actionPillText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  tabButton: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#141A28',
  },
  tabButtonActive: {
    backgroundColor: '#2D3A56',
  },
  tabText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterBarContainer: {
    marginBottom: 8,
  },
  filterBarScroll: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#121826',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  originChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  sortChipText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#0A0D15',
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  trackIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#161C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  trackThumb: {
    width: '100%',
    height: '100%',
  },
  trackDetails: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    flexShrink: 1,
  },
  originBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  localBadge: {
    backgroundColor: 'rgba(0, 200, 150, 0.14)',
  },
  streamBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  originBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  trackSubtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  favButton: {
    padding: 6,
  },
  optionsButton: {
    padding: 6,
    marginLeft: 2,
  },
  quickPlayMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtext: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyAddText: {
    ...typography.bodyBold,
    color: '#0A0D15',
  },
  albumsGridContainer: {
    flex: 1,
  },
  albumsRow: {
    justifyContent: 'flex-start',
    gap: '3.5%',
    marginBottom: 16,
  },
  albumGridCard: {
    width: '31%',
  },
  albumCoverBox: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#1E2538',
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridPlayOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGridTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F3F4F6',
  },
  albumGridArtist: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  folderActionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  folderBannerText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
    flex: 1,
  },
  playlistActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  primaryPillBtnText: {
    ...typography.bodyBold,
    color: '#0A0D15',
    fontSize: 13,
  },
  secondaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  secondaryPillBtnText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  healthSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  healthCard: {
    flex: 1,
    backgroundColor: '#141A28',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  healthNumber: {
    ...typography.h2,
    color: colors.primary,
  },
  healthLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  cleanStatusText: {
    color: colors.secondary,
    fontSize: 13,
    paddingVertical: 8,
  },
  healthBox: {
    backgroundColor: '#141A28',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  healthBoxTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  healthTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 10,
  },
  healthUriText: {
    fontSize: 11,
    color: '#94A3B8',
    flex: 1,
  },
  missingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collectionModal: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  collectionHeaderTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    maxWidth: '75%',
  },
  collectionHero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  collectionCover: {
    width: 110,
    height: 110,
    borderRadius: 18,
    backgroundColor: '#1A2133',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  collectionTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  collectionSub: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
  collectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#141A28',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.07)',
  },
  sheetTitleBlock: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  sheetSubtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sheetOptionText: {
    ...typography.body,
    color: '#F8FAFC',
  },
  sheetDangerOption: {
    marginTop: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
