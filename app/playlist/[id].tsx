import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  Modal,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import {
  ChevronDown,
  Play,
  Shuffle,
  Trash2,
  Music,
  Pencil,
  Share2,
  ListPlus,
  ArrowUp,
  ArrowDown,
  Camera,
  X,
  Check,
  ArrowDownToLine,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlaylistStore } from '../../src/store/playlist-store';
import { useLibraryStore } from '../../src/store/library-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { ArtworkManager } from '../../src/core/utils/artwork-manager';
import { M3uGenerator } from '../../src/integrations/exporter/m3u-generator';
import { Track } from '../../src/domain/entities/track';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activePlaylist = usePlaylistStore((s) => s.activePlaylist);
  const selectPlaylist = usePlaylistStore((s) => s.selectPlaylist);
  const updatePlaylist = usePlaylistStore((s) => s.updatePlaylist);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist);
  const removeTrackFromPlaylist = usePlaylistStore((s) => s.removeTrackFromPlaylist);
  const reorderPlaylistTracks = usePlaylistStore((s) => s.reorderPlaylistTracks);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
  const libraryTracks = useLibraryStore((s) => s.tracks);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showAddTracksModal, setShowAddTracksModal] = useState(false);

  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    if (id) {
      selectPlaylist(id);
    }
  }, [id]);

  const handleOpenEdit = () => {
    if (!activePlaylist) return;
    setEditName(activePlaylist.name);
    setEditDesc(activePlaylist.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!id || !editName.trim()) {
      Alert.alert('Nombre requerido', 'El nombre de la lista no puede quedar vacío.');
      return;
    }
    await updatePlaylist(id, {
      name: editName.trim(),
      description: editDesc.trim() || null,
    });
    setShowEditModal(false);
  };

  const handlePickArtwork = async () => {
    if (!id) return;
    try {
      const uri = await ArtworkManager.pickAndSavePlaylistArtwork(id);
      if (uri) {
        await updatePlaylist(id, { artworkUri: uri });
        Alert.alert('Portada guardada', 'Se actualizó la portada de esta lista.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo asignar la portada.');
    }
  };

  const handleSharePlaylist = async () => {
    if (!activePlaylist) return;
    const summary = activePlaylist.tracks
      .map((t, i) => `${i + 1}. ${t.title} - ${t.artistName || 'Artista desconocido'}`)
      .join('\n');
    await Share.share({
      title: activePlaylist.name,
      message: `🎵 Playlist "${activePlaylist.name}" (OpenWave):\n\n${summary || 'Lista vacía'}`,
    });
  };

  const handleExportM3u = async () => {
    if (!activePlaylist) return;
    try {
      const { StorageAccessFramework } = FileSystem;
      const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!perm.granted || !perm.directoryUri) return;

      const safeName = activePlaylist.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'playlist';
      const content = M3uGenerator.generateM3u(activePlaylist.name, activePlaylist.tracks);
      const fileUri = await StorageAccessFramework.createFileAsync(
        perm.directoryUri,
        safeName,
        'audio/x-mpegurl'
      );
      await StorageAccessFramework.writeAsStringAsync(fileUri, content);
      Alert.alert('¡Playlist exportada!', `Se guardó "${safeName}.m3u" en la carpeta seleccionada.`);
    } catch (err: any) {
      Alert.alert('Error al exportar', err?.message || 'No se pudo exportar el archivo M3U.');
    }
  };

  const handlePlayAll = (shuffle: boolean = false) => {
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;
    const tracks = [...activePlaylist.tracks];
    if (shuffle) {
      const shuffled = [...tracks].sort(() => Math.random() - 0.5);
      playbackService.playTrack(shuffled[0], shuffled, 0);
    } else {
      playbackService.playTrack(tracks[0], tracks, 0);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar lista',
      `¿Estás seguro de que deseas eliminar la lista "${activePlaylist?.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deletePlaylist(id);
              router.back();
            }
          },
        },
      ]
    );
  };

  const existingIds = new Set((activePlaylist?.tracks || []).map((t) => t.id));
  const availableTracks = libraryTracks.filter((t) => !existingIds.has(t.id));

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={() => playbackService.playTrack(item, activePlaylist?.tracks, index)}
      activeOpacity={0.75}
    >
      <View style={styles.trackIndex}>
        <Text style={styles.indexText}>{index + 1}</Text>
      </View>
      <View style={styles.trackDetails}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artistName || 'Artista desconocido'}
        </Text>
      </View>

      <View style={styles.rowControls}>
        <TouchableOpacity
          onPress={() => id && reorderPlaylistTracks(id, index, index - 1)}
          disabled={index === 0}
          style={[styles.rowBtn, index === 0 && { opacity: 0.25 }]}
        >
          <ArrowUp color={colors.textSecondary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => id && reorderPlaylistTracks(id, index, index + 1)}
          disabled={!activePlaylist || index === activePlaylist.tracks.length - 1}
          style={[
            styles.rowBtn,
            (!activePlaylist || index === activePlaylist.tracks.length - 1) && { opacity: 0.25 },
          ]}
        >
          <ArrowDown color={colors.textSecondary} size={16} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => id && removeTrackFromPlaylist(id, item.id)}
          style={styles.rowBtn}
        >
          <Trash2 color={colors.error} size={16} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={handleOpenEdit} style={styles.topIconBtn}>
            <Pencil color={colors.textPrimary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSharePlaylist} style={styles.topIconBtn}>
            <Share2 color={colors.textPrimary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleExportM3u} style={styles.topIconBtn}>
            <ArrowDownToLine color={colors.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.topIconBtn}>
            <Trash2 color={colors.error} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlist Meta */}
      <View style={styles.playlistMeta}>
        <TouchableOpacity
          style={styles.coverPlaceholder}
          onPress={handlePickArtwork}
          activeOpacity={0.85}
        >
          {activePlaylist?.artworkUri ? (
            <Image source={{ uri: activePlaylist.artworkUri }} style={styles.coverImg} />
          ) : (
            <Music color={colors.primary} size={44} />
          )}
          <View style={styles.coverCameraPill}>
            <Camera color="#FFFFFF" size={12} />
          </View>
        </TouchableOpacity>

        <Text style={styles.playlistName}>{activePlaylist?.name || 'Cargando lista...'}</Text>
        {activePlaylist?.description && (
          <Text style={styles.playlistDesc}>{activePlaylist.description}</Text>
        )}
        <Text style={styles.trackCount}>{activePlaylist?.tracks.length || 0} canciones</Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={() => handlePlayAll(false)}
            activeOpacity={0.8}
          >
            <Play color="#0A0D14" size={18} fill="#0A0D14" />
            <Text style={styles.playButtonText}>Reproducir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shuffleButton}
            onPress={() => handlePlayAll(true)}
            activeOpacity={0.8}
          >
            <Shuffle color={colors.primary} size={18} />
            <Text style={styles.shuffleButtonText}>Aleatorio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.shuffleButton}
            onPress={() => setShowAddTracksModal(true)}
            activeOpacity={0.8}
          >
            <ListPlus color={colors.secondary} size={18} />
            <Text style={styles.shuffleButtonText}>Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tracks list */}
      <FlatList
        data={activePlaylist?.tracks || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTrackItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Esta lista no tiene canciones aún.</Text>
          </View>
        }
      />

      {/* Edit Name Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Playlist</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre de la lista"
              placeholderTextColor={colors.textDisabled}
            />
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={styles.input}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Descripción opcional"
              placeholderTextColor={colors.textDisabled}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
              <Check color="#0A0D14" size={18} />
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Tracks Modal */}
      <Modal
        visible={showAddTracksModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddTracksModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxHeight: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Añadir Canciones</Text>
              <TouchableOpacity onPress={() => setShowAddTracksModal(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            {availableTracks.length === 0 ? (
              <Text style={styles.emptyText}>Todas tus canciones ya están en esta lista.</Text>
            ) : (
              <FlatList
                data={availableTracks}
                keyExtractor={(t) => t.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.addRow}
                    onPress={() => id && addTrackToPlaylist(id, item.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.trackTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.trackArtist} numberOfLines={1}>
                        {item.artistName || 'Artista desconocido'}
                      </Text>
                    </View>
                    <ListPlus color={colors.primary} size={20} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  topIconBtn: {
    padding: 4,
  },
  playlistMeta: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  coverPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  coverCameraPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
    borderRadius: 10,
  },
  playlistName: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  playlistDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  trackCount: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    ...typography.bodyBold,
    color: '#0A0D14',
    fontSize: 13,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackIndex: {
    width: 26,
  },
  indexText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  trackArtist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#141B29',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  inputLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0C101B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  saveBtnText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
});
