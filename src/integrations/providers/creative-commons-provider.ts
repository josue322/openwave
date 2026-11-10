import { IMusicProvider, ProviderCapabilities } from './i-music-provider';
import { Track } from '../../domain/entities/track';

export class CreativeCommonsProvider implements IMusicProvider {
  public readonly id = 'cc_open_catalog';
  public readonly name = 'Catálogo Abierto Creative Commons';
  public readonly description = 'Música bajo licencias abiertas y dominio público';
  public readonly capabilities: ProviderCapabilities = {
    canSearch: true,
    canStream: true,
    hasPlaylists: false,
    licenseType: 'Creative Commons',
  };

  // Curated open-source / royalty-free audio tracks for testing & streaming
  private openCatalog: Track[] = [
    {
      id: 'cc_track_1',
      title: 'Acoustic Breeze',
      artistName: 'Benjamin Tissot',
      albumTitle: 'Creative Commons Royalty Free',
      duration: 157000,
      uri: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
      genre: 'Acoustic / Folk',
      year: 2022,
      dateAdded: Date.now(),
      playCount: 0,
      isFavorite: false,
      sourceType: 'stream',
    },
    {
      id: 'cc_track_2',
      title: 'Sunny',
      artistName: 'Benjamin Tissot',
      albumTitle: 'Creative Commons Royalty Free',
      duration: 140000,
      uri: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
      genre: 'Acoustic',
      year: 2023,
      dateAdded: Date.now(),
      playCount: 0,
      isFavorite: false,
      sourceType: 'stream',
    },
    {
      id: 'cc_track_3',
      title: 'Energy',
      artistName: 'Benjamin Tissot',
      albumTitle: 'Creative Commons Royalty Free',
      duration: 179000,
      uri: 'https://www.bensound.com/bensound-music/bensound-energy.mp3',
      genre: 'Rock / Energetic',
      year: 2023,
      dateAdded: Date.now(),
      playCount: 0,
      isFavorite: false,
      sourceType: 'stream',
    },
  ];

  public async search(query: string): Promise<Track[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.openCatalog;

    return this.openCatalog.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.artistName && t.artistName.toLowerCase().includes(q)) ||
        (t.genre && t.genre.toLowerCase().includes(q))
    );
  }

  public async getFeaturedTracks(): Promise<Track[]> {
    return [...this.openCatalog];
  }

  public async resolveStreamUrl(trackId: string): Promise<string> {
    const track = this.openCatalog.find((t) => t.id === trackId);
    if (!track) {
      throw new Error(`Pista no encontrada en catálogo abierto: ${trackId}`);
    }
    return track.uri;
  }
}
