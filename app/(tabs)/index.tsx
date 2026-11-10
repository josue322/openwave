import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles, HardDrive, ArrowDownToLine, Music2, Play } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlayerStore } from '../../src/store/player-store';

export default function HomeScreen() {
  const router = useRouter();
  const totalTracks = useLibraryStore((s) => s.totalTracks);
  const tracks = useLibraryStore((s) => s.tracks);
  const setQueue = usePlayerStore((s) => s.setQueue);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>OPENWAVE</Text>
            <Text style={styles.subtitle}>Reproductor Offline & Soberanía Musical</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>v1.1</Text>
          </View>
        </View>

        {/* Quick Stats Banner */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Music2 color={colors.primary} size={24} />
            <Text style={styles.statNumber}>{totalTracks}</Text>
            <Text style={styles.statLabel}>Canciones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <HardDrive color={colors.secondary} size={24} />
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Offline</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Sparkles color={colors.accent} size={24} />
            <Text style={styles.statNumber}>FLAC/MP3</Text>
            <Text style={styles.statLabel}>Hi-Fi</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/library' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.primaryMuted }]}>
              <HardDrive color={colors.primary} size={22} />
            </View>
            <Text style={styles.actionTitle}>Escanear Biblioteca</Text>
            <Text style={styles.actionDescription}>Buscar canciones en la memoria local</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/importer' as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 200, 150, 0.15)' }]}>
              <ArrowDownToLine color={colors.secondary} size={22} />
            </View>
            <Text style={styles.actionTitle}>Importar Listas</Text>
            <Text style={styles.actionDescription}>Desde Spotify o Google Takeout</Text>
          </TouchableOpacity>
        </View>

        {/* Featured / Recent section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Canciones Disponibles</Text>
          {tracks.length > 0 && (
            <TouchableOpacity onPress={() => setQueue(tracks, 0)}>
              <Text style={styles.playAllText}>Reproducir todo</Text>
            </TouchableOpacity>
          )}
        </View>

        {tracks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Music2 color={colors.textDisabled} size={48} />
            <Text style={styles.emptyTitle}>Tu biblioteca está vacía</Text>
            <Text style={styles.emptySubtitle}>
              Ve a la pestaña Biblioteca para escanear los archivos de audio de tu dispositivo Android.
            </Text>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => router.push('/(tabs)/library' as any)}
            >
              <Text style={styles.scanButtonText}>Ir a Biblioteca</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.trackList}>
            {tracks.slice(0, 5).map((track, index) => (
              <TouchableOpacity
                key={track.id}
                style={styles.trackItem}
                onPress={() => setQueue(tracks, index)}
              >
                <View style={styles.trackIndex}>
                  <Text style={styles.trackIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {track.artistName || 'Artista desconocido'}
                  </Text>
                </View>
                <Play color={colors.textMuted} size={18} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    ...typography.h1,
    color: colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '700',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  playAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  actionDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
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
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  scanButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanButtonText: {
    ...typography.caption,
    color: '#0A0D14',
    fontWeight: '700',
  },
  trackList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackIndex: {
    width: 28,
  },
  trackIndexText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  trackInfo: {
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
});

