import { StringMatcher } from '../src/core/utils/string-matcher';
import { M3uGenerator } from '../src/integrations/exporter/m3u-generator';
import { SpotifyJsonParser } from '../src/integrations/spotify/spotify-json-parser';
import { TakeoutCsvParser } from '../src/integrations/youtube/takeout-csv-parser';
import { Track } from '../src/domain/entities/track';

describe('StringMatcher (Levenshtein & Classification)', () => {
  test('normalize cleans brackets, accents and common tags', () => {
    const raw = 'Smells Like Teen Spirit (Official Video) [Remastered]';
    const norm = StringMatcher.normalize(raw);
    expect(norm).toBe('smells like teen spirit');
  });

  test('similarity returns 1.0 for matching normalized text', () => {
    const sim = StringMatcher.similarity('Canción de cuna', 'cancion de cuna');
    expect(sim).toBe(1.0);
  });

  test('compareTracks identifies EXACT match with matching duration', () => {
    const match = StringMatcher.compareTracks(
      'Yesterday',
      'The Beatles',
      125000,
      'Yesterday (Remastered 2009)',
      'The Beatles',
      126000 // within 5s
    );

    expect(match.classification).toBe('EXACT');
    expect(match.score).toBeGreaterThanOrEqual(0.88);
  });

  test('compareTracks flags NOT_FOUND for completely different tracks', () => {
    const match = StringMatcher.compareTracks(
      'Thunderstruck',
      'AC/DC',
      300000,
      'Hotel California',
      'Eagles',
      390000
    );

    expect(match.classification).toBe('NOT_FOUND');
    expect(match.score).toBeLessThan(0.50);
  });
});

describe('M3uGenerator', () => {
  const tracks: Track[] = [
    {
      id: '1',
      title: 'Comfortably Numb',
      artistName: 'Pink Floyd',
      duration: 382000,
      uri: 'file:///storage/emulated/0/Music/numb.mp3',
      dateAdded: 0,
      playCount: 0,
      isFavorite: false,
      sourceType: 'local',
    },
  ];

  test('generates valid extended M3U file', () => {
    const m3u = M3uGenerator.generateM3u('Rock Classics', tracks);
    expect(m3u).toContain('#EXTM3U');
    expect(m3u).toContain('#PLAYLIST:Rock Classics');
    expect(m3u).toContain('#EXTINF:382,Pink Floyd - Comfortably Numb');
    expect(m3u).toContain('file:///storage/emulated/0/Music/numb.mp3');
  });

  test('generates structured JSON export', () => {
    const jsonStr = M3uGenerator.generateJson('Rock Classics', 'Mi lista de rock', tracks);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.app).toBe('OpenWave');
    expect(parsed.playlist.name).toBe('Rock Classics');
    expect(parsed.playlist.tracks.length).toBe(1);
    expect(parsed.playlist.tracks[0].title).toBe('Comfortably Numb');
  });
});

describe('Parsers (Spotify & Takeout)', () => {
  test('SpotifyJsonParser parses valid items', () => {
    const mockJson = JSON.stringify([
      {
        trackName: 'Billie Jean',
        artistName: 'Michael Jackson',
        albumName: 'Thriller',
        durationMs: 294000,
      },
    ]);

    const result = SpotifyJsonParser.parse(mockJson);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Billie Jean');
    expect(result[0].artist).toBe('Michael Jackson');
  });

  test('TakeoutCsvParser parses CSV lines correctly', () => {
    const mockCsv = `"Track","Artist","Album"\n"Bohemian Rhapsody","Queen","A Night at the Opera"`;
    const result = TakeoutCsvParser.parseCsv(mockCsv);
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Bohemian Rhapsody');
    expect(result[0].artist).toBe('Queen');
  });
});
