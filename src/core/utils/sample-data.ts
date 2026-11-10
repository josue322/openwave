import { Track } from '../../domain/entities/track';
import { TrackDao } from '../../data/local/track-dao';
import { useLibraryStore } from '../../store/library-store';

export const DEMO_TRACKS: Track[] = [
  {
    id: 'demo_1',
    title: 'Acoustic Breeze',
    artistName: 'Benjamin Tissot',
    albumTitle: 'OpenWave Acoustic Sessions',
    duration: 157000,
    uri: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
    artworkUri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    genre: 'Folk / Acoustic',
    year: 2024,
    dateAdded: Date.now(),
    playCount: 12,
    isFavorite: true,
    sourceType: 'stream',
  },
  {
    id: 'demo_2',
    title: 'Sunny Melody',
    artistName: 'Benjamin Tissot',
    albumTitle: 'OpenWave Summer Chill',
    duration: 140000,
    uri: 'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
    artworkUri: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80',
    genre: 'Acoustic Pop',
    year: 2024,
    dateAdded: Date.now() - 86400000,
    playCount: 8,
    isFavorite: false,
    sourceType: 'stream',
  },
  {
    id: 'demo_3',
    title: 'Pure Energy',
    artistName: 'Benjamin Tissot',
    albumTitle: 'OpenWave Rock Horizon',
    duration: 179000,
    uri: 'https://www.bensound.com/bensound-music/bensound-energy.mp3',
    artworkUri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80',
    genre: 'Alternative Rock',
    year: 2023,
    dateAdded: Date.now() - 172800000,
    playCount: 15,
    isFavorite: true,
    sourceType: 'stream',
  },
];

export async function loadDemoTracksIntoLibrary(): Promise<Track[]> {
  const trackDao = new TrackDao();
  await trackDao.insertBatch(DEMO_TRACKS);
  const allTracks = await trackDao.getAllTracks();
  const favorites = await trackDao.getFavorites();

  useLibraryStore.getState().setTracks(allTracks);
  useLibraryStore.getState().setFavorites(favorites);

  return allTracks;
}
