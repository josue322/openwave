import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music, RefreshCw, Heart, FolderPlus, Play, Disc, MoreVertical, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import { Track } from '../../src/domain/entities/track';
import { TrackRepository } from '../../src/data/repositories/track-repository';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { LocalFileImporter } from '../../src/core/utils/local-file-importer';
import { ArtworkManager } from '../../src/core/utils/artwork-manager';

type Tab = 'songs' | 'albums' | 'artists' | 'favorites';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const tracks = useLibraryStore((s) => s.tracks);
  const favorites = useLibraryStore((s) => s.favorites);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const setTracks = useLibraryStore((s) => s.setTracks);
  const setFavorites = useLibraryStore((s) => s.setFavorites);
  const setIsScanning = useLibraryStore((s) => s.setIsScanning);
  const toggleFavoriteStore = useLibraryStore((s) => s.toggleFavorite);

  const trackRepo = new TrackRepository();
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const all = await trackRepo.getAllTracks();
      const favs = await trackRepo.getFavorites();
      setTracks(all);
      setFavorites(favs);
    } catch (err) {
      console.error('Error loading tracks from SQLite:', err);
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

  const handleScan = async () => {
    if (isScanning) return;
    setIsScanning(true);

    try {
      const freshTracks = await trackRepo.scanAndSaveTracks();
      const favs = await trackRepo.getFavorites();
      setTracks(freshTracks);
      setFavorites(favs);
      Alert.alert('Escaneo completado', `Se encontraron ${freshTracks.length} canciones locales.`);
    } catch (err: any) {
      Alert.alert('Error al escanear', err?.message || 'No se pudo completar el escaneo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleFavorite = async (track: Track) => {
    const nextFav = !track.isFavorite;
    toggleFavoriteStore(track.id);
    try {
      await trackRepo.toggleFavorite(track.id, nextFav);
    } catch (err) {
      console.error('Failed to update favorite status in DB:', err);
    }
  };

  const handleTrackOptions = (track: Track) => {
    Alert.alert(
      track.title,
      `${track.artistName || 'Música local'} • Opciones de la pista:`,
      [
        {
          text: 'Cambiar portada / imagen',
          onPress: async () => {
            try {
              const uri = await ArtworkManager.pickAndSaveArtwork(track.id);
              if (uri) {
                Alert.alert('¡Listo!', 'Portada personalizada guardada correctamente.');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo guardar la imagen.');
            }
          },
        },
        {
          text: 'Eliminar canción',
          style: 'destructive',
          onPress: () => {
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
                      Alert.alert('Eliminada', 'La canción ha sido removida.');
                    } catch (err: any) {
                      Alert.alert('Error', err?.message || 'No se pudo eliminar.');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const displayTracks = activeTab === 'favorites' ? favorites : tracks;

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={() => playbackService.playTrack(item, displayTracks, index)}
      onLongPress={() => handleTrackOptions(item)}
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
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackSubtitle} numberOfLines={1}>
          {item.artistName || 'Artista desconocido'} • {formatDuration(item.duration)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleToggleFavorite(item)}
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
        onPress={() => handleTrackOptions(item)}
        style={styles.optionsButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical color={colors.textMuted} size={18} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Biblioteca</Text>
        <View style={styles.headerButtons}>
          {/* User's requested button: Pick Local File */}
          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={handlePickLocalFile}
            activeOpacity={0.8}
          >
            <FolderPlus color={colors.primary} size={16} />
            <Text style={styles.actionPillText}>Subir archivo</Text>
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
              <RefreshCw color={colors.primary} size={16} />
            )}
            <Text style={styles.actionPillText}>
              {isScanning ? 'Escaneando...' : 'Escanear'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Filter matching Reference 1 style */}
      <View style={styles.tabsContainer}>
        <TabButton
          label="Canciones"
          active={activeTab === 'songs'}
          onPress={() => setActiveTab('songs')}
        />
        <TabButton
          label="Favoritos"
          active={activeTab === 'favorites'}
          onPress={() => setActiveTab('favorites')}
        />
        <TabButton
          label="Álbumes"
          active={activeTab === 'albums'}
          onPress={() => setActiveTab('albums')}
        />
        <TabButton
          label="Artistas"
          active={activeTab === 'artists'}
          onPress={() => setActiveTab('artists')}
        />
      </View>

      {/* Content */}
      {displayTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Music color={colors.textDisabled} size={48} />
          <Text style={styles.emptyText}>No hay pistas disponibles</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'favorites'
              ? 'Marca canciones con el corazón para verlas aquí.'
              : 'Presiona "Subir archivo" para importar un audio descargado o "Escanear" para buscar en el dispositivo.'}
          </Text>
          <TouchableOpacity style={styles.emptyAddButton} onPress={handlePickLocalFile}>
            <FolderPlus color="#0A0D15" size={18} />
            <Text style={styles.emptyAddText}>Seleccionar Audio Descargado</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'albums' ? (
        <View style={styles.albumsGridContainer}>
          <FlatList
            data={displayTracks}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.albumsRow}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.albumGridCard}
                onPress={() => playbackService.playTrack(item, displayTracks, index)}
                activeOpacity={0.85}
              >
                <View style={styles.albumCoverBox}>
                  {item.artworkUri ? (
                    <Image source={{ uri: item.artworkUri }} style={styles.gridCover} />
                  ) : (
                    <Disc color={colors.primary} size={36} />
                  )}
                  <View style={styles.gridPlayOverlay}>
                    <Play color="#FFFFFF" size={12} fill="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.albumGridTitle} numberOfLines={1}>
                  {item.albumTitle || item.title}
                </Text>
                <Text style={styles.albumGridArtist} numberOfLines={1}>
                  {item.artistName || 'Desconocido'}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        <FlatList
          data={displayTracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  const totalSeconds = Math.floor(ms / 1000);
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  screenTitle: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161C2C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  actionPillText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#141A28',
  },
  tabButtonActive: {
    backgroundColor: '#2D3A56', // Active indicator matching Reference 1
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    marginRight: 14,
    overflow: 'hidden',
  },
  trackThumb: {
    width: '100%',
    height: '100%',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
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
    marginLeft: 4,
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
    justifyContent: 'space-between',
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
});
