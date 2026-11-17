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

export function getStoredHospitalBeds(): HospitalBedState {
  if (typeof window === 'undefined') {
    return { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: new Date().toISOString() };
    }
    const parsed = JSON.parse(raw);
    return {
      H1: typeof parsed.H1 === 'number' ? parsed.H1 : H1_DEFAULT_AVAILABLE,
      H2: typeof parsed.H2 === 'number' ? parsed.H2 : H2_DEFAULT_AVAILABLE,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch (e) {
    return { H1: H1_DEFAULT_AVAILABLE, H2: H2_DEFAULT_AVAILABLE, updatedAt: new Date().toISOString() };
  }
}

export function saveHospitalBeds(h1: number, h2: number): void {
  if (typeof window === 'undefined') return;
  try {
    const state: HospitalBedState = {
      H1: Math.max(0, Math.min(H1_TOTAL_BEDS, h1)),
      H2: Math.max(0, Math.min(H2_TOTAL_BEDS, h2)),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: state }));
  } catch (e) {
    console.error('Failed to persist hospital beds:', e);
  }
}

export function useHospitalBeds(initialWorldState?: any) {
  const [h1Beds, setH1Beds] = useState<number>(H1_DEFAULT_AVAILABLE);
  const [h2Beds, setH2Beds] = useState<number>(H2_DEFAULT_AVAILABLE);

  // Synchronize on mount from persistent storage
  useEffect(() => {
    const stored = getStoredHospitalBeds();
    setH1Beds(stored.H1);
    setH2Beds(stored.H2);

    // Listen for cross-page or same-tab bed updates
    const handleCustomUpdate = (e: any) => {
      if (e.detail) {
        if (typeof e.detail.H1 === 'number') setH1Beds(e.detail.H1);
        if (typeof e.detail.H2 === 'number') setH2Beds(e.detail.H2);
      }
    };

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
      window.removeEventListener(UPDATE_EVENT, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // Also synchronize when backend world state arrives
  useEffect(() => {
    if (initialWorldState?.hospitals) {
      const h1Server = initialWorldState.hospitals.H1?.available_beds;
      const h2Server = initialWorldState.hospitals.H2?.available_beds;
      if (typeof h1Server === 'number') setH1Beds(h1Server);
      if (typeof h2Server === 'number') setH2Beds(h2Server);
    }
  }, [initialWorldState?.hospitals]);

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
