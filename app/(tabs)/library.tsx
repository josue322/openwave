import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Music, Disc, Users, ListMusic, RefreshCw, Heart } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlayerStore } from '../../src/store/player-store';
import { Track } from '../../src/domain/entities/track';

type Tab = 'songs' | 'albums' | 'artists' | 'playlists' | 'favorites';

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const tracks = useLibraryStore((s) => s.tracks);
  const favorites = useLibraryStore((s) => s.favorites);
  const isScanning = useLibraryStore((s) => s.isScanning);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);

  const displayTracks = activeTab === 'favorites' ? favorites : tracks;

  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackRow}
      onPress={() => setQueue(displayTracks, index)}
      activeOpacity={0.7}
    >
      <View style={styles.trackIconContainer}>
        <Music color={colors.primary} size={18} />
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
        onPress={() => toggleFavorite(item.id)}
        style={styles.favButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Heart
          color={item.isFavorite ? colors.error : colors.textMuted}
          size={20}
          fill={item.isFavorite ? colors.error : 'transparent'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Biblioteca</Text>
        <TouchableOpacity style={styles.scanButton} activeOpacity={0.8}>
          <RefreshCw color={colors.primary} size={18} />
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Escaneando...' : 'Escanear'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Filter */}
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
        <TabButton
          label="Playlists"
          active={activeTab === 'playlists'}
          onPress={() => setActiveTab('playlists')}
        />
      </View>

      {/* Content */}
      {displayTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Music color={colors.textDisabled} size={48} />
          <Text style={styles.emptyText}>No hay pistas disponibles</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'favorites'
              ? 'Marca pistas con el corazón para verlas aquí.'
              : 'Presiona "Escanear" para indexar la música de tu teléfono.'}
          </Text>
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
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  scanButtonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0A0D14',
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
    borderBottomColor: colors.border,
  },
  trackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  trackSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  favButton: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
});

