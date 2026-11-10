import { QueueManager } from '../src/playback/queue/queue-manager';
import { Track } from '../src/domain/entities/track';

describe('QueueManager', () => {
  let queueManager: QueueManager;

  const mockTracks: Track[] = [
    { id: '1', title: 'Track 1', duration: 180000, uri: 'file:///t1.mp3', dateAdded: 1, playCount: 0, isFavorite: false, sourceType: 'local' },
    { id: '2', title: 'Track 2', duration: 210000, uri: 'file:///t2.mp3', dateAdded: 2, playCount: 0, isFavorite: false, sourceType: 'local' },
    { id: '3', title: 'Track 3', duration: 240000, uri: 'file:///t3.mp3', dateAdded: 3, playCount: 0, isFavorite: false, sourceType: 'local' },
  ];

  beforeEach(() => {
    queueManager = new QueueManager();
  });

  test('setQueue initializes current track and queue properly', () => {
    const current = queueManager.setQueue(mockTracks, 1);
    expect(current?.id).toBe('2');
    expect(queueManager.getCurrentIndex()).toBe(1);
    expect(queueManager.getQueue().length).toBe(3);
  });

  test('getNextTrack advances through queue and respects repeatMode off', () => {
    queueManager.setQueue(mockTracks, 1);
    const next = queueManager.getNextTrack();
    expect(next?.id).toBe('3');

    // End of queue with repeat off
    const end = queueManager.getNextTrack();
    expect(end).toBeNull();
  });

  test('getNextTrack loops back when repeatMode is all', () => {
    queueManager.setQueue(mockTracks, 2);
    queueManager.setRepeatMode('all');

    const next = queueManager.getNextTrack();
    expect(next?.id).toBe('1');
    expect(queueManager.getCurrentIndex()).toBe(0);
  });

  test('getNextTrack repeats current track when repeatMode is one', () => {
    queueManager.setQueue(mockTracks, 1);
    queueManager.setRepeatMode('one');

    const next = queueManager.getNextTrack();
    expect(next?.id).toBe('2');
    expect(queueManager.getCurrentIndex()).toBe(1);
  });

  test('toggleShuffle retains currently playing track at top of queue', () => {
    queueManager.setQueue(mockTracks, 1); // Track 2 is playing
    queueManager.toggleShuffle();

    expect(queueManager.getIsShuffled()).toBe(true);
    const current = queueManager.getCurrentTrack();
    expect(current?.id).toBe('2');
    expect(queueManager.getCurrentIndex()).toBe(0);

    // Unshuffle restores original order
    queueManager.toggleShuffle();
    expect(queueManager.getIsShuffled()).toBe(false);
    expect(queueManager.getCurrentTrack()?.id).toBe('2');
    expect(queueManager.getCurrentIndex()).toBe(1);
  });

  test('insertNext places track right after currently playing track', () => {
    queueManager.setQueue(mockTracks, 0); // Currently on track 1
    const newTrack: Track = { id: '99', title: 'Enqueued', duration: 100, uri: 'file:///99.mp3', dateAdded: 0, playCount: 0, isFavorite: false, sourceType: 'local' };

    queueManager.insertNext(newTrack);
    const queue = queueManager.getQueue();
    expect(queue[1].id).toBe('99');
  });
});
