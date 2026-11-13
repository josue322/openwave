import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Cast, Wifi, X, Radio } from 'lucide-react-native';
import {
  CastStatus,
  OpenWaveNativeBridge,
} from '../../playback/native/openwave-native-bridge';
import { usePlayerStore } from '../../store/player-store';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface CastButtonProps {
  size?: number;
  color?: string;
  buttonStyle?: any;
}

export const CastButton: React.FC<CastButtonProps> = ({
  size = 19,
  color = colors.textPrimary,
  buttonStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [castState, setCastState] = useState<CastStatus>({
    available: false,
    connected: false,
    state: 'unknown',
    deviceName: null,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const nativeActive = OpenWaveNativeBridge.isNativeAvailable();

  const refreshState = async () => {
    const state = await OpenWaveNativeBridge.getCastState();
    setCastState(state);
    return state;
  };

  useEffect(() => {
    refreshState().catch(() => {});
    const unsub = OpenWaveNativeBridge.subscribeEvent<CastStatus>(
      'onCastStateChanged',
      (evt) => {
        if (evt) setCastState(evt);
      }
    );
    return unsub;
  }, []);

  const handleOpen = async () => {
    setStatusMessage(null);
    await refreshState();
    setModalVisible(true);
  };

  const handlePickDevice = async () => {
    if (!nativeActive) {
      setStatusMessage(
        'Chromecast nativo requiere el Development Build o APK compilado con Google Cast SDK.'
      );
      return;
    }
    const opened = await OpenWaveNativeBridge.openCastPicker();
    if (!opened) {
      setStatusMessage(
        'No se detectaron dispositivos Chromecast o Servicios de Google Play Cast no está disponible.'
      );
    }
  };

  const handleCastCurrent = async () => {
    if (!currentTrack) {
      setStatusMessage('Reproduce o selecciona primero una canción para transmitir.');
      return;
    }
    const result = await OpenWaveNativeBridge.castTrack({
      uri: currentTrack.uri,
      title: currentTrack.title,
      artist: currentTrack.artistName || 'Artista desconocido',
      album: currentTrack.albumTitle || 'OPENWAVE',
      artworkUri: currentTrack.artworkUri,
      positionMs,
    });
    if (result.needsDevicePicker) {
      await OpenWaveNativeBridge.openCastPicker();
    }
    setStatusMessage(
      result.message ||
        (result.started ? 'Transmisión iniciada.' : 'No se pudo iniciar la transmisión.')
    );
    await refreshState();
  };

  const handleDisconnect = async () => {
    await OpenWaveNativeBridge.stopCast();
    setStatusMessage('Sesión Chromecast desconectada.');
    await refreshState();
  };

  return (
    <>
      <TouchableOpacity
        style={buttonStyle}
        onPress={handleOpen}
        activeOpacity={0.8}
        accessibilityLabel="Transmitir a Chromecast"
      >
        <Cast color={castState.connected ? colors.primary : color} size={size} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Cast color={colors.primary} size={20} />
                <Text style={styles.title}>Transmitir (Chromecast)</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.statusBox}>
              <Wifi
                color={castState.connected ? colors.primary : colors.textSecondary}
                size={18}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {castState.connected
                    ? `Conectado a ${castState.deviceName || 'Chromecast'}`
                    : nativeActive
                      ? 'Listo para detectar dispositivos en Wi‑Fi'
                      : 'Modo Expo Go (Módulo nativo Cast en APK/Dev Build)'}
                </Text>
                <Text style={styles.statusSub}>
                  {currentTrack
                    ? `Pista actual: ${currentTrack.title}`
                    : 'Sin canción seleccionada en este momento'}
                </Text>
              </View>
            </View>

            {statusMessage && <Text style={styles.feedbackText}>{statusMessage}</Text>}

            <TouchableOpacity style={styles.primaryBtn} onPress={handlePickDevice}>
              <Radio color="#0A0E17" size={16} />
              <Text style={styles.primaryBtnText}>Buscar dispositivos en Wi‑Fi</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCastCurrent}>
              <Text style={styles.secondaryBtnText}>Transmitir pista actual</Text>
            </TouchableOpacity>

            {castState.connected && (
              <TouchableOpacity style={styles.dangerBtn} onPress={handleDisconnect}>
                <Text style={styles.dangerBtnText}>Desconectar Chromecast</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </>
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
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    marginBottom: 14,
  },
  statusTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  statusSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedbackText: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: 12,
    lineHeight: 18,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  primaryBtnText: {
    ...typography.body,
    color: '#0A0E17',
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  secondaryBtnText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  dangerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dangerBtnText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
  },
});

