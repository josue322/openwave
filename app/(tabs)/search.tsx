import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search as SearchIcon, X, Music, Play } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlayerStore } from '../../src/store/player-store';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const tracks = useLibraryStore((s) => s.tracks);
  const setQueue = usePlayerStore((s) => s.setQueue);

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artistName && t.artistName.toLowerCase().includes(q)) ||
        (t.albumTitle && t.albumTitle.toLowerCase().includes(q))
    );
  }, [query, tracks]);

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

      {/* Results */}
      {query.length === 0 ? (
        <View style={styles.centered}>
          <SearchIcon color={colors.textDisabled} size={48} />
          <Text style={styles.placeholderText}>Escribe para buscar en tu música local</Text>
        </View>
      ) : filteredTracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.noResultsText}>No se encontraron resultados para "{query}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTracks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => setQueue(filteredTracks, index)}
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

