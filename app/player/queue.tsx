import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Trash2,
  Music,
  Play,
  ArrowUp,
  ArrowDown,
  Shuffle,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlayerStore } from '../../src/store/player-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { Track } from '../../src/domain/entities/track';

export default function QueueScreen() {
  const router = useRouter();
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const shuffle = usePlayerStore((s) => s.shuffle);

  const playbackService = PlaybackService.getInstance();

  const handleRemoveTrack = (index: number) => {
    playbackService.removeFromQueue(index);
  };

  const handleMoveTrack = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= queue.length) return;
    playbackService.reorderQueue(fromIndex, toIndex);
  };

  const handlePlayFromQueue = (track: Track, index: number) => {
    playbackService.playTrack(track, queue, index);
  };

  const handleClearQueue = () => {
    if (queue.length === 0) return;
    Alert.alert(
      'Vaciar cola de reproducción',
      '¿Deseas detener la reproducción actual y limpiar toda la cola?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: () => playbackService.clearQueue(),
        },
      ]
    );
  };

  const renderQueueItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = index === queueIndex;

    return (
      <TouchableOpacity
        style={[styles.trackItem, isCurrent && styles.trackItemActive]}
        onPress={() => handlePlayFromQueue(item, index)}
        activeOpacity={0.75}
      >
        <View style={styles.indexContainer}>
          {isCurrent ? (
            <Play color={colors.primary} size={16} fill={colors.primary} />
          ) : (
            <Text style={styles.indexText}>{index + 1}</Text>
          )}
        </View>

        <View style={styles.thumbBox}>
          {item.artworkUri ? (
            <Image source={{ uri: item.artworkUri }} style={styles.thumbImage} />
          ) : (
            <Music color={isCurrent ? colors.primary : colors.textMuted} size={16} />
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

        <View style={styles.actionsGroup}>
          <TouchableOpacity
            onPress={() => handleMoveTrack(index, index - 1)}
            disabled={index === 0}
            style={[styles.actionIcon, index === 0 && { opacity: 0.25 }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <ArrowUp color={colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleMoveTrack(index, index + 1)}
            disabled={index === queue.length - 1}
            style={[styles.actionIcon, index === queue.length - 1 && { opacity: 0.25 }]}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <ArrowDown color={colors.textSecondary} size={16} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleRemoveTrack(index)}
            style={styles.actionIcon}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
          >
            <Trash2 color={colors.error} size={16} />
          </TouchableOpacity>
        </View>
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
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>Cola de Reproducción</Text>
          <Text style={styles.queueCount}>
            {queue.length} {queue.length === 1 ? 'pista' : 'pistas'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => playbackService.toggleShuffle()}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Shuffle color={shuffle ? colors.primary : colors.textSecondary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearQueue}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 10 }}
          >
            <Trash2 color={queue.length > 0 ? colors.error : colors.textDisabled} size={20} />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: {
    alignItems: 'center',
  },
  screenTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  queueCount: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackItemActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  indexContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  thumbBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  trackDetails: {
    flex: 1,
    marginHorizontal: 10,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 14,
  },
  trackTitleActive: {
    color: colors.primary,
  },
  trackArtist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
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
