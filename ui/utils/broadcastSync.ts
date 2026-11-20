import { useEffect, useRef, useCallback } from 'react';

export interface TacticalBroadcastPayload {
  id: string;
  full: string;
  police: string;
  fire: string;
  ambulance: string;
  timestamp: string;
}

const BROADCAST_STORAGE_KEY = 'aegis_last_broadcast_v1';
const BROADCAST_CHANNEL_NAME = 'aegis_tactical_broadcast_channel';

/**
 * Generate role-specific broadcast messages from incident details
 */
export function buildTacticalBroadcast(
  fullText: string,
  sector: string = 'Sector_6B',
  hazard: string = 'Collision',
  severity: string = 'Critical',
  casualties: number = 6,
  blocked: boolean = false
): TacticalBroadcastPayload {
  const secName = sector.replace('_', ' ');
  const id = `bc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();

  // Role-specific tailored guidelines
  const police = blocked
    ? `Attention Police Interceptor POL-02: Emergency dispatch order for ${secName}. Establish traffic cordon and secure incident perimeter. Divert civilian traffic away from blocked Corridor D4 onto Red Road and keep emergency arterial lanes open for fire and ambulances. Acknowledge and proceed.`
    : `Attention Police Interceptor POL-02: Emergency dispatch order for ${secName}. Proceed immediately to secure incident perimeter. Establish traffic isolation around ${secName} and maintain rapid transit corridors for incoming fire engines and ambulances. Acknowledge and proceed.`;

  const fire = blocked
    ? `Attention Fire Engine FIRE-03: Heavy hazard suppression order for ${secName}. Confirmed ${severity} priority ${hazard}. Corridor D4 is impassable due to debris; navigate via alternate Corridor B. Deploy primary foam monitors, isolate fuel feeds, and initiate cooling. Acknowledge and proceed.`
    : `Attention Fire Engine FIRE-03: Heavy hazard suppression order for ${secName}. Confirmed ${severity} priority ${hazard}. Advance directly to the hazard core, connect hydrants, and establish suppression perimeter. Acknowledge and proceed.`;

  const ambulance = `Attention Ambulance AMB-07: Medical triage dispatch order for ${secName}. Confirmed ${casualties} casualties reported. Proceed immediately for casualty stabilization and establish on-scene triage bay. Coordinate priority trauma admissions directly with SSKM Hospital H1. Acknowledge and proceed.`;

  return {
    id,
    full: fullText,
    police,
    fire,
    ambulance,
    timestamp
  };
}

/**
 * Publish a broadcast from Commander to the central server and all connected drivers
 */
export async function pushTacticalBroadcast(payload: TacticalBroadcastPayload): Promise<void> {
  // 1. Broadcast locally across same-origin tabs immediately
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BROADCAST_STORAGE_KEY, JSON.stringify(payload));
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.postMessage(payload);
        bc.close();
      }
    } catch (_) {}
  }

  // 2. Push to server for cross-device distribution (Render WebSocket + Next.js API)
  try {
    await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('[BroadcastSync] Server push failed:', err);
  }
}

/**
 * React hook for Driver and Fleet cockpits to automatically receive and speak broadcasts
 */
export function useTacticalBroadcast(
  onBroadcastReceived?: (broadcast: TacticalBroadcastPayload) => void
) {
  const lastPlayedIdRef = useRef<string>('');
  const callbackRef = useRef(onBroadcastReceived);
  callbackRef.current = onBroadcastReceived;

  const handleBroadcast = useCallback((b: TacticalBroadcastPayload) => {
    if (!b || !b.id || b.id === 'genesis') return;
    if (lastPlayedIdRef.current === b.id) return;
    lastPlayedIdRef.current = b.id;

    if (callbackRef.current) {
      callbackRef.current(b);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Listen for same-device cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        bc.onmessage = (event) => {
          if (event.data) handleBroadcast(event.data);
        };
      } catch (_) {}
    }

    // 2. Connect to Render WebSocket for instant multi-device live streaming
    const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');
    const wsProto = BACKEND_URL.startsWith('https') ? 'wss:' : 'ws:';
    const wsHost = BACKEND_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProto}//${wsHost}/ws`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'TACTICAL_AUDIO_BROADCAST' && msg.data) {
            handleBroadcast(msg.data);
          } else if (msg.type === 'SIMULATION_UPDATE' && msg.data?.broadcast_summary) {
            // Also convert simulation updates into broadcast objects if not already wrapped
            const summary = msg.data.broadcast_summary;
            const b = buildTacticalBroadcast(summary);
            handleBroadcast(b);
          }
        } catch (_) {}
      };
    } catch (_) {}

    // 3. Polling fallback (every 2500ms) for maximum multi-device reliability
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/broadcast', { headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id && data.id !== 'genesis') {
            handleBroadcast(data);
          }
        }
      } catch (_) {}
    }, 2500);

    return () => {
      if (bc) bc.close();
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [handleBroadcast]);

  return {
    lastPlayedId: lastPlayedIdRef.current
  };
}
