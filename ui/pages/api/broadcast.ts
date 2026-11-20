import type { NextApiRequest, NextApiResponse } from 'next';

export interface TacticalBroadcastPayload {
  id: string;
  full: string;
  police: string;
  fire: string;
  ambulance: string;
  timestamp: string;
}

const DEFAULT_BROADCAST: TacticalBroadcastPayload = {
  id: 'genesis',
  full: 'All emergency response units standing by. Incident Commander monitoring city sectors.',
  police: 'Attention Police Interceptor POL-02: Standing by on patrol.',
  fire: 'Attention Fire Engine FIRE-03: Standing by at station depot.',
  ambulance: 'Attention Ambulance AMB-07: Standing by for trauma triage calls.',
  timestamp: '2026-11-20T14:40:00.000Z'
};

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');

declare global {
  var __AEGIS_LATEST_BROADCAST__: TacticalBroadcastPayload | undefined;
}

async function forwardToRender(payload: TacticalBroadcastPayload): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    await fetch(`${BACKEND_URL}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (_) {}
}

async function fetchFromRender(): Promise<TacticalBroadcastPayload | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${BACKEND_URL}/api/broadcast/latest`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.id) return data;
  } catch (_) {}
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'GET') {
    if (global.__AEGIS_LATEST_BROADCAST__) {
      return res.status(200).json(global.__AEGIS_LATEST_BROADCAST__);
    }
    const remote = await fetchFromRender();
    if (remote) {
      global.__AEGIS_LATEST_BROADCAST__ = remote;
      return res.status(200).json(remote);
    }
    return res.status(200).json(DEFAULT_BROADCAST);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const bId = body.id || `bc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const broadcast: TacticalBroadcastPayload = {
      id: bId,
      full: body.full || body.broadcast_summary || 'Attention all units: Incident Commander broadcast.',
      police: body.police || 'Attention Police Interceptor POL-02: Maintain traffic cordon and secure incident perimeter.',
      fire: body.fire || 'Attention Fire Engine FIRE-03: Proceed for structural suppression and hazard containment.',
      ambulance: body.ambulance || 'Attention Ambulance AMB-07: Proceed for casualty triage and transport.',
      timestamp: body.timestamp || new Date().toISOString()
    };

    global.__AEGIS_LATEST_BROADCAST__ = broadcast;

    // Asynchronously forward to Render for real-time WebSocket distribution
    forwardToRender(broadcast).catch(() => {});

    return res.status(200).json({
      status: 'broadcast_published',
      data: broadcast
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
