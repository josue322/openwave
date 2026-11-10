export type MatchClassification = 'EXACT' | 'PROBABLE' | 'PARTIAL' | 'NOT_FOUND';

export interface MatchResult {
  score: number; // 0.0 to 1.0
  classification: MatchClassification;
}

export class StringMatcher {
  /**
   * Normalizes a string by lowercasing, stripping accents (diacritics),
   * removing tags like (Official Video), [Remastered], feat., etc.
   */
  public static normalize(input: string): string {
    if (!input) return '';

    return input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics / accents
      .replace(/\((official|video|audio|remastered|live|deluxe|version|mono|stereo)[^)]*\)/gi, '')
      .replace(/\[(official|video|audio|remastered|live|deluxe|version|mono|stereo)[^\]]*\]/gi, '')
      .replace(/\b(feat\.|ft\.|featuring)\b.*$/gi, '')
      .replace(/[^a-z0-9\s]/g, ' ') // Strip special punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculates the Levenshtein distance between two strings.
   */
  public static levenshtein(a: string, b: string): number {
    const an = a.length;
    const bn = b.length;
    if (an === 0) return bn;
    if (bn === 0) return an;

    const matrix: number[][] = [];
    for (let i = 0; i <= bn; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= an; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= bn; i++) {
      for (let j = 1; j <= an; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[bn][an];
  }

  /**
   * Returns a similarity ratio between 0.0 (completely different) and 1.0 (identical).
   */
  public static similarity(a: string, b: string): number {
    const normA = this.normalize(a);
    const normB = this.normalize(b);

    if (normA === normB) return 1.0;
    if (normA.length === 0 || normB.length === 0) return 0.0;

    const maxLen = Math.max(normA.length, normB.length);
    const dist = this.levenshtein(normA, normB);
    return Math.max(0, 1.0 - dist / maxLen);
  }

  /**
   * Compares external track metadata with a candidate local track.
   */
  public static compareTracks(
    extTitle: string,
    extArtist?: string | null,
    extDurationMs?: number | null,
    locTitle?: string,
    locArtist?: string | null,
    locDurationMs?: number | null
  ): MatchResult {
    const titleScore = this.similarity(extTitle, locTitle || '');
    let artistScore = 1.0;

    if (extArtist && locArtist) {
      artistScore = this.similarity(extArtist, locArtist);
    }

    // Weighted average: title 65%, artist 35%
    const combinedScore = titleScore * 0.65 + artistScore * 0.35;

    // Check duration tolerance (within 5 seconds)
    const durationMatch =
      extDurationMs && locDurationMs
        ? Math.abs(extDurationMs - locDurationMs) <= 5000
        : true;

    let classification: MatchClassification = 'NOT_FOUND';

    if (combinedScore >= 0.88 && durationMatch) {
      classification = 'EXACT';
    } else if (combinedScore >= 0.72) {
      classification = 'PROBABLE';
    } else if (combinedScore >= 0.50) {
      classification = 'PARTIAL';
    }

    return {
      score: combinedScore,
      classification,
    };
  }
}
