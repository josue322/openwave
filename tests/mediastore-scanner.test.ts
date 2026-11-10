jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getAssetsAsync: jest.fn().mockResolvedValue({
    assets: [],
    hasNextPage: false,
    endCursor: undefined,
    totalCount: 0,
  }),
  SortBy: { creationTime: 'creationTime' },
}));

import { MediaStoreScanner } from '../src/data/local/scanner/mediastore-scanner';

describe('MediaStoreScanner', () => {
  let scanner: MediaStoreScanner;

  beforeEach(() => {
    scanner = new MediaStoreScanner();
  });

  test('cleanFileName removes track numbers and file extensions', () => {
    const clean = (scanner as any).cleanFileName('01 - Bohemian Rhapsody.flac');
    expect(clean).toBe('Bohemian Rhapsody');
  });

  test('cleanFileName handles plain filenames without leading numbers', () => {
    const clean = (scanner as any).cleanFileName('Hotel California.mp3');
    expect(clean).toBe('Hotel California');
  });

  test('guessMimeType correctly detects common audio formats', () => {
    const guess = (scanner as any).guessMimeType;
    expect(guess('song.mp3')).toBe('audio/mpeg');
    expect(guess('song.flac')).toBe('audio/flac');
    expect(guess('song.wav')).toBe('audio/wav');
    expect(guess('song.m4a')).toBe('audio/mp4');
    expect(guess('song.opus')).toBe('audio/opus');
    expect(guess('unknown.xyz')).toBe('audio/*');
  });
});
