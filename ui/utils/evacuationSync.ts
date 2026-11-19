import { useState, useEffect, useCallback } from 'react';

export type EvacuationServiceType = 'police' | 'fire' | 'ambulance';

export interface EvacuationTallyState {
  police: number;
  fire: number;
  ambulance: number;
  total: number;
  lastUpdatedBy: string;
  lastDelta: number;
  updatedAt: string;
}

// Initial calibrated baseline (Police: 46 + Fire: 54 + Ambulance: 42 = 142 total civilians evacuated)
export const DEFAULT_EVACUATION_STATE: EvacuationTallyState = {
  police: 46,
  fire: 54,
  ambulance: 42,
  total: 142,
  lastUpdatedBy: 'C2 Central Dispatch',
  lastDelta: 0,
  updatedAt: new Date().toISOString()
};

const STORAGE_KEY = 'aegis_civilians_evacuated_tally_v1';
const UPDATE_EVENT = 'aegis_evacuation_tally_updated';

export function getStoredEvacuationState(): EvacuationTallyState {
  if (typeof window === 'undefined') {
    return DEFAULT_EVACUATION_STATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_EVACUATION_STATE));
      return DEFAULT_EVACUATION_STATE;
    }
    const parsed = JSON.parse(raw);
    const police = typeof parsed.police === 'number' ? Math.max(0, parsed.police) : DEFAULT_EVACUATION_STATE.police;
    const fire = typeof parsed.fire === 'number' ? Math.max(0, parsed.fire) : DEFAULT_EVACUATION_STATE.fire;
    const ambulance = typeof parsed.ambulance === 'number' ? Math.max(0, parsed.ambulance) : DEFAULT_EVACUATION_STATE.ambulance;
    const total = police + fire + ambulance;

    return {
      police,
      fire,
      ambulance,
      total,
      lastUpdatedBy: parsed.lastUpdatedBy || DEFAULT_EVACUATION_STATE.lastUpdatedBy,
      lastDelta: parsed.lastDelta || 0,
      updatedAt: parsed.updatedAt || new Date().toISOString()
    };
  } catch (e) {
    return DEFAULT_EVACUATION_STATE;
  }
}

export function saveEvacuationState(
  updates: Partial<Record<EvacuationServiceType, number>>,
  updatedBy: string = 'Field Personnel',
  delta: number = 0
): EvacuationTallyState {
  if (typeof window === 'undefined') return DEFAULT_EVACUATION_STATE;
  try {
    const current = getStoredEvacuationState();
    const police = updates.police !== undefined ? Math.max(0, updates.police) : current.police;
    const fire = updates.fire !== undefined ? Math.max(0, updates.fire) : current.fire;
    const ambulance = updates.ambulance !== undefined ? Math.max(0, updates.ambulance) : current.ambulance;
    const total = police + fire + ambulance;

    const newState: EvacuationTallyState = {
      police,
      fire,
      ambulance,
      total,
      lastUpdatedBy: updatedBy,
      lastDelta: delta,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: newState }));
    return newState;
  } catch (e) {
    console.error('Failed to persist evacuation state:', e);
    return DEFAULT_EVACUATION_STATE;
  }
}

export function updateServiceEvacuation(
  service: EvacuationServiceType,
  count: number,
  updatedBy: string = `${service.toUpperCase()} Field Crew`
): EvacuationTallyState {
  const current = getStoredEvacuationState();
  const delta = count - current[service];
  return saveEvacuationState({ [service]: Math.max(0, count) }, updatedBy, delta);
}

export function incrementServiceEvacuation(
  service: EvacuationServiceType,
  delta: number,
  updatedBy: string = `${service.toUpperCase()} Field Crew`
): EvacuationTallyState {
  const current = getStoredEvacuationState();
  const nextCount = Math.max(0, current[service] + delta);
  return saveEvacuationState({ [service]: nextCount }, updatedBy, delta);
}

/**
 * React hook that connects components to the real-time evacuation tracking system.
 * Updates dynamically across windows and tabs when drivers log evacuations.
 */
export function useEvacuationSync() {
  const [evacuationState, setEvacuationState] = useState<EvacuationTallyState>(DEFAULT_EVACUATION_STATE);

  useEffect(() => {
    // 1. Initial read from persistent store
    const stored = getStoredEvacuationState();
    setEvacuationState(stored);

    // 2. Listen to same-tab CustomEvents
    const handleCustomUpdate = (e: any) => {
      if (e.detail && typeof e.detail.total === 'number') {
        setEvacuationState(e.detail);
      }
    };

    // 3. Listen to cross-tab storage events
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const police = typeof parsed.police === 'number' ? parsed.police : DEFAULT_EVACUATION_STATE.police;
          const fire = typeof parsed.fire === 'number' ? parsed.fire : DEFAULT_EVACUATION_STATE.fire;
          const ambulance = typeof parsed.ambulance === 'number' ? parsed.ambulance : DEFAULT_EVACUATION_STATE.ambulance;
          setEvacuationState({
            police,
            fire,
            ambulance,
            total: police + fire + ambulance,
            lastUpdatedBy: parsed.lastUpdatedBy || 'Field Personnel',
            lastDelta: parsed.lastDelta || 0,
            updatedAt: parsed.updatedAt || new Date().toISOString()
          });
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

  const incrementCount = useCallback((service: EvacuationServiceType, delta: number, updatedBy?: string) => {
    const updated = incrementServiceEvacuation(service, delta, updatedBy);
    setEvacuationState(updated);
    return updated;
  }, []);

  const updateCount = useCallback((service: EvacuationServiceType, count: number, updatedBy?: string) => {
    const updated = updateServiceEvacuation(service, count, updatedBy);
    setEvacuationState(updated);
    return updated;
  }, []);

  return {
    evacuationState,
    totalEvacuated: evacuationState.total,
    policeEvacuated: evacuationState.police,
    fireEvacuated: evacuationState.fire,
    ambulanceEvacuated: evacuationState.ambulance,
    incrementCount,
    updateCount
  };
}
