import { IMusicProvider, ProviderCapabilities } from './i-music-provider';
import { Track } from '../../domain/entities/track';

export type StreamQuality = 'high' | 'standard';

interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  subject?: string | string[];
  publicdate?: string;
  downloads?: number;
}

export class InternetArchiveProvider implements IMusicProvider {
  public readonly id = 'internet_archive_cc';
  public readonly name = 'Internet Archive (Creative Commons)';
  public readonly description = 'Catálogo abierto gratuito con música bajo licencias libres';
  public readonly capabilities: ProviderCapabilities = {
    canSearch: true,
    canStream: true,
    hasPlaylists: false,
    licenseType: 'Creative Commons',
  };

  private resolvedUrlCache = new Map<string, { high: string; standard: string; durationMs: number; size?: number }>();

  public async search(query: string): Promise<Track[]> {
    const clean = query.trim();
    if (!clean) return this.getFeaturedTracks();
    const safeQ = clean.replace(/[()"']/g, ' ');
    const searchQuery = `mediatype:(audio) AND collection:(netlabels OR opensource_audio) AND (${safeQ})`;
    return this.executeSearch(searchQuery, 'downloads desc', 18);
  }

  public async getFeaturedTracks(): Promise<Track[]> {
    const query = 'mediatype:(audio) AND collection:(netlabels)';
    return this.executeSearch(query, 'downloads desc', 16);
  }

  public async getNewReleases(): Promise<Track[]> {
    const query = 'mediatype:(audio) AND collection:(netlabels OR opensource_audio)';
    return this.executeSearch(query, 'publicdate desc', 14);
  }

  public async getByGenre(genre: string): Promise<Track[]> {
    const safeGenre = genre.replace(/[()"']/g, ' ');
    const query = `mediatype:(audio) AND collection:(netlabels OR opensource_audio) AND subject:(${safeGenre})`;
    return this.executeSearch(query, 'downloads desc', 14);
  }

  public async resolveStreamUrl(trackId: string, quality: StreamQuality = 'high'): Promise<string> {
    const identifier = trackId.startsWith('ia_') ? trackId.slice(3) : trackId;
    const cached = this.resolvedUrlCache.get(identifier);
    if (cached) {
      return quality === 'standard' ? cached.standard : cached.high;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const files: any[] = Array.isArray(data?.files) ? data.files : [];

      const audioFiles = files.filter((f) => {
        const name = String(f?.name || '').toLowerCase();
        return (
          (name.endsWith('.mp3') || name.endsWith('.ogg') || name.endsWith('.m4a')) &&
          !name.includes('_64kb_mp3')
        );
      });

      const lowBitrateMp3 = files.find((f) =>
        String(f?.name || '').toLowerCase().endsWith('.mp3')
      );

      const selectedHigh = audioFiles[0] || lowBitrateMp3;
      if (!selectedHigh?.name) {
        throw new Error('No se encontró flujo de audio compatible en este elemento.');
      }

      const selectedStandard =
        files.find((f) => String(f?.name || '').toLowerCase().includes('64kb')) || selectedHigh;

      const highUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(selectedHigh.name).replace(/%2F/g, '/')}`;
      const standardUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(selectedStandard.name).replace(/%2F/g, '/')}`;
      const durationSec = Number(selectedHigh.length) || 180;
      const size = Number(selectedHigh.size) || undefined;

      this.resolvedUrlCache.set(identifier, {
        high: highUrl,
        standard: standardUrl,
        durationMs: Math.round(durationSec * 1000),
        size,
      });

      return quality === 'standard' ? standardUrl : highUrl;
    } finally {
      clearTimeout(timer);
    }
  }

  private async executeSearch(query: string, sort: string, rows: number): Promise<Track[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=subject&fl[]=publicdate&fl[]=downloads&sort[]=${encodeURIComponent(sort)}&rows=${rows}&output=json`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];

      const json = await res.json();
      const docs: ArchiveDoc[] = json?.response?.docs || [];

      return docs
        .filter((d) => Boolean(d.identifier && d.title))
        .map((d) => {
          const creator = Array.isArray(d.creator) ? d.creator[0] : d.creator;
          const genre = Array.isArray(d.subject) ? d.subject[0] : d.subject;
          const id = `ia_${d.identifier}`;
          return {
            id,
            title: String(d.title).trim(),
            artistName: creator ? String(creator).trim() : 'Artista Creative Commons',
            albumTitle: 'Catálogo Abierto Archive',
            duration: 180000,
            // Direct archive CDN download/stream pattern resolves cleanly or uses metadata resolver
            uri: `https://archive.org/download/${d.identifier}`,
            artworkUri: `https://archive.org/services/img/${d.identifier}`,
            genre: genre ? String(genre).split(';')[0].trim() : 'Creative Commons',
            year: d.publicdate ? Number(String(d.publicdate).slice(0, 4)) || null : null,
            dateAdded: Date.now(),
            playCount: d.downloads || 0,
            isFavorite: false,
            sourceType: 'stream' as const,
            bitrate: 192,
          };
        });
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}

