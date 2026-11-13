jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(async (uri: string) => ({
    exists: !uri.includes('missing'),
  })),
}));

import { Track } from '../src/domain/entities/track';
import { sortAndFilterTracks, groupTracksByField } from '../src/core/utils/library-grouping';
import { LibraryHealthService } from '../src/core/utils/library-health';
import { evaluateSmartPlaylist } from '../src/store/playlist-store';

describe('Library Grouping, Filtering, Health & Smart Playlists', () => {
  const tracks: Track[] = [
    {
      id: 't1',
      title: 'Zeta Song',
      artistName: 'Carlos',
      albumTitle: 'Alpha Album',
      genre: 'Rock',
      duration: 210000,
      uri: 'file:///Music/zeta.mp3',
      dateAdded: 1000,
      lastPlayed: 5000,
      playCount: 12,
      isFavorite: true,
      sourceType: 'local',
      folderPath: 'RockFolder',
    },
    {
      id: 't2',
      title: 'Beta Song',
      artistName: 'Ana',
      albumTitle: 'Bravo Album',
      genre: 'Pop',
      duration: 150000,
      uri: 'https://example.com/beta.mp3',
      artworkUri: 'https://example.com/cover.jpg',
      dateAdded: 3000,
      lastPlayed: null,
      playCount: 0,
      isFavorite: false,
      sourceType: 'stream',
    },
    {
      id: 't3',
      title: 'Zeta Song',
      artistName: 'Carlos',
      albumTitle: 'Alpha Album',
      genre: 'Rock',
      duration: 211000,
      uri: 'file:///Downloads/zeta_copy.mp3',
      dateAdded: 2000,
      lastPlayed: 2000,
      playCount: 3,
      isFavorite: false,
      sourceType: 'local',
      folderPath: 'Downloads',
    },
  ];

  test('sortAndFilterTracks sorts by duration descending and filters local tracks', () => {
    const res = sortAndFilterTracks(tracks, 'duration', 'desc', 'local');
    expect(res.length).toBe(2);
    expect(res[0].id).toBe('t3');
    expect(res[1].id).toBe('t1');
  });

  test('groupTracksByField groups properly by album and genre', () => {
    const byAlbum = groupTracksByField(tracks, 'album');
    expect(byAlbum.length).toBe(2);
    expect(byAlbum[0].title).toBe('Alpha Album');
    expect(byAlbum[0].tracks.length).toBe(2);

    const byGenre = groupTracksByField(tracks, 'genre');
    expect(byGenre.map((g) => g.title)).toEqual(['Pop', 'Rock']);
  });

  test('LibraryHealthService detects duplicates and missing artwork tracks', () => {
    const dups = LibraryHealthService.findDuplicateTracks(tracks);
    expect(dups.length).toBe(1);
    expect(dups[0].tracks.length).toBe(2);

    const noArt = LibraryHealthService.findTracksWithoutArtwork(tracks);
    expect(noArt.map((t) => t.id)).toEqual(['t1', 't3']);
  });

  test('LibraryHealthService.findMissingLocalFiles detects removed files', async () => {
    const withMissing: Track[] = [
      ...tracks,
      {
        id: 't_miss',
        title: 'Deleted Track',
        duration: 120000,
        uri: 'file:///missing_file.mp3',
        dateAdded: 4000,
        playCount: 0,
        isFavorite: false,
        sourceType: 'local',
      },
    ];

    const missing = await LibraryHealthService.findMissingLocalFiles(withMissing);
    expect(missing.map((t) => t.id)).toEqual(['t_miss']);
  });

  test('evaluateSmartPlaylist handles favorites, most_played and unplayed', () => {
    expect(evaluateSmartPlaylist('favorites', tracks).map((t) => t.id)).toEqual(['t1']);
    expect(evaluateSmartPlaylist('most_played', tracks).map((t) => t.id)).toEqual(['t1', 't3']);
    expect(evaluateSmartPlaylist('unplayed', tracks).map((t) => t.id)).toEqual(['t2']);
  });
});
