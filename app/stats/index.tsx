import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, History, Play, Music, Award, Clock } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { TrackDao, PlayHistoryEntry } from '../../src/data/local/track-dao';
import { useLibraryStore } from '../../src/store/library-store';
import { PlaybackService } from '../../src/playback/service/playback-service';

export default function StatsAndHistoryScreen() {
  const router = useRouter();
  const tracks = useLibraryStore((s) => s.tracks);
  const favorites = useLibraryStore((s) => s.favorites);

  const [history, setHistory] = useState<PlayHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const trackDao = new TrackDao();
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const entries = await trackDao.getPlayHistory(100);
      setHistory(entries);
    } catch (e) {
      console.error('Error loading play history:', e);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalPlays = tracks.reduce((sum, t) => sum + (t.playCount || 0), 0);
    const totalMinutes = Math.round(
      tracks.reduce((sum, t) => sum + ((t.duration || 0) * (t.playCount || 0)) / 60000, 0)
    );

    const topTracks = [...tracks]
      .filter((t) => (t.playCount || 0) > 0)
      .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
      .slice(0, 5);

    const artistCounts = new Map<string, number>();
    for (const t of tracks) {
      if ((t.playCount || 0) > 0) {
        const artist = t.artistName || 'Artista desconocido';
        artistCounts.set(artist, (artistCounts.get(artist) || 0) + (t.playCount || 0));
      }
    }
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { totalPlays, totalMinutes, topTracks, topArtists };
  }, [tracks]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronDown color="#FFFFFF" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial y Estadísticas</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Metrics Summary Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Play color={colors.primary} size={20} />
            <Text style={styles.metricNumber}>{stats.totalPlays}</Text>
            <Text style={styles.metricLabel}>Reproducciones</Text>
          </View>
          <View style={styles.metricCard}>
            <Clock color={colors.secondary} size={20} />
            <Text style={styles.metricNumber}>{stats.totalMinutes}m</Text>
            <Text style={styles.metricLabel}>Tiempo escuchado</Text>
          </View>
          <View style={styles.metricCard}>
            <Award color="#F59E0B" size={20} />
            <Text style={styles.metricNumber}>{favorites.length}</Text>
            <Text style={styles.metricLabel}>Favoritas</Text>
          </View>
        </View>

        {/* Top Tracks */}
        <Text style={styles.sectionTitle}>Canciones Más Reproducidas</Text>
        {stats.topTracks.length === 0 ? (
          <Text style={styles.emptyText}>Escucha tus canciones para generar tu ranking.</Text>
        ) : (
          stats.topTracks.map((t, i) => (
            <TouchableOpacity
              key={t.id}
              style={styles.rowItem}
              onPress={() => playbackService.playTrack(t, stats.topTracks, i)}
            >
              <Text style={styles.rankText}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {t.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {t.artistName || 'Artista desconocido'} • {t.playCount} reproducciones
                </Text>
              </View>
              <Play color={colors.primary} size={16} />
            </TouchableOpacity>
          ))
        )}

        {/* Top Artists */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Artistas Más Escuchados</Text>
        {stats.topArtists.length === 0 ? (
          <Text style={styles.emptyText}>Aún no hay suficientes reproducciones registradas.</Text>
        ) : (
          stats.topArtists.map(([name, count], i) => (
            <View key={name} style={styles.rowItem}>
              <Text style={styles.rankText}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{name}</Text>
                <Text style={styles.rowSub}>{count} reproducciones totales</Text>
              </View>
            </View>
          ))
        )}

        {/* Chronological History */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Historial Reciente</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyHistoryBox}>
            <History color={colors.textDisabled} size={36} />
            <Text style={styles.emptyText}>Tu historial de reproducción aparecerá aquí.</Text>
          </View>
        ) : (
          history.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.rowItem}
              onPress={() => playbackService.playTrack(entry.track)}
            >
              <Music color={colors.textSecondary} size={18} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {entry.track.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {entry.track.artistName || 'Desconocido'} •{' '}
                  {new Date(entry.playedAt).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  scroll: {
    padding: 18,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#141A28',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricNumber: {
    ...typography.h2,
    color: '#FFFFFF',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    width: 30,
  },
  rowTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  rowSub: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyText: {
    ...typography.caption,
    color: '#64748B',
    paddingVertical: 10,
  },
  emptyHistoryBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
});

