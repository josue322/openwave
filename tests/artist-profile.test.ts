import { useArtistProfileStore } from '../src/store/artist-profile-store';
import { ArtistRelease } from '../src/domain/entities/artist-profile';

describe('useArtistProfileStore', () => {
  beforeEach(() => {
    useArtistProfileStore.setState({
      currentProfile: null,
      releases: [],
      stats: null,
      isLoading: false,
    });
  });

  test('loadArtistDetails populates profile, releases and stats', async () => {
    await useArtistProfileStore.getState().loadArtistDetails('art_123');

    const state = useArtistProfileStore.getState();
    expect(state.currentProfile).toBeDefined();
    expect(state.currentProfile?.id).toBe('art_123');
    expect(state.currentProfile?.isVerified).toBe(true);
    expect(state.releases.length).toBeGreaterThanOrEqual(1);
    expect(state.stats).toBeDefined();
    expect(state.stats?.totalPlays).toBeGreaterThan(0);
  });

  test('publishRelease prepends release to the active releases list', () => {
    const mockRelease: ArtistRelease = {
      id: 'rel_custom',
      artistId: 'art_123',
      title: 'New Horizons Single',
      releaseType: 'single',
      releaseDate: Date.now(),
      tracks: [],
      licenseDetails: 'CC BY 4.0',
    };

    useArtistProfileStore.getState().publishRelease(mockRelease);
    const releases = useArtistProfileStore.getState().releases;
    expect(releases.length).toBe(1);
    expect(releases[0].id).toBe('rel_custom');
  });
});

