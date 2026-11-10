import { usePlayerStore } from '../src/store/player-store';
import { Track } from '../src/domain/entities/track';

describe('usePlayerStore', () => {
  const mockTrack1: Track = {
    id: '1',
    title: 'Track One',
    duration: 180000,
    uri: 'file:///track1.mp3',
    dateAdded: Date.now(),
    playCount: 0,
    isFavorite: false,
    sourceType: 'local',
  };

  const mockTrack2: Track = {
    id: '2',
    title: 'Track Two',
    duration: 200000,
    uri: 'file:///track2.mp3',
    dateAdded: Date.now(),
    playCount: 0,
    isFavorite: false,
    sourceType: 'local',
  };

  beforeEach(() => {
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      queue: [],
      queueIndex: -1,
      shuffle: false,
      repeatMode: 'off',
    });
  });

  test('setQueue correctly loads tracks and selects starting track', () => {
    usePlayerStore.getState().setQueue([mockTrack1, mockTrack2], 0);

    const state = usePlayerStore.getState();
    expect(state.queue.length).toBe(2);
    expect(state.currentTrack?.id).toBe('1');
    expect(state.queueIndex).toBe(0);
    expect(state.durationMs).toBe(180000);
  });

  test('togglePlayPause flips playback state when track is present', () => {
    usePlayerStore.getState().setQueue([mockTrack1], 0);
    expect(usePlayerStore.getState().isPlaying).toBe(false);

    usePlayerStore.getState().togglePlayPause();
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().togglePlayPause();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  test('skipNext advances to next track in queue', () => {
    usePlayerStore.getState().setQueue([mockTrack1, mockTrack2], 0);
    usePlayerStore.getState().skipNext();

    const state = usePlayerStore.getState();
    expect(state.queueIndex).toBe(1);
    expect(state.currentTrack?.id).toBe('2');
    expect(state.isPlaying).toBe(true);
  });

  test('cycleRepeatMode cycles through off -> all -> one -> off', () => {
    const store = usePlayerStore.getState();
    expect(store.repeatMode).toBe('off');

    store.cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('all');

    store.cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('one');

    store.cycleRepeatMode();
    expect(usePlayerStore.getState().repeatMode).toBe('off');
  });
});

