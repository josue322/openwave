import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { X, FileText, FolderPlus, Pencil, Check } from 'lucide-react-native';
import { Track } from '../../domain/entities/track';
import { parseLrc, getActiveLyricIndex } from '../../core/utils/lrc-parser';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';
import { PlaybackService } from '../../playback/service/playback-service';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface Props {
  track: Track;
  positionMs: number;
  visible: boolean;
  onClose: () => void;
}

const trackDao = new TrackDao();

export const LyricsModal: React.FC<Props> = ({ track, positionMs, visible, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(track.lyricsLrc || '');

  useEffect(() => {
    setDraftText(track.lyricsLrc || '');
    setIsEditing(false);
  }, [track.id, track.lyricsLrc, visible]);

  const parsedLines = useMemo(() => parseLrc(track.lyricsLrc || ''), [track.lyricsLrc]);
  const activeIdx = useMemo(
    () => getActiveLyricIndex(parsedLines, positionMs),
    [parsedLines, positionMs]
  );

  const saveLyricsText = async (text: string) => {
    const cleaned = text.trim() || null;
    await trackDao.updateLyrics(track.id, cleaned);
    useLibraryStore.getState().updateTrack(track.id, { lyricsLrc: cleaned });
    usePlayerStore.getState().updateTrackInQueue(track.id, { lyricsLrc: cleaned });
    setIsEditing(false);
  };

  const handleImportLrcFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/octet-stream', '*/*'],
        copyToCacheDirectory: false,
      });
      if (res.canceled || !res.assets || res.assets.length === 0) return;
      const uri = res.assets[0].uri;

      let content = '';
      try {
        content = await FileSystem.readAsStringAsync(uri);
      } catch {
        const resp = await fetch(uri);
        content = await resp.text();
      }

      if (!content.trim()) {
        Alert.alert('Archivo vacío', 'El archivo seleccionado no contiene letras.');
        return;
      }

      await saveLyricsText(content);
      Alert.alert('¡Letras cargadas!', 'Las letras se guardaron para esta canción.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo leer el archivo .lrc/.txt.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                Letras — {track.title}
              </Text>
              <Text style={styles.subtitle}>
                Toca una línea sincronizada (.lrc) para saltar a ese momento
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.toolBtn} onPress={handleImportLrcFile}>
              <FolderPlus color={colors.primary} size={15} />
              <Text style={styles.toolBtnText}>Importar .LRC</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtn}
              onPress={() => setIsEditing((e) => !e)}
            >
              <Pencil color={colors.secondary} size={15} />
              <Text style={styles.toolBtnText}>{isEditing ? 'Ver letra' : 'Editar texto'}</Text>
            </TouchableOpacity>
          </View>

          {isEditing ? (
            <View style={styles.editorContainer}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Pega aquí la letra o formato [00:15.20] Línea sincronizada..."
                placeholderTextColor={colors.textDisabled}
                value={draftText}
                onChangeText={setDraftText}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => saveLyricsText(draftText)}
              >
                <Check color="#0A0D14" size={18} />
                <Text style={styles.saveBtnText}>Guardar letras</Text>
              </TouchableOpacity>
            </View>
          ) : parsedLines.length === 0 ? (
            <View style={styles.emptyBox}>
              <FileText color={colors.textDisabled} size={42} />
              <Text style={styles.emptyTitle}>Sin letras guardadas</Text>
              <Text style={styles.emptySub}>
                Usa "Importar .LRC" o "Editar texto" para agregar letras sincronizadas a esta canción.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.lyricsScroll} showsVerticalScrollIndicator={false}>
              {parsedLines.map((line, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <TouchableOpacity
                    key={`${idx}_${line.timeMs ?? 'plain'}`}
                    disabled={line.timeMs === null}
                    onPress={() => {
                      if (line.timeMs !== null) {
                        PlaybackService.getInstance().seekTo(line.timeMs);
                      }
                    }}
                    style={[styles.lineRow, isActive && styles.lineRowActive]}
                  >
                    <Text style={[styles.lyricText, isActive && styles.lyricTextActive]}>
                      {line.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#121826',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    height: '78%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A2234',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  toolBtnText: {
    fontSize: 12,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  editorContainer: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#0A0E18',
    borderRadius: 14,
    padding: 14,
    color: '#FFFFFF',
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  saveBtnText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...typography.bodyBold,
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySub: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
  },
  lyricsScroll: {
    flex: 1,
  },
  lineRow: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  lineRowActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  lyricText: {
    fontSize: 16,
    color: '#94A3B8',
    lineHeight: 24,
    textAlign: 'center',
  },
  lyricTextActive: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
});

