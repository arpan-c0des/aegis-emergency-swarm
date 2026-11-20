import { useState, useEffect, useCallback } from 'react';

export const H1_TOTAL_BEDS = 37;
export const H2_TOTAL_BEDS = 29;
export const H1_DEFAULT_AVAILABLE = 28;
export const H2_DEFAULT_AVAILABLE = 12;

const STORAGE_KEY = 'aegis_hospital_beds_v1';
const UPDATE_EVENT = 'aegis_hospital_beds_updated';

export interface HospitalBedState {
  H1: number;
  H2: number;
  updatedAt: string;
}

// Module-level guard: tracks when a user made a manual edit on this client.
// Any background poll that arrives within 4 seconds of a manual edit is rejected,
// preventing stale remote responses from overwriting user typing or adjustments.
let lastLocalEditTimestamp = 0;
let pushTimeout: any = null;

export function getStoredHospitalBeds(): HospitalBedState {
  if (typeof window === 'undefined') {
    return { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: '2026-11-17T00:00:00.000Z' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: '2026-11-17T00:00:00.000Z' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      H1: typeof parsed.H1 === 'number' ? Math.max(0, Math.min(H1_TOTAL_BEDS, parsed.H1)) : H1_DEFAULT_AVAILABLE,
      H2: typeof parsed.H2 === 'number' ? Math.max(0, Math.min(H2_TOTAL_BEDS, parsed.H2)) : H2_DEFAULT_AVAILABLE,
      updatedAt: parsed.updatedAt || '2026-11-17T00:00:00.000Z'
    };
  } catch (e) {
    return { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: '2026-11-17T00:00:00.000Z' };
  }
}

/**
 * Asynchronously push updated bed counts to the central server so all devices update live
 */
export async function pushHospitalBedsToServer(h1: number, h2: number): Promise<void> {
  try {
    await fetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ H1: h1, H2: h2 })
    });
  } catch (err) {
    console.warn('[Hospital Beds] Failed to push to central server:', err);
  }
}

/**
 * Fetch latest global hospital bed counts from the central server
 */
export async function fetchHospitalBedsFromServer(): Promise<HospitalBedState | null> {
  // If user performed a manual edit in the last 4 seconds, ignore server polling to prevent jitter
  if (Date.now() - lastLocalEditTimestamp < 4000) {
    return getStoredHospitalBeds();
  }

  try {
    const res = await fetch('/api/hospitals', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.H1 === 'number') {
      const current = getStoredHospitalBeds();
      const nextH1 = Math.max(0, Math.min(H1_TOTAL_BEDS, data.H1));
      const nextH2 = Math.max(0, Math.min(H2_TOTAL_BEDS, typeof data.H2 === 'number' ? data.H2 : current.H2));

      // Guard against stale responses: only accept remote if remote updatedAt is >= local updatedAt
      const localTime = new Date(current.updatedAt).getTime() || 0;
      const remoteTime = data.updatedAt ? (new Date(data.updatedAt).getTime() || 0) : 0;

      if (remoteTime < localTime) {
        return current;
      }

      if (nextH1 !== current.H1 || nextH2 !== current.H2) {
        if (typeof window !== 'undefined') {
          const updatedState: HospitalBedState = {
            H1: nextH1,
            H2: nextH2,
            updatedAt: data.updatedAt || new Date().toISOString()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: updatedState }));
        }
      }
      return { H1: nextH1, H2: nextH2, updatedAt: data.updatedAt || new Date().toISOString() };
    }
  } catch (_) {}
  return null;
}

export function saveHospitalBeds(h1: number, h2: number): void {
  if (typeof window === 'undefined') return;
  try {
    lastLocalEditTimestamp = Date.now();
    const state: HospitalBedState = {
      H1: Math.max(0, Math.min(H1_TOTAL_BEDS, h1)),
      H2: Math.max(0, Math.min(H2_TOTAL_BEDS, h2)),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: state }));

    // Debounce server pushes by 150ms to bundle rapid keystrokes or clicks
    if (pushTimeout) clearTimeout(pushTimeout);
    pushTimeout = setTimeout(() => {
      pushHospitalBedsToServer(state.H1, state.H2).catch(() => {});
    }, 150);
  } catch (e) {
    console.error('Failed to persist hospital beds:', e);
  }
}

/**
 * React hook that connects components to the real-time hospital bed tracking system.
 * Hospital bed counts are strictly managed by human user input (no automatic fluctuations).
 */
export function useHospitalBeds(_optionalLegacyWorldState?: any, pollIntervalMs: number = 3000) {
  const [h1Beds, setH1Beds] = useState<number>(H1_DEFAULT_AVAILABLE);
  const [h2Beds, setH2Beds] = useState<number>(H2_DEFAULT_AVAILABLE);

  // Synchronize on mount and poll continuously from central server
  useEffect(() => {
    // 1. Initial read from local cache
    const stored = getStoredHospitalBeds();
    setH1Beds(stored.H1);
    setH2Beds(stored.H2);

    // Initial fetch from central server
    fetchHospitalBedsFromServer().then((srv) => {
      if (srv) {
        setH1Beds(srv.H1);
        setH2Beds(srv.H2);
      }
    });

    // 2. Active multi-device polling (respects local edit grace period)
    const interval = setInterval(() => {
      fetchHospitalBedsFromServer().then((srv) => {
        if (srv) {
          setH1Beds(srv.H1);
          setH2Beds(srv.H2);
        }
      });
    }, pollIntervalMs);

    // Instant refresh when browser tab regains focus or reconnects
    const handleFocus = () => {
      fetchHospitalBedsFromServer().then((srv) => {
        if (srv) {
          setH1Beds(srv.H1);
          setH2Beds(srv.H2);
        }
      });
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    // 3. Listen for same-tab CustomEvents
    const handleCustomUpdate = (e: any) => {
      if (e.detail) {
        if (typeof e.detail.H1 === 'number') setH1Beds(e.detail.H1);
        if (typeof e.detail.H2 === 'number') setH2Beds(e.detail.H2);
      }
    };

    // 4. Listen for cross-tab storage events
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed.H1 === 'number') setH1Beds(parsed.H1);
          if (typeof parsed.H2 === 'number') setH2Beds(parsed.H2);
        } catch (_) {}
      }
    };

    window.addEventListener(UPDATE_EVENT, handleCustomUpdate);
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      window.removeEventListener(UPDATE_EVENT, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, [pollIntervalMs]);

  // Note: Simulation world state auto-overwrite has been removed.
  // Beds only change when a person manually adds, subtracts, or edits the number.

  const updateBeds = useCallback((h1: number, h2: number) => {
    setH1Beds(h1);
    setH2Beds(h2);
    saveHospitalBeds(h1, h2);
  }, []);

  const updateH1 = useCallback((beds: number) => {
    setH1Beds(beds);
    const stored = getStoredHospitalBeds();
    saveHospitalBeds(beds, stored.H2);
  }, []);

  const updateH2 = useCallback((beds: number) => {
    setH2Beds(beds);
    const stored = getStoredHospitalBeds();
    saveHospitalBeds(stored.H1, beds);
  }, []);

  const h1Pct = Math.round((h1Beds / H1_TOTAL_BEDS) * 100);
  const h2Pct = Math.round((h2Beds / H2_TOTAL_BEDS) * 100);

  return {
    h1Beds,
    h2Beds,
    h1Total: H1_TOTAL_BEDS,
    h2Total: H2_TOTAL_BEDS,
    h1Pct,
    h2Pct,
    updateBeds,
    updateH1,
    updateH2
  };
}
