import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import {
  Sliders,
  HardDrive,
  Shield,
  Info,
  ChevronRight,
  Moon,
  Sun,
  Music,
  Headphones,
  Folder,
  Palette,
  Globe,
  Trash2,
  Terminal,
  RotateCcw,
  History,
  X,
  Plus,
} from 'lucide-react-native';
import { typography } from '../../src/theme/typography';
import { useThemeColors } from '../../src/theme/theme-hook';
import { useTranslation } from '../../src/core/i18n/translations';
import { useSettingsStore } from '../../src/store/settings-store';
import { calculateAppStorageUsage, clearAppCache, StorageUsageReport } from '../../src/core/utils/storage-usage';
import { formatFileSize } from '../../src/core/utils/track-actions';
import { FolderManager, ScannedFolderRecord } from '../../src/data/local/scanner/folder-manager';
import { ErrorLogger, ErrorLogEntry } from '../../src/core/errors/error-logger';

const ACCENT_PALETTE = ['#00E5FF', '#00C896', '#A855F7', '#F59E0B', '#EC4899', '#3B82F6'];
const CROSSFADE_OPTIONS = [0, 2, 4, 6, 8, 10];

export default function SettingsScreen() {
  const router = useRouter();
  const palette = useThemeColors();
  const { t } = useTranslation();

  const settings = useSettingsStore();
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const resetDefaults = useSettingsStore((s) => s.resetDefaults);

  const [storage, setStorage] = useState<StorageUsageReport | null>(null);
  const [showFoldersModal, setShowFoldersModal] = useState(false);
  const [scannedFolders, setScannedFolders] = useState<ScannedFolderRecord[]>([]);
  const [excludedFolders, setExcludedFolders] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState('');

  const [showLogsModal, setShowLogsModal] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);

  useEffect(() => {
    refreshStorage();
  }, []);

  const refreshStorage = async () => {
    const report = await calculateAppStorageUsage();
    setStorage(report);
  };

  const openFoldersManager = async () => {
    const [scanned, excluded] = await Promise.all([
      FolderManager.getScannedFolders().catch(() => []),
      FolderManager.getExcludedFolders().catch(() => []),
    ]);
    setScannedFolders(scanned);
    setExcludedFolders(excluded);
    setShowFoldersModal(true);
  };

  const handleAddExclusion = async () => {
    if (!newExclusion.trim()) return;
    await FolderManager.addExcludedFolder(newExclusion.trim());
    setNewExclusion('');
    const excluded = await FolderManager.getExcludedFolders();
    setExcludedFolders(excluded);
  };

  const handleOpenLogs = async () => {
    const logs = await ErrorLogger.getLogs(50);
    setErrorLogs(logs);
    setShowLogsModal(true);
  };

  const handleClearCache = async () => {
    const freed = await clearAppCache();
    await refreshStorage();
    Alert.alert(
      'Caché limpia',
      `Se liberaron ${formatFileSize(freed)} de archivos temporales sin afectar tu música.`
    );
  };

  const handleResetAll = () => {
    Alert.alert(
      'Restaurar configuración',
      '¿Deseas restablecer todas las preferencias de OpenWave a sus valores predeterminados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            await resetDefaults();
            Alert.alert('Restaurado', 'Configuración predeterminada aplicada.');
          },
        },
      ]
    );
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.screenTitle, { color: palette.textPrimary }]}>{t.settings.title}</Text>

        {/* Playback & Audio Engine */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.playbackSection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Sliders color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Reproducción sin pausas (Gapless)
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Precarga anticipada entre pistas consecutivas
              </Text>
            </View>
            <Switch
              value={settings.gaplessPlayback}
              onValueChange={(v) => updateSetting('gaplessPlayback', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              const idx = CROSSFADE_OPTIONS.indexOf(settings.crossfadeSeconds);
              const next = CROSSFADE_OPTIONS[(idx + 1) % CROSSFADE_OPTIONS.length];
              updateSetting('crossfadeSeconds', next);
            }}
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Music color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Fundido suave (Fade In / Crossfade)
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                {settings.crossfadeSeconds === 0
                  ? 'Desactivado (toca para configurar)'
                  : `${settings.crossfadeSeconds} segundos de transición suave`}
              </Text>
            </View>
            <Text style={[styles.valueTag, { color: palette.primary }]}>
              {settings.crossfadeSeconds}s
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Music color="#A855F7" size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Auto-reproducir similares
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Añade canciones del mismo género o artista al acabar la cola
              </Text>
            </View>
            <Switch
              value={settings.autoPlaySimilar}
              onValueChange={(v) => updateSetting('autoPlaySimilar', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Sliders color="#F59E0B" size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Normalización ReplayGain
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Preferencia guardada (DSP activo al compilar Media3 nativo)
              </Text>
            </View>
            <Switch
              value={settings.normalizeVolume}
              onValueChange={(v) => updateSetting('normalizeVolume', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() =>
              updateSetting('streamQuality', settings.streamQuality === 'high' ? 'standard' : 'high')
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Globe color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Calidad de Streaming Online
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                {settings.streamQuality === 'high' ? 'Alta calidad (192+ kbps)' : 'Estándar (Ahorro datos 64 kbps)'}
              </Text>
            </View>
            <Text style={[styles.valueTag, { color: palette.primary }]}>
              {settings.streamQuality === 'high' ? 'HD' : 'STD'}
            </Text>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/equalizer' as any)}
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Sliders color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Ecualizador Gráfico y Perfiles
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Plano, Rock, Pop, Clásica, Jazz, Hip-Hop y personalizados
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Headphones & Bluetooth */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.headphonesSection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Headphones color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Pausar al desconectar audífonos
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Evita reproducción accidental en altavoz
              </Text>
            </View>
            <Switch
              value={settings.pauseOnHeadphoneDisconnect}
              onValueChange={(v) => updateSetting('pauseOnHeadphoneDisconnect', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Headphones color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Reanudar al conectar Bluetooth / cable
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Requiere servicio nativo Media3 en Development Build
              </Text>
            </View>
            <Switch
              value={settings.resumeOnHeadphoneConnect}
              onValueChange={(v) => updateSetting('resumeOnHeadphoneConnect', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Library & Folders */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.librarySection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Folder color="#F59E0B" size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Escaneo automático al abrir la app
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Busca nuevas canciones del teléfono al iniciar
              </Text>
            </View>
            <Switch
              value={settings.autoScanOnLaunch}
              onValueChange={(v) => updateSetting('autoScanOnLaunch', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity style={styles.settingRow} onPress={openFoldersManager}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Folder color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Carpetas escaneadas y exclusiones
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Configura carpetas SAF o excluye audios de sistema/chat
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => router.push('/stats' as any)}
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <History color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Historial y Estadísticas de Escucha
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Canciones top, artistas y tiempo escuchado
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Appearance & Language */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.appearanceSection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              {settings.themeMode === 'dark' ? (
                <Moon color={palette.primary} size={20} />
              ) : (
                <Sun color="#F59E0B" size={20} />
              )}
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                {settings.themeMode === 'dark' ? 'Modo Oscuro activo' : 'Modo Claro activo'}
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Alterna entre interfaz oscura o clara
              </Text>
            </View>
            <Switch
              value={settings.themeMode === 'dark'}
              onValueChange={(isDark) => updateSetting('themeMode', isDark ? 'dark' : 'light')}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingColumnRow}>
            <View style={styles.settingTopLine}>
              <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
                <Palette color={palette.primary} size={20} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                  Color de acento personalizado
                </Text>
              </View>
            </View>
            <View style={styles.swatchesRow}>
              {ACCENT_PALETTE.map((hex) => (
                <TouchableOpacity
                  key={hex}
                  onPress={() => updateSetting('accentColor', hex)}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    settings.accentColor === hex && styles.swatchActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Palette color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Adaptar color a la portada activa
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Personaliza acentos según la carátula en reproducción
              </Text>
            </View>
            <Switch
              value={settings.dynamicArtworkColor}
              onValueChange={(v) => updateSetting('dynamicArtworkColor', v)}
              trackColor={{ false: palette.surfaceElevated, true: palette.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => updateSetting('language', settings.language === 'es' ? 'en' : 'es')}
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Globe color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Idioma / Language
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                {settings.language === 'es' ? 'Español (predeterminado)' : 'English'}
              </Text>
            </View>
            <Text style={[styles.valueTag, { color: palette.primary }]}>
              {settings.language.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Storage, Cache & Permissions */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.storageSection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <HardDrive color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Espacio utilizado: {formatFileSize(storage?.totalBytes)}
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Música: {formatFileSize(storage?.musicBytes)} • Descargas: {formatFileSize(storage?.downloadsBytes)} • Portadas: {formatFileSize(storage?.artworkBytes)}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity style={styles.settingRow} onPress={handleClearCache}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Trash2 color={palette.error} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Borrar caché ({formatFileSize(storage?.cacheBytes)})
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Elimina archivos temporales sin borrar tus canciones
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => Linking.openSettings()}
          >
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Shield color={palette.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Permisos de almacenamiento y notificaciones
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Modo 100% Offline • Abrir ajustes del sistema Android
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>
        </View>

        {/* Diagnostics & System */}
        <Text style={[styles.sectionHeader, { color: palette.textSecondary }]}>
          {t.settings.diagnosticsSection}
        </Text>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={handleOpenLogs}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Terminal color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Registro de errores y diagnóstico
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Consultar o exportar eventos técnicos locales
              </Text>
            </View>
            <ChevronRight color={palette.textMuted} size={18} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity style={styles.settingRow} onPress={handleResetAll}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <RotateCcw color={palette.warning} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                Restaurar configuración predeterminada
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Vuelve tema, audio y preferencias al estado inicial
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: palette.surfaceElevated }]}>
              <Info color={palette.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: palette.textPrimary }]}>
                OpenWave v{appVersion} (Expo SDK 58)
              </Text>
              <Text style={[styles.settingSubtitle, { color: palette.textSecondary }]}>
                Open Source • Privacidad Offline • Sin publicidad
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Folders & Exclusions Modal */}
      <Modal
        visible={showFoldersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFoldersModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                Carpetas y Exclusiones
              </Text>
              <TouchableOpacity onPress={() => setShowFoldersModal(false)}>
                <X color={palette.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: palette.primary }]}>
              Añadir carpeta o patrón a excluir del escaneo:
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: palette.textPrimary, borderColor: palette.border }]}
                placeholder="Ej: WhatsApp Audio, Ringtones..."
                placeholderTextColor={palette.textMuted}
                value={newExclusion}
                onChangeText={setNewExclusion}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: palette.primary }]}
                onPress={handleAddExclusion}
              >
                <Plus color="#0A0D14" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              <Text style={[styles.modalLabel, { color: palette.textSecondary }]}>
                Carpetas excluidas ({excludedFolders.length}):
              </Text>
              {excludedFolders.map((ex) => (
                <View key={ex} style={styles.modalItemRow}>
                  <Text style={{ color: palette.textPrimary, flex: 1 }}>{ex}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await FolderManager.removeExcludedFolder(ex);
                      setExcludedFolders(await FolderManager.getExcludedFolders());
                    }}
                  >
                    <Trash2 color={palette.error} size={16} />
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={[styles.modalLabel, { color: palette.textSecondary, marginTop: 12 }]}>
                Carpetas SAF agregadas ({scannedFolders.length}):
              </Text>
              {scannedFolders.map((f) => (
                <View key={f.uri} style={styles.modalItemRow}>
                  <Text style={{ color: palette.textPrimary, flex: 1 }}>{f.label}</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await FolderManager.removeScannedFolder(f.uri);
                      setScannedFolders(await FolderManager.getScannedFolders());
                    }}
                  >
                    <Trash2 color={palette.error} size={16} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Error Logs Modal */}
      <Modal
        visible={showLogsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>
                Registros de Diagnóstico
              </Text>
              <TouchableOpacity onPress={() => setShowLogsModal(false)}>
                <X color={palette.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            <View style={styles.logActions}>
              <TouchableOpacity
                style={[styles.logActionBtn, { borderColor: palette.border }]}
                onPress={async () => {
                  const txt = errorLogs
                    .map(
                      (l) =>
                        `[${new Date(l.createdAt).toISOString()}] [${l.level}] ${l.source}: ${l.message}`
                    )
                    .join('\n');
                  await Share.share({ message: txt || 'Sin errores registrados en OpenWave.' });
                }}
              >
                <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>
                  Exportar Logs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logActionBtn, { borderColor: palette.border }]}
                onPress={async () => {
                  await ErrorLogger.clearLogs();
                  setErrorLogs([]);
                }}
              >
                <Text style={{ color: palette.error, fontWeight: '700', fontSize: 12 }}>
                  Limpiar
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {errorLogs.length === 0 ? (
                <Text style={{ color: palette.textSecondary, paddingVertical: 16 }}>
                  No hay errores registrados. El sistema opera con estabilidad.
                </Text>
              ) : (
                errorLogs.map((l) => (
                  <View key={l.id} style={styles.logItem}>
                    <Text style={{ color: palette.warning, fontSize: 11, fontWeight: '700' }}>
                      [{l.level}] {l.source} • {new Date(l.createdAt).toLocaleString()}
                    </Text>
                    <Text style={{ color: palette.textPrimary, fontSize: 12, marginTop: 2 }}>
                      {l.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    ...typography.h1,
    marginBottom: 16,
  },
  sectionHeader: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  settingColumnRow: {
    padding: 15,
  },
  settingTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyBold,
  },
  settingSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  valueTag: {
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 50,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  swatchActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtn: {
    width: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  logActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  logActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  logItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
});
