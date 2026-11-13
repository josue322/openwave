import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isChecking: boolean;
  lastCheckedAt: number | null;
}

/**
 * Checks real HTTPS Internet reachability cleanly using AbortController without
 * requiring native NetInfo modules unavailable inside Expo Go.
 */
export async function checkInternetReachability(timeoutMs: number = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://archive.org/services/search/v1/scrape?q=mediatype:audio&count=1', {
      method: 'HEAD',
      signal: controller.signal,
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isChecking: true,
    lastCheckedAt: null,
  });

  const refresh = useCallback(async () => {
    setStatus((prev) => ({ ...prev, isChecking: true }));
    const reachable = await checkInternetReachability();
    setStatus({
      isConnected: reachable,
      isChecking: false,
      lastCheckedAt: Date.now(),
    });
    return reachable;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...status, refresh };
}

