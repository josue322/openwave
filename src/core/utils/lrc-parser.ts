export interface LrcLine {
  timeMs: number | null; // null when plain unsynced lyrics
  text: string;
}

const TIMESTAMP_REGEX = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g;

/**
 * Parses synced .lrc text or plain text lyrics into timestamped lines.
 */
export function parseLrc(rawLyrics: string): LrcLine[] {
  if (!rawLyrics || !rawLyrics.trim()) return [];

  const rawLines = rawLyrics.split(/\r?\n/);
  const parsed: LrcLine[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Ignore LRC metadata tags like [ar:Artist] or [ti:Title]
    if (/^\[(ar|ti|al|by|offset|re|ve):/i.test(trimmed)) {
      continue;
    }

    const matches = [...trimmed.matchAll(TIMESTAMP_REGEX)];
    if (matches.length === 0) {
      parsed.push({ timeMs: null, text: trimmed });
      continue;
    }

    const cleanText = trimmed.replace(TIMESTAMP_REGEX, '').trim() || '♪';
    for (const m of matches) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      const fractionRaw = m[3] || '0';
      const millis =
        fractionRaw.length === 3
          ? parseInt(fractionRaw, 10)
          : fractionRaw.length === 2
          ? parseInt(fractionRaw, 10) * 10
          : parseInt(fractionRaw, 10) * 100;

      const timeMs = minutes * 60_000 + seconds * 1000 + millis;
      parsed.push({ timeMs, text: cleanText });
    }
  }

  // Keep synced lines chronologically sorted
  return parsed.sort((a, b) => {
    if (a.timeMs === null && b.timeMs === null) return 0;
    if (a.timeMs === null) return 1;
    if (b.timeMs === null) return -1;
    return a.timeMs - b.timeMs;
  });
}

/**
 * Finds the currently active lyric line index matching positionMs.
 */
export function getActiveLyricIndex(lines: LrcLine[], positionMs: number): number {
  let activeIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].timeMs;
    if (t !== null && t <= positionMs + 150) {
      activeIndex = i;
    } else if (t !== null && t > positionMs + 150) {
      break;
    }
  }
  return activeIndex;
}

