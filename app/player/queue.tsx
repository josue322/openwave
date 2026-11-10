import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Trash2, Music, Play } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlayerStore } from '../../src/store/player-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { Track } from '../../src/domain/entities/track';

export default function QueueScreen() {
  const router = useRouter();
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const playbackService = PlaybackService.getInstance();
  const queueManager = playbackService.getQueueManager();

  const handleRemoveTrack = (index: number) => {
    queueManager.removeAt(index);
    const updated = queueManager.getQueue();
    setQueue(updated, queueManager.getCurrentIndex());
  };

  const handlePlayFromQueue = (track: Track, index: number) => {
    playbackService.playTrack(track, queue, index);
  };

  const renderQueueItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = index === queueIndex;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrent && styles.trackItemActive]}
        onPress={() => handlePlayFromQueue(item, index)}
        activeOpacity={0.7}
      >
        <View style={styles.indexContainer}>
          {isCurrent ? (
            <Play color={colors.primary} size={16} fill={colors.primary} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.trackDetails}>
          <Text
            style={[styles.trackTitle, isCurrent && styles.trackTitleActive]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artistName || 'Artista desconocido'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => handleRemoveTrack(index)}
          style={styles.removeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 color={colors.textMuted} size={18} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Cola de Reproducción</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Queue Items */}
      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Music color={colors.textDisabled} size={48} />
          <Text style={styles.emptyTitle}>La cola está vacía</Text>
          <Text style={styles.emptySubtitle}>
            Selecciona canciones desde la Biblioteca para comenzar a escuchar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  screenTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackItemActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  indexContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  trackDetails: {
    flex: 1,
    marginHorizontal: 12,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  trackTitleActive: {
    color: colors.primary,
  },
  trackArtist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 6,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});
