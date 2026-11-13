import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Track } from '../../domain/entities/track';
import { TrackRepository } from '../../data/repositories/track-repository';
import { useLibraryStore } from '../../store/library-store';
import { usePlayerStore } from '../../store/player-store';
import { PlaybackService } from '../../playback/service/playback-service';
import { OpenWaveNativeBridge } from '../../playback/native/openwave-native-bridge';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface Props {
  track: Track | null;
  visible: boolean;
  onClose: () => void;
}

const trackRepo = new TrackRepository();

export const TrackMetadataModal: React.FC<Props> = ({ track, visible, onClose }) => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (track) {
      setTitle(track.title || '');
      setArtist(track.artistName || '');
      setAlbum(track.albumTitle || '');
      setGenre(track.genre || '');
    }
  }, [track]);

  const handleSave = async () => {
    if (!track || !title.trim()) {
      Alert.alert('Título requerido', 'La canción debe tener un nombre.');
      return;
    }

    setSaving(true);
    try {
      const patch = {
        title: title.trim(),
        artistName: artist.trim() || null,
        albumTitle: album.trim() || null,
        genre: genre.trim() || null,
      };
      await trackRepo.updateMetadata(track.id, patch);
      useLibraryStore.getState().updateTrack(track.id, patch);
      usePlayerStore.getState().updateTrackInQueue(track.id, patch);

      if (OpenWaveNativeBridge.isNativeAvailable() && track.sourceType === 'local') {
        await OpenWaveNativeBridge.writeId3Tags(track.uri, {
          title: patch.title,
          artist: patch.artistName ?? undefined,
          album: patch.albumTitle ?? undefined,
          genre: patch.genre ?? undefined,
          artworkUri: track.artworkUri,
        });
      }

      const updatedActive = usePlayerStore.getState().currentTrack;
      if (updatedActive && updatedActive.id === track.id) {
        PlaybackService.getInstance().updateActiveTrackMetadata(updatedActive);
      }

      onClose();
    } catch (err: any) {
      Alert.alert('Error al guardar', err?.message || 'No se pudieron guardar los metadatos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Editar Metadatos</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Nombre de la canción</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Título"
            placeholderTextColor={colors.textDisabled}
          />

          <Text style={styles.label}>Artista</Text>
          <TextInput
            style={styles.input}
            value={artist}
            onChangeText={setArtist}
            placeholder="Nombre del artista"
            placeholderTextColor={colors.textDisabled}
          />

          <Text style={styles.label}>Álbum</Text>
          <TextInput
            style={styles.input}
            value={album}
            onChangeText={setAlbum}
            placeholder="Nombre del álbum"
            placeholderTextColor={colors.textDisabled}
          />

          <Text style={styles.label}>Género musical</Text>
          <TextInput
            style={styles.input}
            value={genre}
            onChangeText={setGenre}
            placeholder="Ej: Rock, Pop, Lo-Fi..."
            placeholderTextColor={colors.textDisabled}
          />

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Check color="#0A0D14" size={18} />
            <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#141A28',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0C101B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
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
    marginTop: 6,
  },
  saveText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
});

