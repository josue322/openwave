import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Zap, Volume2, Plus, Trash2, Info, X, Check } from 'lucide-react-native';
import { OpenWaveNativeBridge } from '../../src/playback/native/openwave-native-bridge';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import {
  useEqualizerStore,
  SPANISH_PRESETS,
  EqualizerPresetName,
} from '../../src/store/equalizer-store';

export default function EqualizerScreen() {
  const router = useRouter();
  const enabled = useEqualizerStore((s) => s.enabled);
  const setEnabled = useEqualizerStore((s) => s.setEnabled);
  const selectedPreset = useEqualizerStore((s) => s.selectedPreset);
  const applyPreset = useEqualizerStore((s) => s.applyPreset);
  const bands = useEqualizerStore((s) => s.bands);
  const setBandGain = useEqualizerStore((s) => s.setBandGain);
  const bassBoost = useEqualizerStore((s) => s.bassBoost);
  const setBassBoost = useEqualizerStore((s) => s.setBassBoost);
  const trebleBoost = useEqualizerStore((s) => s.trebleBoost);
  const setTrebleBoost = useEqualizerStore((s) => s.setTrebleBoost);
  const surround = useEqualizerStore((s) => s.surround);
  const setSurround = useEqualizerStore((s) => s.setSurround);
  const virtualizer = useEqualizerStore((s) => s.virtualizer);
  const setVirtualizer = useEqualizerStore((s) => s.setVirtualizer);
  const balance = useEqualizerStore((s) => s.balance);
  const setBalance = useEqualizerStore((s) => s.setBalance);
  const preampGain = useEqualizerStore((s) => s.preampGain);
  const setPreampGain = useEqualizerStore((s) => s.setPreampGain);
  const customProfiles = useEqualizerStore((s) => s.customProfiles);
  const saveCustomProfile = useEqualizerStore((s) => s.saveCustomProfile);
  const applyCustomProfile = useEqualizerStore((s) => s.applyCustomProfile);
  const deleteCustomProfile = useEqualizerStore((s) => s.deleteCustomProfile);
  const loadSavedEqState = useEqualizerStore((s) => s.loadSavedEqState);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadSavedEqState().catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para guardar tu perfil de ecualización.');
      return;
    }
    await saveCustomProfile(profileName.trim());
    setProfileName('');
    setShowSaveModal(false);
    Alert.alert('Perfil guardado', 'Tu configuración de ecualización se guardó en la base local.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Ecualizador y Audio</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Honest Transparency Banner (Spec v1.1 Section 9) */}
        <View style={styles.infoBanner}>
          <Info color={colors.primary} size={18} />
          <Text style={styles.infoBannerText}>
            {OpenWaveNativeBridge.isNativeAvailable()
              ? 'DSP Nativo Activo (AndroidX Media3): Ecualizador, Bass Boost, Virtualizador, Loudness y Balance L/R conectados al procesador de audio en hardware.'
              : 'Modo Expo Go: los perfiles y ajustes se guardan en SQLite. Compila con Development Build o APK (eas build / expo run:android) para activar el procesador DSP AudioEffect + Balance PCM en hardware Android.'}
          </Text>
        </View>

        {/* Presets */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Preajustes</Text>
          <TouchableOpacity
            style={styles.saveProfileBtn}
            onPress={() => setShowSaveModal(true)}
          >
            <Plus color={colors.primary} size={14} />
            <Text style={styles.saveProfileText}>Guardar perfil</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsContainer}
        >
          {SPANISH_PRESETS.map((name: EqualizerPresetName) => {
            const isSelected = selectedPreset === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.presetPill, isSelected && styles.presetPillActive]}
                onPress={() => applyPreset(name)}
                disabled={!enabled}
              >
                <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Custom Saved Profiles */}
        {customProfiles.length > 0 && (
          <View style={styles.customProfilesBlock}>
            <Text style={styles.customTitle}>Mis Perfiles Guardados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContainer}>
              {customProfiles.map((prof) => {
                const isSelected = selectedPreset === prof.name;
                return (
                  <View key={prof.name} style={styles.customPillRow}>
                    <TouchableOpacity
                      style={[styles.presetPill, isSelected && styles.presetPillActive]}
                      onPress={() => applyCustomProfile(prof)}
                      disabled={!enabled}
                    >
                      <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                        {prof.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteCustomProfile(prof.name)}>
                      <Trash2 color={colors.error} size={14} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 5-Band Sliders */}
        <View style={[styles.bandsCard, !enabled && styles.disabledCard]}>
          <Text style={styles.cardTitle}>Ecualizador Gráfico (5 Bandas)</Text>
          <View style={styles.bandsRow}>
            {bands.map((band, idx) => (
              <View key={band.frequency} style={styles.bandColumn}>
                <Text style={styles.gainText}>
                  {band.gain > 0 ? `+${band.gain}` : band.gain} dB
                </Text>
                <View style={styles.sliderTrack}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        height: `${((band.gain + 10) / 20) * 100}%`,
                        backgroundColor: enabled ? colors.primary : colors.textDisabled,
                      },
                    ]}
                  />
                </View>
                <View style={styles.stepButtons}>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setBandGain(idx, band.gain + 1)}
                    disabled={!enabled || band.gain >= 10}
                  >
                    <Text style={styles.stepButtonText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepButton}
                    onPress={() => setBandGain(idx, band.gain - 1)}
                    disabled={!enabled || band.gain <= -10}
                  >
                    <Text style={styles.stepButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.freqText}>{band.frequency}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sound Effects Cards */}
        <Text style={styles.sectionHeader}>Efectos, Balance y Ganancia</Text>

        <EffectLevelCard
          title="Graves (Bass Boost)"
          subtitle="Refuerzo de frecuencias subgraves"
          value={bassBoost}
          onChange={setBassBoost}
          disabled={!enabled}
        />

        <EffectLevelCard
          title="Agudos (Treble)"
          subtitle="Claridad y brillo en altas frecuencias"
          value={trebleBoost}
          onChange={setTrebleBoost}
          disabled={!enabled}
        />

        <EffectLevelCard
          title="Sonido Envolvente (Surround)"
          subtitle="Amplitud espacial envolvente"
          value={surround}
          onChange={setSurround}
          disabled={!enabled}
        />

        <EffectLevelCard
          title="Virtualizador de Audio"
          subtitle="Escenario acústico optimizado para audífonos"
          value={virtualizer}
          onChange={setVirtualizer}
          disabled={!enabled}
        />

        {/* Balance I/D & Preamp Gain */}
        <View style={[styles.effectCard, !enabled && styles.disabledCard]}>
          <View style={styles.effectHeader}>
            <View style={styles.effectIconCircle}>
              <Volume2 color={colors.primary} size={20} />
            </View>
            <View style={styles.effectInfo}>
              <Text style={styles.effectTitle}>Balance Estéreo (I / D)</Text>
              <Text style={styles.effectSubtitle}>
                {balance === 0
                  ? 'Centrado'
                  : balance < 0
                  ? `Izquierda ${Math.abs(balance)}%`
                  : `Derecha ${balance}%`}
              </Text>
            </View>
          </View>
          <View style={styles.boostButtonsRow}>
            {[-100, -50, 0, 50, 100].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.boostPill, balance === val && styles.boostPillActive]}
                onPress={() => setBalance(val)}
                disabled={!enabled}
              >
                <Text style={[styles.boostText, balance === val && styles.boostTextActive]}>
                  {val === 0 ? 'Centro' : val < 0 ? `I ${Math.abs(val)}` : `D ${val}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.effectCard, !enabled && styles.disabledCard]}>
          <View style={styles.effectHeader}>
            <View style={styles.effectIconCircle}>
              <Zap color="#F59E0B" size={20} />
            </View>
            <View style={styles.effectInfo}>
              <Text style={styles.effectTitle}>Ganancia de Audio (Preamp)</Text>
              <Text style={styles.effectSubtitle}>Ajuste de nivel global dB</Text>
            </View>
            <Text style={styles.effectValue}>
              {preampGain > 0 ? `+${preampGain}` : preampGain} dB
            </Text>
          </View>
          <View style={styles.boostButtonsRow}>
            {[-6, -3, 0, 3, 6].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.boostPill, preampGain === val && styles.boostPillActive]}
                onPress={() => setPreampGain(val)}
                disabled={!enabled}
              >
                <Text style={[styles.boostText, preampGain === val && styles.boostTextActive]}>
                  {val > 0 ? `+${val}` : val} dB
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save Custom Profile Modal */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSaveModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Guardar Perfil Personalizado</Text>
              <TouchableOpacity onPress={() => setShowSaveModal(false)}>
                <X color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Ej: Mi perfil nocturno, Audífonos Studio..."
              placeholderTextColor={colors.textDisabled}
              value={profileName}
              onChangeText={setProfileName}
            />
            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveProfile}>
              <Check color="#0A0D14" size={18} />
              <Text style={styles.modalSaveText}>Guardar configuración</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EffectLevelCard({
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  title: string;
  subtitle: string;
  value: number;
  onChange: (level: number) => void;
  disabled: boolean;
}) {
  return (
    <View style={[styles.effectCard, disabled && styles.disabledCard]}>
      <View style={styles.effectHeader}>
        <View style={styles.effectIconCircle}>
          <Zap color={colors.secondary} size={20} />
        </View>
        <View style={styles.effectInfo}>
          <Text style={styles.effectTitle}>{title}</Text>
          <Text style={styles.effectSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.effectValue}>{value}%</Text>
      </View>

      <View style={styles.boostButtonsRow}>
        {[0, 25, 50, 75, 100].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.boostPill, value === level && styles.boostPillActive]}
            onPress={() => onChange(level)}
            disabled={disabled}
          >
            <Text style={[styles.boostText, value === level && styles.boostTextActive]}>
              {level}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 14,
    fontWeight: '600',
  },
  saveProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#161C2C',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  saveProfileText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  presetsContainer: {
    gap: 8,
    paddingBottom: 6,
  },
  customProfilesBlock: {
    marginTop: 10,
  },
  customTitle: {
    fontSize: 11,
    color: '#A5B4FC',
    fontWeight: '700',
    marginBottom: 6,
  },
  customPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#0A0D14',
    fontWeight: '700',
  },
  bandsCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  disabledCard: {
    opacity: 0.4,
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  bandsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 220,
  },
  bandColumn: {
    alignItems: 'center',
    flex: 1,
  },
  gainText: {
    ...typography.small,
    color: colors.textMuted,
    marginBottom: 8,
  },
  sliderTrack: {
    width: 12,
    height: 120,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sliderFill: {
    width: '100%',
    borderRadius: 6,
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 8,
  },
  stepButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 12,
    lineHeight: 14,
  },
  freqText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  effectCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
  },
  effectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  effectIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 200, 150, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  effectInfo: {
    flex: 1,
  },
  effectTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  effectSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  effectValue: {
    ...typography.h3,
    color: colors.secondary,
  },
  boostButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  boostPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surfaceHighlight,
  },
  boostPillActive: {
    backgroundColor: colors.secondary,
  },
  boostText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  boostTextActive: {
    color: '#0A0D14',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#141A28',
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
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#0A0D14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    marginBottom: 14,
  },
  modalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  modalSaveText: {
    ...typography.bodyBold,
    color: '#0A0D14',
  },
});
