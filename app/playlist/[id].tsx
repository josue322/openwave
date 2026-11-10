import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Play, Shuffle, Trash2, Music } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlaylistStore } from '../../src/store/playlist-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { Track } from '../../src/domain/entities/track';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const activePlaylist = usePlaylistStore((s) => s.activePlaylist);
  const selectPlaylist = usePlaylistStore((s) => s.selectPlaylist);
  const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);

  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    if (id) {
      selectPlaylist(id);
    }
  }, [id]);

  const handlePlayAll = (shuffle: boolean = false) => {
    if (!activePlaylist || activePlaylist.tracks.length === 0) return;
    const tracks = [...activePlaylist.tracks];
    if (shuffle) {
      playbackService.playTrack(tracks[0], tracks, 0);
      playbackService.toggleShuffle();
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

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={() => playbackService.playTrack(item, activePlaylist?.tracks, index)}
      activeOpacity={0.7}
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
      <Play color={colors.textMuted} size={18} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Trash2 color={colors.error} size={22} />
        </TouchableOpacity>
      </View>

      {/* Playlist Meta */}
      <View style={styles.playlistMeta}>
        <View style={styles.coverPlaceholder}>
          <Music color={colors.primary} size={44} />
        </View>
        <Text style={styles.playlistName}>{activePlaylist?.name || 'Cargando lista...'}</Text>
        {activePlaylist?.description && (
          <Text style={styles.playlistDesc}>{activePlaylist.description}</Text>
        )}
        <Text style={styles.trackCount}>{activePlaylist?.tracks.length || 0} canciones</Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.playButton} onPress={() => handlePlayAll(false)} activeOpacity={0.8}>
            <Play color="#0A0D14" size={20} fill="#0A0D14" />
            <Text style={styles.playButtonText}>Reproducir</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shuffleButton} onPress={() => handlePlayAll(true)} activeOpacity={0.8}>
            <Shuffle color={colors.primary} size={20} />
            <Text style={styles.shuffleButtonText}>Aleatorio</Text>
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
  playlistMeta: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  coverPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    gap: 12,
    marginTop: 16,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  playButtonText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  shuffleButtonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackIndex: {
    width: 28,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
