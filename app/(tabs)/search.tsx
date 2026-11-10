import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon, X, Music, Play } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { Track } from '../../src/domain/entities/track';
import { TrackRepository } from '../../src/data/repositories/track-repository';
import { PlaybackService } from '../../src/playback/service/playback-service';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const trackRepo = new TrackRepository();
  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found = await trackRepo.searchTracks(trimmed);
        setResults(found);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Buscar</Text>
        <View style={styles.searchBar}>
          <SearchIcon color={colors.textMuted} size={20} />
          <TextInput
            style={styles.input}
            placeholder="Canción, artista o álbum..."
            placeholderTextColor={colors.textDisabled}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : query.length === 0 ? (
        <View style={styles.centered}>
          <SearchIcon color={colors.textDisabled} size={48} />
          <Text style={styles.placeholderText}>Escribe para buscar en tu biblioteca local</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noResultsText}>No se encontraron canciones para "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => playbackService.playTrack(item, results, index)}
              activeOpacity={0.7}
            >
              <View style={styles.trackIcon}>
                <Music color={colors.primary} size={18} />
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
          )}
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  trackIcon: {
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
  trackArtist: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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

