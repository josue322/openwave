import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ChevronDown, ArrowDownToLine, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet, FileJson } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useLibraryStore } from '../../src/store/library-store';
import { usePlaylistStore } from '../../src/store/playlist-store';
import { StringMatcher, MatchClassification } from '../../src/core/utils/string-matcher';
import { SpotifyJsonParser, ImportedTrackMetadata } from '../../src/integrations/spotify/spotify-json-parser';
import { TakeoutCsvParser } from '../../src/integrations/youtube/takeout-csv-parser';
import { Track } from '../../src/domain/entities/track';

interface MatchItem {
  external: ImportedTrackMetadata;
  local?: Track;
  classification: MatchClassification;
}

export default function ImporterScreen() {
  const router = useRouter();
  const localTracks = useLibraryStore((s) => s.tracks);
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist);

  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchItem[]>([]);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  const handlePickFile = async (type: 'json' | 'csv') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: type === 'json' ? 'application/json' : ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setImportedFileName(file.name);
      setIsProcessing(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      let items: ImportedTrackMetadata[] = [];

      if (type === 'json') {
        items = SpotifyJsonParser.parse(content);
      } else {
        items = TakeoutCsvParser.parseCsv(content);
      }

      if (items.length === 0) {
        Alert.alert('Archivo vacío o incompatible', 'No se pudieron extraer canciones válidas del archivo seleccionado.');
        setIsProcessing(false);
        return;
      }

      // Run matching engine
      const matches: MatchItem[] = [];
      for (const ext of items) {
        let bestLocal: Track | undefined = undefined;
        let bestClassification: MatchClassification = 'NOT_FOUND';
        let highestScore = 0;

        for (const loc of localTracks) {
          const comp = StringMatcher.compareTracks(
            ext.title,
            ext.artist,
            ext.durationMs,
            loc.title,
            loc.artistName,
            loc.duration
          );

          if (comp.score > highestScore) {
            highestScore = comp.score;
            bestClassification = comp.classification;
            bestLocal = loc;
          }
        }

        matches.push({
          external: ext,
          local: highestScore >= 0.50 ? bestLocal : undefined,
          classification: bestClassification,
        });
      }

      setMatchResults(matches);
    } catch (err: any) {
      Alert.alert('Error al leer el archivo', err?.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAsPlaylist = async () => {
    const matchedTracks = matchResults
      .filter((m) => m.local && (m.classification === 'EXACT' || m.classification === 'PROBABLE'))
      .map((m) => m.local!);

    if (matchedTracks.length === 0) {
      Alert.alert('Sin coincidencias', 'No hay canciones con coincidencias exactas o probables para guardar.');
      return;
    }

    const playlistName = `Importada - ${importedFileName || 'Lista'}`;
    const newPl = await createPlaylist(playlistName, `Importada con ${matchedTracks.length} canciones locales emparejadas.`);

    for (const track of matchedTracks) {
      await addTrackToPlaylist(newPl.id, track.id);
    }

    Alert.alert(
      '¡Lista creada con éxito!',
      `Se creó la playlist "${playlistName}" con ${matchedTracks.length} canciones vinculadas.`,
      [{ text: 'Ver Lista', onPress: () => router.push(`/playlist/${newPl.id}` as any) }]
    );
  };

  const exactCount = matchResults.filter((m) => m.classification === 'EXACT').length;
  const probableCount = matchResults.filter((m) => m.classification === 'PROBABLE').length;
  const notFoundCount = matchResults.filter((m) => m.classification === 'NOT_FOUND' || m.classification === 'PARTIAL').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Importar Biblioteca</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Intro */}
        <Text style={styles.subtitle}>
          Migra tus playlists desde Spotify o Google Takeout (YouTube Music). OpenWave emparejará automáticamente cada pista con los archivos de audio en tu dispositivo Android.
        </Text>

        {/* Source Pickers */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => handlePickFile('json')}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <FileJson color={colors.primary} size={24} />
            <View style={styles.pickerButtonTextContainer}>
              <Text style={styles.pickerTitle}>Spotify (JSON)</Text>
              <Text style={styles.pickerDesc}>Historial o exportación oficial de datos</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => handlePickFile('csv')}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <FileSpreadsheet color={colors.secondary} size={24} />
            <View style={styles.pickerButtonTextContainer}>
              <Text style={styles.pickerTitle}>YouTube Music (Takeout CSV)</Text>
              <Text style={styles.pickerDesc}>Exportación de playlists desde Google Takeout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Analizando coincidencias con tu música local...</Text>
          </View>
        )}

        {/* Matching Summary */}
        {matchResults.length > 0 && !isProcessing && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsCardTitle}>Resultados del Análisis</Text>
            <Text style={styles.resultsFile}>Archivo: {importedFileName}</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <CheckCircle2 color={colors.success} size={20} />
                <Text style={styles.statNum}>{exactCount}</Text>
                <Text style={styles.statLabel}>Exactas</Text>
              </View>

              <View style={styles.statBox}>
                <AlertTriangle color={colors.warning} size={20} />
                <Text style={styles.statNum}>{probableCount}</Text>
                <Text style={styles.statLabel}>Probables</Text>
              </View>

              <View style={styles.statBox}>
                <XCircle color={colors.error} size={20} />
                <Text style={styles.statNum}>{notFoundCount}</Text>
                <Text style={styles.statLabel}>Sin copia local</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveAsPlaylist} activeOpacity={0.8}>
              <ArrowDownToLine color="#0A0D14" size={20} />
              <Text style={styles.saveButtonText}>Guardar como Playlist Local ({exactCount + probableCount})</Text>
            </TouchableOpacity>
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
  topBar: {
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
  scrollContent: {
    padding: 20,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  pickerButtonTextContainer: {
    flex: 1,
  },
  pickerTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  pickerDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 12,
  },
  resultsCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  resultsCardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  resultsFile: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNum: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: 6,
  },
  statLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
});
