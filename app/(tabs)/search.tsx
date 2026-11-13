import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search as SearchIcon,
  X,
  Music,
  Play,
  Globe,
  Clock,
  Trash2,
  Download,
  Heart,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { Track } from '../../src/domain/entities/track';
import { TrackRepository } from '../../src/data/repositories/track-repository';
import { SearchHistoryDao } from '../../src/data/local/search-history-dao';
import { ProviderRegistry } from '../../src/integrations/providers/provider-registry';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { DownloadManager } from '../../src/data/remote/download-manager';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlayerStore } from '../../src/store/player-store';
import { toggleFavoritePersisted } from '../../src/core/utils/track-actions';

type ResultFilter = 'all' | 'local' | 'online';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ResultFilter>('all');
  const [localResults, setLocalResults] = useState<Track[]>([]);
  const [onlineResults, setOnlineResults] = useState<Track[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const libraryTracks = useLibraryStore((s) => s.tracks);
  const streamQuality = usePlayerStore((s) => s.streamQuality);

  const trackRepo = new TrackRepository();
  const historyDao = new SearchHistoryDao();
  const playbackService = PlaybackService.getInstance();
  const providers = ProviderRegistry.getInstance().getAllProviders();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const items = await historyDao.getRecentQueries(10);
      setHistory(items);
    } catch {}
  };

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setLocalResults([]);
      setOnlineResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const localPromise = trackRepo.searchTracks(trimmed);
        const onlinePromises = providers.map((p) => p.search(trimmed).catch(() => []));

        const [foundLocal, ...foundOnlineArrays] = await Promise.all([
          localPromise,
          ...onlinePromises,
        ]);

        const mergedOnline = foundOnlineArrays.flat();
        const dedupedOnline = Array.from(
          new Map(mergedOnline.map((t) => [t.id, t])).values()
        );

        setLocalResults(foundLocal);
        setOnlineResults(dedupedOnline);
      } catch (e) {
        console.error('Unified search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  // Live typing suggestions from history + library titles/artists
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const pool = new Set<string>();
    for (const h of history) {
      if (h.toLowerCase().includes(q) && h.toLowerCase() !== q) pool.add(h);
    }
    for (const t of libraryTracks) {
      if (t.title.toLowerCase().includes(q)) pool.add(t.title);
      if (t.artistName && t.artistName.toLowerCase().includes(q)) pool.add(t.artistName);
      if (pool.size >= 6) break;
    }
    return Array.from(pool).slice(0, 6);
  }, [query, history, libraryTracks]);

  const handleCommitSearch = async (text?: string) => {
    const finalText = (text ?? query).trim();
    if (!finalText) return;
    setQuery(finalText);
    await historyDao.saveQuery(finalText).catch(() => {});
    await loadHistory();
  };

  const handlePlayResult = async (track: Track, list: Track[], index: number) => {
    await handleCommitSearch();
    playbackService.playTrack(track, list, index);
  };

  const handleDeleteHistoryItem = async (item: string) => {
    await historyDao.deleteQuery(item).catch(() => {});
    await loadHistory();
  };

  const handleClearHistory = async () => {
    await historyDao.clearHistory().catch(() => {});
    setHistory([]);
  };

  const showLocal = filter === 'all' || filter === 'local';
  const showOnline = filter === 'all' || filter === 'online';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.screenTitle}>Buscar</Text>
          <TouchableOpacity
            style={styles.exploreShortcut}
            onPress={() => router.push('/explore' as any)}
          >
            <Globe color={colors.primary} size={15} />
            <Text style={styles.exploreShortcutText}>Catálogo Online</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <SearchIcon color={colors.textMuted} size={20} />
          <TextInput
            style={styles.input}
            placeholder="Canción, artista, archivo o música online..."
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleCommitSearch()}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions strip while typing */}
        {suggestions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsRow}
          >
            {suggestions.map((sug) => (
              <TouchableOpacity
                key={sug}
                style={styles.suggestionPill}
                onPress={() => handleCommitSearch(sug)}
              >
                <Text style={styles.suggestionText}>{sug}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Separated Source Filter */}
        {query.trim().length > 0 && (
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                Todos ({localResults.length + onlineResults.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filter === 'local' && styles.filterPillActive]}
              onPress={() => setFilter('local')}
            >
              <Text style={[styles.filterText, filter === 'local' && styles.filterTextActive]}>
                Local ({localResults.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, filter === 'online' && styles.filterPillActive]}
              onPress={() => setFilter('online')}
            >
              <Text style={[styles.filterText, filter === 'online' && styles.filterTextActive]}>
                Online ({onlineResults.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      {query.trim().length === 0 ? (
        <ScrollView contentContainerStyle={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Búsquedas recientes</Text>
            {history.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={handleClearHistory}>
                <Trash2 color={colors.error} size={14} />
                <Text style={styles.clearText}>Borrar historial</Text>
              </TouchableOpacity>
            )}
          </View>

          {history.length === 0 ? (
            <View style={styles.centeredEmpty}>
              <SearchIcon color={colors.textDisabled} size={44} />
              <Text style={styles.placeholderText}>
                Busca por nombre, artista, álbum, nombre de archivo o catálogo abierto online
              </Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item} style={styles.historyRow}>
                <TouchableOpacity
                  style={styles.historyTap}
                  onPress={() => handleCommitSearch(item)}
                >
                  <Clock color={colors.textMuted} size={16} />
                  <Text style={styles.historyItemText}>{item}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteHistoryItem(item)}>
                  <X color={colors.textMuted} size={16} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      ) : isLoading ? (
        <View style={styles.centeredEmpty}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.placeholderText}>Buscando en biblioteca local y online...</Text>
        </View>
      ) : localResults.length === 0 && onlineResults.length === 0 ? (
        <View style={styles.centeredEmpty}>
          <Text style={styles.noResultsText}>
            No se encontraron resultados locales ni online para "{query}"
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.resultsList}>
          {showLocal && localResults.length > 0 && (
            <View style={styles.groupBlock}>
              <Text style={styles.groupLabel}>MÚSICA LOCAL ({localResults.length})</Text>
              {localResults.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handlePlayResult(item, localResults, index)}
                  activeOpacity={0.75}
                >
                  <View style={styles.trackIcon}>
                    {item.artworkUri ? (
                      <Image source={{ uri: item.artworkUri }} style={styles.thumbImg} />
                    ) : (
                      <Music color={colors.primary} size={18} />
                    )}
                  </View>
                  <View style={styles.trackDetails}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {item.artistName || 'Artista desconocido'} • Local
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inlineBtn}
                    onPress={() => toggleFavoritePersisted(item)}
                  >
                    <Heart
                      color={item.isFavorite ? colors.error : colors.textMuted}
                      size={18}
                      fill={item.isFavorite ? colors.error : 'transparent'}
                    />
                  </TouchableOpacity>
                  <Play color={colors.textMuted} size={18} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showOnline && onlineResults.length > 0 && (
            <View style={styles.groupBlock}>
              <Text style={styles.groupLabel}>
                MÚSICA ONLINE CREATIVE COMMONS ({onlineResults.length})
              </Text>
              {onlineResults.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.resultItem}
                  onPress={() => handlePlayResult(item, onlineResults, index)}
                  activeOpacity={0.75}
                >
                  <View style={styles.trackIcon}>
                    {item.artworkUri ? (
                      <Image source={{ uri: item.artworkUri }} style={styles.thumbImg} />
                    ) : (
                      <Globe color={colors.secondary} size={18} />
                    )}
                  </View>
                  <View style={styles.trackDetails}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.trackArtist} numberOfLines={1}>
                      {item.artistName || 'Creative Commons'} • Streaming Online
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.inlineBtn}
                    onPress={async () => {
                      try {
                        Alert.alert('Descargando', `Guardando "${item.title}" para modo offline.`);
                        await DownloadManager.startDownload(item, streamQuality);
                      } catch (err: any) {
                        Alert.alert('Error', err?.message || 'No se pudo descargar.');
                      }
                    }}
                  >
                    <Download color={colors.primary} size={18} />
                  </TouchableOpacity>
                  <Play color={colors.textMuted} size={18} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  exploreShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#161C2C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  exploreShortcutText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141A28',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  suggestionsRow: {
    gap: 8,
    paddingTop: 10,
  },
  suggestionPill: {
    backgroundColor: '#182032',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  suggestionText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#141A28',
  },
  filterPillActive: {
    backgroundColor: '#2D3A56',
  },
  filterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  historyContainer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 30,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A5B4FC',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyItemText: {
    ...typography.body,
    color: '#F8FAFC',
  },
  resultsList: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 30,
  },
  groupBlock: {
    marginBottom: 20,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A5B4FC',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  trackIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#161C2C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
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
  inlineBtn: {
    padding: 8,
  },
  centeredEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
  },
  noResultsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
