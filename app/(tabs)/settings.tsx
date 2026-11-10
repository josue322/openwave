import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sliders, HardDrive, Shield, Info, ChevronRight, Moon, Music } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function SettingsScreen() {
  const [gapless, setGapless] = React.useState(false);
  const [normalizeVolume, setNormalizeVolume] = React.useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Ajustes</Text>

        {/* Audio Section */}
        <Text style={styles.sectionHeader}>Motor de Audio</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Sliders color={colors.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Gapless Playback</Text>
              <Text style={styles.settingSubtitle}>Sin pausa entre canciones consecutivas</Text>
            </View>
            <Switch
              value={gapless}
              onValueChange={setGapless}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Music color={colors.secondary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Normalización de Volumen</Text>
              <Text style={styles.settingSubtitle}>Equilibrar nivel de ganancia de audio</Text>
            </View>
            <Switch
              value={normalizeVolume}
              onValueChange={setNormalizeVolume}
              trackColor={{ false: colors.surfaceHighlight, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        {/* Storage & Privacy */}
        <Text style={styles.sectionHeader}>Privacidad y Almacenamiento</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingIcon}>
              <HardDrive color={colors.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Base de Datos SQLite</Text>
              <Text style={styles.settingSubtitle}>openwave.db • Estado saludable</Text>
            </View>
            <ChevronRight color={colors.textMuted} size={18} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Shield color={colors.success} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Modo 100% Offline</Text>
              <Text style={styles.settingSubtitle}>Sin rastreo, telemetría ni publicidad</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={styles.sectionHeader}>Acerca de</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingIcon}>
              <Info color={colors.primary} size={20} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>OpenWave v1.1</Text>
              <Text style={styles.settingSubtitle}>Licencia Open Source • Hecho para Android</Text>
            </View>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: 20,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 66,
  },
});

