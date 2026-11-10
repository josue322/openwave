import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, CheckCircle2, Disc, Play, ShieldCheck, Share2, Music } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { useArtistProfileStore } from '../../src/store/artist-profile-store';
import { PlaybackService } from '../../src/playback/service/playback-service';

export default function ArtistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const currentProfile = useArtistProfileStore((s) => s.currentProfile);
  const releases = useArtistProfileStore((s) => s.releases);
  const stats = useArtistProfileStore((s) => s.stats);
  const isLoading = useArtistProfileStore((s) => s.isLoading);
  const loadArtistDetails = useArtistProfileStore((s) => s.loadArtistDetails);

  const playbackService = PlaybackService.getInstance();

  useEffect(() => {
    if (id) {
      loadArtistDetails(id);
    }
  }, [id]);

  if (isLoading || !currentProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando perfil del artista...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handlePlayRelease = (tracks: any[]) => {
    if (tracks.length > 0) {
      playbackService.playTrack(tracks[0], tracks, 0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronDown color={colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Artista Independiente</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Avatar and Info */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Music color={colors.primary} size={48} />
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.stageName}>{currentProfile.stageName}</Text>
            {currentProfile.isVerified && (
              <CheckCircle2 color={colors.primary} size={20} fill="transparent" />
            )}
          </View>

          {currentProfile.bio && (
            <Text style={styles.bioText}>{currentProfile.bio}</Text>
          )}

          {/* Genre Badges */}
          <View style={styles.genreRow}>
            {currentProfile.genres.map((g) => (
              <View key={g} style={styles.genreBadge}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>

          {/* License Badge */}
          <View style={styles.licenseBanner}>
            <ShieldCheck color={colors.secondary} size={16} />
            <Text style={styles.licenseText}>
              Música bajo {currentProfile.licenseModel}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalPlays}</Text>
              <Text style={styles.statLabel}>Reproducciones</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{releases.length}</Text>
              <Text style={styles.statLabel}>Lanzamientos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.uniqueDaysPlayed} d</Text>
              <Text style={styles.statLabel}>Días activo</Text>
            </View>
          </View>
        )}

        {/* Discography / Releases */}
        <Text style={styles.sectionTitle}>Discografía y Publicaciones</Text>
        {releases.map((rel) => (
          <View key={rel.id} style={styles.releaseCard}>
            <View style={styles.releaseIconBox}>
              <Disc color={colors.primary} size={28} />
            </View>
            <View style={styles.releaseInfo}>
              <Text style={styles.releaseTitle}>{rel.title}</Text>
              <Text style={styles.releaseType}>
                {rel.releaseType.toUpperCase()} • {rel.tracks.length} canciones
              </Text>
              <Text style={styles.releaseLicense}>{rel.licenseDetails}</Text>
            </View>
            <TouchableOpacity
              style={styles.playButton}
              onPress={() => handlePlayRelease(rel.tracks)}
              activeOpacity={0.8}
            >
              <Play color="#0A0D14" size={18} fill="#0A0D14" />
            </TouchableOpacity>
          </View>
        ))}
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
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  bioText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  genreRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  genreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
  },
  genreText: {
    ...typography.small,
    color: colors.textPrimary,
  },
  licenseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 200, 150, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 14,
  },
  licenseText: {
    ...typography.small,
    color: colors.secondary,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  releaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  releaseIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  releaseInfo: {
    flex: 1,
  },
  releaseTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  releaseType: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  releaseLicense: {
    ...typography.small,
    color: colors.secondary,
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

