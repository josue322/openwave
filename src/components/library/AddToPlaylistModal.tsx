import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, ListMusic, Plus } from 'lucide-react-native';
import { Track } from '../../domain/entities/track';
import { usePlaylistStore } from '../../store/playlist-store';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface Props {
  track: Track | null;
  visible: boolean;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<Props> = ({ track, visible, onClose }) => {
  const router = useRouter();
  const playlists = usePlaylistStore((s) => s.playlists);
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist);

  useEffect(() => {
    if (visible) {
      loadPlaylists().catch(() => {});
    }
  }, [visible]);

  const handleSelect = async (playlistId: string, playlistName: string) => {
    if (!track) return;
    await addTrackToPlaylist(playlistId, track.id);
    onClose();
    Alert.alert('Lista actualizada', `Se añadió "${track.title}" a "${playlistName}".`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Añadir a Playlist</Text>
            <TouchableOpacity onPress={onClose}>
              <X color={colors.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => {
              onClose();
              router.push('/playlist/create' as any);
            }}
          >
            <Plus color="#0A0D14" size={18} />
            <Text style={styles.createText}>Crear nueva playlist</Text>
          </TouchableOpacity>

          {playlists.length === 0 ? (
            <Text style={styles.emptyText}>No tienes listas creadas aún.</Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.plRow}
                  onPress={() => handleSelect(item.id, item.name)}
                >
                  <ListMusic color={colors.primary} size={20} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.plCount}>{item.trackCount || 0} canciones</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
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
    padding: 22,
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
  title: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 14,
  },
  createText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  plRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  plName: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  plCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

