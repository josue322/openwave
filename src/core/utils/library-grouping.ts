import { Track } from '../../domain/entities/track';

export type SortField = 'title' | 'artist' | 'album' | 'duration' | 'dateAdded';
export type SortDirection = 'asc' | 'desc';
export type SourceFilter = 'all' | 'local' | 'stream';

export interface GroupedCollection {
  key: string;
  title: string;
  subtitle: string;
  artworkUri?: string | null;
  tracks: Track[];
}

export function sortAndFilterTracks(
  tracks: Track[],
  sortBy: SortField,
  direction: SortDirection,
  sourceFilter: SourceFilter = 'all',
  genreFilter: string | null = null
): Track[] {
  let result = tracks;

  if (sourceFilter !== 'all') {
    result = result.filter((t) => t.sourceType === sourceFilter);
  }

  if (genreFilter) {
    result = result.filter(
      (t) => (t.genre || 'Sin género').toLowerCase() === genreFilter.toLowerCase()
    );
  }

  const mult = direction === 'asc' ? 1 : -1;

  return [...result].sort((a, b) => {
    switch (sortBy) {
      case 'artist':
        return (
          (a.artistName || 'Artista desconocido').localeCompare(
            b.artistName || 'Artista desconocido'
          ) * mult
        );
      case 'album':
        return (
          (a.albumTitle || 'Sin álbum').localeCompare(b.albumTitle || 'Sin álbum') * mult
        );
      case 'duration':
        return ((a.duration || 0) - (b.duration || 0)) * mult;
      case 'dateAdded':
        return ((a.dateAdded || 0) - (b.dateAdded || 0)) * mult;
      case 'title':
      default:
        return (a.title || '').localeCompare(b.title || '') * mult;
    }
  });
}

export function groupTracksByField(
  tracks: Track[],
  field: 'album' | 'artist' | 'genre' | 'folder'
): GroupedCollection[] {
  const map = new Map<string, Track[]>();

  for (const track of tracks) {
    let rawKey = '';
    switch (field) {
      case 'album':
        rawKey = track.albumTitle?.trim() || 'Sin álbum';
        break;
      case 'artist':
        rawKey = track.artistName?.trim() || 'Artista desconocido';
        break;
      case 'genre':
        rawKey = track.genre?.trim() || 'Sin género';
        break;
      case 'folder':
        rawKey = track.folderPath?.trim() || (track.sourceType === 'stream' ? 'Streaming Online' : 'Biblioteca Local');
        break;
    }

    const list = map.get(rawKey) || [];
    list.push(track);
    map.set(rawKey, list);
  }

  const collections: GroupedCollection[] = [];
  for (const [key, list] of map.entries()) {
    const firstWithArt = list.find((t) => Boolean(t.artworkUri));
    let subtitle = `${list.length} ${list.length === 1 ? 'canción' : 'canciones'}`;
    if (field === 'album') {
      const artist = list[0]?.artistName || 'Varios artistas';
      subtitle = `${artist} • ${list.length} ${list.length === 1 ? 'pista' : 'pistas'}`;
    }

    collections.push({
      key,
      title: key,
      subtitle,
      artworkUri: firstWithArt?.artworkUri || null,
      tracks: list,
    });
  }

  return collections.sort((a, b) => a.title.localeCompare(b.title));
}

