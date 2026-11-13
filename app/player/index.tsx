import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  ScrollView,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Sliders,
  ListMusic,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Play,
  Pause,
  Music,
  Camera,
  Image as ImageIcon,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Moon,
  Info,
  Share2,
  X,
  FileText,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { usePlayerStore } from '../../src/store/player-store';
import { PlaybackService } from '../../src/playback/service/playback-service';
import { ArtworkManager } from '../../src/core/utils/artwork-manager';
import { LyricsModal } from '../../src/components/player/LyricsModal';
import { CastButton } from '../../src/components/player/CastButton';
import {
  toggleFavoritePersisted,
  shareTrack,
  formatFileSize,
} from '../../src/core/utils/track-actions';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export default function FullPlayerScreen() {
  const router = useRouter();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const volume = usePlayerStore((s) => s.volume);
  const playbackSpeed = usePlayerStore((s) => s.playbackSpeed);
  const sleepTimerEndTime = usePlayerStore((s) => s.sleepTimerEndTime);
  const sleepAfterCurrentTrack = usePlayerStore((s) => s.sleepAfterCurrentTrack);

  const [seekBarWidth, setSeekBarWidth] = useState(300);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubMs, setScrubMs] = useState(0);

  const [showVolumeDrawer, setShowVolumeDrawer] = useState(false);
  const [volBarWidth, setVolBarWidth] = useState(240);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [remainingMinutes, setRemainingMinutes] = useState<number | null>(null);

  const playbackService = PlaybackService.getInstance();

  const durationRef = useRef(durationMs);
  durationRef.current = durationMs;
  const seekWidthRef = useRef(seekBarWidth);
  seekWidthRef.current = seekBarWidth;
  const scrubMsRef = useRef(scrubMs);
  scrubMsRef.current = scrubMs;

  useEffect(() => {
    if (!sleepTimerEndTime) {
      setRemainingMinutes(null);
      return;
    }
    const updateRemaining = () => {
      const diffMs = sleepTimerEndTime - Date.now();
      setRemainingMinutes(diffMs > 0 ? Math.ceil(diffMs / 60000) : 0);
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 10000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  const seekPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const total = durationRef.current;
          const width = Math.max(1, seekWidthRef.current);
          if (total <= 0) return;
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / width));
          const target = ratio * total;
          setIsScrubbing(true);
          setScrubMs(target);
          scrubMsRef.current = target;
        },
        onPanResponderMove: (evt) => {
          const total = durationRef.current;
          const width = Math.max(1, seekWidthRef.current);
          if (total <= 0) return;
          const ratio = Math.max(0, Math.min(1, evt.nativeEvent.locationX / width));
          const target = ratio * total;
          setScrubMs(target);
          scrubMsRef.current = target;
        },
        onPanResponderRelease: () => {
          if (durationRef.current > 0) {
            playbackService.seekTo(scrubMsRef.current);
          }
          setIsScrubbing(false);
        },
        onPanResponderTerminate: () => {
          setIsScrubbing(false);
        },
      }),
    []
  );

  const handleCycleSpeed = () => {
    const idx = SPEED_OPTIONS.findIndex((s) => Math.abs(s - playbackSpeed) < 0.05);
    const nextSpeed = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    playbackService.setPlaybackSpeed(nextSpeed);
  };

  const handlePickArtwork = async () => {
    if (!currentTrack) return;
    try {
      const newUri = await ArtworkManager.pickAndSaveArtwork(currentTrack.id);
      if (newUri) {
        Alert.alert(
          '¡Portada guardada!',
          'Se ha asignado la nueva imagen de fondo y perfil para esta canción.'
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo seleccionar la imagen.');
    }
  };

  if (!currentTrack) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color="#FFFFFF" size={26} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Music color={colors.textDisabled} size={64} />
          <Text style={styles.emptyText}>No hay ninguna pista en reproducción</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayedPosMs = isScrubbing ? scrubMs : positionMs;
  const progress = durationMs > 0 ? Math.min(1, displayedPosMs / durationMs) : 0;
  const isSleepActive = Boolean(sleepTimerEndTime || sleepAfterCurrentTrack);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Dynamic Ambient Background Glow / Blurred Cover Artwork */}
      {currentTrack.artworkUri ? (
        <Image
          source={{ uri: currentTrack.artworkUri }}
          style={styles.ambientBackgroundImage}
          blurRadius={35}
        />
      ) : (
        <View style={styles.ambientGlow} />
      )}

      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTrackName} numberOfLines={1}>
          {currentTrack.albumTitle || currentTrack.title}
        </Text>
        <TouchableOpacity
          onPress={() => setShowInfoModal(true)}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <Info color="#FFFFFF" size={22} />
        </TouchableOpacity>
      </View>

      {/* Hero Circular Artwork Vignette */}
      <View style={styles.artworkSection}>
        <TouchableOpacity
          style={styles.circularArtworkFrame}
          onPress={handlePickArtwork}
          activeOpacity={0.88}
        >
          {currentTrack.artworkUri ? (
            <Image source={{ uri: currentTrack.artworkUri }} style={styles.circularArtwork} />
          ) : (
            <View style={styles.placeholderCircular}>
              <Music color="#38BDF8" size={72} />
              <View style={styles.addPhotoPill}>
                <Camera color="#FFFFFF" size={14} />
                <Text style={styles.addPhotoText}>Elegir fondo / portada</Text>
              </View>
            </View>
          )}

          <View style={styles.editBadge}>
            <Camera color="#FFFFFF" size={13} />
          </View>
        </TouchableOpacity>

        {/* Track Title, Artist & Album */}
        <Text style={styles.trackTitle} numberOfLines={1}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.artistName || 'Artista desconocido'}
          {currentTrack.albumTitle ? ` • ${currentTrack.albumTitle}` : ''}
        </Text>

        {/* Action Pills Row (Heart, Equalizer, Queue, Sleep Timer, Share, Cover) */}
        <View style={styles.actionPillRow}>
          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => toggleFavoritePersisted(currentTrack)}
            activeOpacity={0.8}
          >
            <Heart
              color={currentTrack.isFavorite ? colors.error : '#E2E8F0'}
              size={20}
              fill={currentTrack.isFavorite ? colors.error : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => router.push('/equalizer' as any)}
            activeOpacity={0.8}
          >
            <Sliders color="#E2E8F0" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => router.push('/player/queue' as any)}
            activeOpacity={0.8}
          >
            <ListMusic color="#E2E8F0" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => setShowLyricsModal(true)}
            activeOpacity={0.8}
          >
            <FileText
              color={currentTrack.lyricsLrc ? colors.secondary : '#E2E8F0'}
              size={19}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => setShowSleepModal(true)}
            activeOpacity={0.8}
          >
            <Moon color={isSleepActive ? colors.primary : '#E2E8F0'} size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={() => shareTrack(currentTrack)}
            activeOpacity={0.8}
          >
            <Share2 color="#E2E8F0" size={19} />
          </TouchableOpacity>

          <CastButton
            size={19}
            color="#E2E8F0"
            buttonStyle={styles.actionPillButton}
          />

          <TouchableOpacity
            style={styles.actionPillButton}
            onPress={handlePickArtwork}
            activeOpacity={0.8}
          >
            <ImageIcon color="#38BDF8" size={20} />
          </TouchableOpacity>
        </View>

        {isSleepActive && (
          <TouchableOpacity
            style={styles.sleepBadge}
            onPress={() => setShowSleepModal(true)}
          >
            <Moon color={colors.primary} size={12} />
            <Text style={styles.sleepBadgeText}>
              {sleepAfterCurrentTrack
                ? 'Se pausará al terminar esta canción'
                : `Apagado automático en ${remainingMinutes ?? 0} min`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Glassmorphic Player Controls Card */}
      <View style={styles.glassmorphicCard}>
        {/* Scrubbable Progress Bar */}
        <View
          style={styles.seekHitArea}
          onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
          {...seekPanResponder.panHandlers}
        >
          <View style={styles.seekTrack}>
            <View style={[styles.seekFill, { width: `${progress * 100}%` }]}>
              <View style={[styles.seekThumb, isScrubbing && styles.seekThumbActive]} />
            </View>
          </View>
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(displayedPosMs)}</Text>
          <Text style={styles.timeText}>{formatTime(durationMs)}</Text>
        </View>

        {/* Main Media Controls Row: [Prev] [-10] [Big Play] [+10] [Next] */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={() => playbackService.skipPrevious()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SkipBack color="#FFFFFF" size={26} fill="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => playbackService.seekRelative(-10000)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RotateCcw color="#FFFFFF" size={18} />
            <Text style={styles.secondsLabel}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bigPlayButton}
            onPress={() => playbackService.togglePlayPause()}
            activeOpacity={0.85}
          >
            {isPlaying ? (
              <Pause color="#0A0D15" size={30} fill="#0A0D15" />
            ) : (
              <Play color="#0A0D15" size={30} fill="#0A0D15" style={{ marginLeft: 3 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => playbackService.seekRelative(10000)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <RotateCw color="#FFFFFF" size={18} />
            <Text style={styles.secondsLabel}>10</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => playbackService.skipNext()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <SkipForward color="#FFFFFF" size={26} fill="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Secondary Controls Row: Shuffle, Speed, Volume, Repeat */}
        <View style={styles.extraControlsRow}>
          <TouchableOpacity
            style={[styles.extraChip, shuffle && styles.extraChipActive]}
            onPress={() => playbackService.toggleShuffle()}
          >
            <Shuffle color={shuffle ? colors.primary : '#94A3B8'} size={17} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.speedPill} onPress={handleCycleSpeed}>
            <Text style={[styles.speedText, playbackSpeed !== 1.0 && { color: colors.primary }]}>
              {playbackSpeed.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1')}x
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.extraChip, showVolumeDrawer && styles.extraChipActive]}
            onPress={() => setShowVolumeDrawer((v) => !v)}
          >
            {volume === 0 ? (
              <VolumeX color={colors.error} size={18} />
            ) : (
              <Volume2 color={showVolumeDrawer ? colors.primary : '#94A3B8'} size={18} />
            )}
            <Text style={styles.volPercentText}>{Math.round(volume * 100)}%</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.extraChip, repeatMode !== 'off' && styles.extraChipActive]}
            onPress={() => playbackService.cycleRepeatMode()}
          >
            {repeatMode === 'one' ? (
              <Repeat1 color={colors.primary} size={18} />
            ) : (
              <Repeat color={repeatMode === 'all' ? colors.primary : '#94A3B8'} size={18} />
            )}
          </TouchableOpacity>
        </View>

        {/* Expandable Volume Bar */}
        {showVolumeDrawer && (
          <View style={styles.volumeDrawer}>
            <TouchableOpacity
              onPress={() => playbackService.setVolume(volume === 0 ? 1.0 : 0)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {volume === 0 ? (
                <VolumeX color={colors.error} size={18} />
              ) : (
                <Volume2 color="#E2E8F0" size={18} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.volTrackHitArea}
              onLayout={(e) => setVolBarWidth(e.nativeEvent.layout.width)}
              onPress={(e) => {
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / Math.max(1, volBarWidth)));
                playbackService.setVolume(ratio);
              }}
            >
              <View style={styles.volTrack}>
                <View style={[styles.volFill, { width: `${volume * 100}%` }]} />
              </View>
            </TouchableOpacity>
            <Text style={styles.volValueLabel}>{Math.round(volume * 100)}%</Text>
          </View>
        )}
      </View>

      {/* Sleep Timer Modal */}
      <Modal
        visible={showSleepModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSleepModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Temporizador de Apagado</Text>
              <TouchableOpacity onPress={() => setShowSleepModal(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Detener la reproducción automáticamente después de:
            </Text>

            {[15, 30, 45, 60].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={styles.modalOption}
                onPress={() => {
                  playbackService.startSleepTimer(mins);
                  setShowSleepModal(false);
                }}
              >
                <Moon color={colors.primary} size={18} />
                <Text style={styles.modalOptionText}>{mins} minutos</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                playbackService.startSleepTimer('end_of_track');
                setShowSleepModal(false);
              }}
            >
              <Music color={colors.secondary} size={18} />
              <Text style={styles.modalOptionText}>Al finalizar la canción actual</Text>
            </TouchableOpacity>

            {isSleepActive && (
              <TouchableOpacity
                style={[styles.modalOption, styles.modalDangerOption]}
                onPress={() => {
                  playbackService.cancelSleepTimer();
                  setShowSleepModal(false);
                }}
              >
                <Text style={styles.modalDangerText}>Desactivar temporizador</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Track Info / Technical Details Modal */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Información de la Pista</Text>
              <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              <DetailRow label="Título" value={currentTrack.title} />
              <DetailRow label="Artista" value={currentTrack.artistName || 'Desconocido'} />
              <DetailRow label="Álbum" value={currentTrack.albumTitle || 'Sin álbum'} />
              <DetailRow label="Género" value={currentTrack.genre || 'No especificado'} />
              <DetailRow
                label="Origen"
                value={currentTrack.sourceType === 'stream' ? 'Online (Streaming)' : 'Local (Dispositivo)'}
              />
              <DetailRow label="Duración" value={formatTime(durationMs || currentTrack.duration)} />
              <DetailRow label="Tamaño" value={formatFileSize(currentTrack.fileSize)} />
              <DetailRow label="Formato" value={currentTrack.mimeType || 'Desconocido'} />
              <DetailRow
                label="Bitrate"
                value={currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : 'N/D'}
              />
              <DetailRow
                label="Frecuencia"
                value={currentTrack.sampleRate ? `${currentTrack.sampleRate} Hz` : 'N/D'}
              />
              <DetailRow label="Reproducciones" value={String(currentTrack.playCount || 0)} />
              <DetailRow label="Ubicación" value={currentTrack.uri} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LyricsModal
        track={currentTrack}
        positionMs={positionMs}
        visible={showLyricsModal}
        onClose={() => setShowLyricsModal(false)}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function formatTime(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSec = Math.floor(safeMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1A',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  ambientBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.28,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    backgroundColor: 'rgba(16, 53, 42, 0.45)',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTrackName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E2E8F0',
    letterSpacing: 0.4,
    maxWidth: '70%',
  },
  artworkSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginVertical: 4,
  },
  circularArtworkFrame: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    backgroundColor: '#1E2538',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 20,
    position: 'relative',
  },
  circularArtwork: {
    width: '100%',
    height: '100%',
  },
  placeholderCircular: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121826',
    padding: 12,
  },
  addPhotoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    gap: 6,
  },
  addPhotoText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 11,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  actionPillButton: {
    padding: 4,
  },
  sleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  sleepBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  glassmorphicCard: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(23, 29, 44, 0.88)',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  seekHitArea: {
    paddingVertical: 10,
  },
  seekTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 2,
    position: 'relative',
  },
  seekFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  seekThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginRight: -6,
  },
  seekThumbActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    marginRight: -8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  secondaryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  secondsLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
    top: 17,
  },
  bigPlayButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  extraControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  extraChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  extraChipActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
  },
  speedPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  volPercentText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  volumeDrawer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
  },
  volTrackHitArea: {
    flex: 1,
    paddingVertical: 8,
  },
  volTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  volValueLabel: {
    fontSize: 11,
    color: '#E2E8F0',
    width: 34,
    textAlign: 'right',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#141B29',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    ...typography.h3,
    color: '#FFFFFF',
  },
  modalSubtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginBottom: 14,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 8,
  },
  modalOptionText: {
    ...typography.body,
    color: '#F8FAFC',
  },
  modalDangerOption: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalDangerText: {
    ...typography.bodyBold,
    color: colors.error,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    width: 96,
  },
  detailValue: {
    fontSize: 12,
    color: '#F8FAFC',
    flex: 1,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
