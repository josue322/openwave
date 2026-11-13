import { IMusicProvider } from './i-music-provider';
import { CreativeCommonsProvider } from './creative-commons-provider';
import { InternetArchiveProvider, StreamQuality } from './internet-archive-provider';
import { Track } from '../../domain/entities/track';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, IMusicProvider> = new Map();

  private constructor() {
    this.registerProvider(new CreativeCommonsProvider());
    this.registerProvider(new InternetArchiveProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerProvider(provider: IMusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): IMusicProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IMusicProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Resolves a track's streamable URL if it points to an Archive identifier rather than a direct audio file.
   */
  public async resolveTrackForPlayback(
    track: Track,
    quality: StreamQuality = 'high'
  ): Promise<Track> {
    if (track.sourceType !== 'stream') return track;
    if (track.id.startsWith('ia_') && !track.uri.match(/\.(mp3|ogg|m4a|flac|wav)(\?|$)/i)) {
      const ia = this.getProvider('internet_archive_cc') as InternetArchiveProvider | undefined;
      if (ia) {
        const directUrl = await ia.resolveStreamUrl(track.id, quality);
        return {
          ...track,
          uri: directUrl,
          bitrate: quality === 'standard' ? 64 : 192,
        };
      }
    }
    return track;
  }
}
