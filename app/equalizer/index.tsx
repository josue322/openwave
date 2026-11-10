import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, Sliders, Zap, Volume2 } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import {
  useEqualizerStore,
  EQUALIZER_PRESETS,
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

  const presetNames = Object.keys(EQUALIZER_PRESETS) as EqualizerPresetName[];

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
        <Text style={styles.screenTitle}>Ecualizador Gráfico</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Presets Horizontal Selector */}
        <Text style={styles.sectionHeader}>Preajustes</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsContainer}
        >
          {presetNames.map((name) => {
            const isSelected = selectedPreset === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.presetPill, isSelected && styles.presetPillActive]}
                onPress={() => applyPreset(name)}
                disabled={!enabled}
              >
                <Text
                  style={[styles.presetText, isSelected && styles.presetTextActive]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 5-Band Sliders Graphic Display */}
        <View style={[styles.bandsCard, !enabled && styles.disabledCard]}>
          <Text style={styles.cardTitle}>5 Bandas Paramétricas</Text>
          <View style={styles.bandsRow}>
            {bands.map((band, idx) => (
              <View key={band.frequency} style={styles.bandColumn}>
                <Text style={styles.gainText}>
                  {band.gain > 0 ? `+${band.gain}` : band.gain} dB
                </Text>
                {/* Vertical Bar Simulator */}
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
                {/* Step buttons for precise gain adjustment */}
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

        {/* Enhancements / Bass Boost */}
        <Text style={styles.sectionHeader}>Potenciadores de Sonido</Text>
        <View style={[styles.effectCard, !enabled && styles.disabledCard]}>
          <View style={styles.effectHeader}>
            <View style={styles.effectIconCircle}>
              <Zap color={colors.secondary} size={20} />
            </View>
            <View style={styles.effectInfo}>
              <Text style={styles.effectTitle}>Graves Profundos (Bass Boost)</Text>
              <Text style={styles.effectSubtitle}>Intensifica frecuencias bajas sub-bass</Text>
            </View>
            <Text style={styles.effectValue}>{bassBoost}%</Text>
          </View>

          <View style={styles.boostButtonsRow}>
            {[0, 25, 50, 75, 100].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.boostPill,
                  bassBoost === level && styles.boostPillActive,
                ]}
                onPress={() => setBassBoost(level)}
                disabled={!enabled}
              >
                <Text
                  style={[
                    styles.boostText,
                    bassBoost === level && styles.boostTextActive,
                  ]}
                >
                  {level}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionHeader: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 14,
    fontWeight: '600',
  },
  presetsContainer: {
    gap: 8,
    paddingBottom: 6,
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
    paddingHorizontal: 14,
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
});
