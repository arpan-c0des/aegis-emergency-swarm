import type { NextApiRequest, NextApiResponse } from 'next';

interface EvacuationPayload {
  police?: number;
  fire?: number;
  ambulance?: number;
  service?: 'police' | 'fire' | 'ambulance';
  delta?: number;
  updatedBy?: string;
}

let serverEvacuationState = {
  police: 46,
  fire: 54,
  ambulance: 42,
  total: 142,
  lastUpdatedBy: 'C2 Central Dispatch',
  updatedAt: new Date().toISOString()
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'GET') {
    return res.status(200).json(serverEvacuationState);
  }

  if (req.method === 'POST') {
    const body: EvacuationPayload = req.body || {};
    
    if (body.service && typeof body.delta === 'number') {
      const s = body.service;
      serverEvacuationState[s] = Math.max(0, serverEvacuationState[s] + body.delta);
    } else {
      if (typeof body.police === 'number') serverEvacuationState.police = Math.max(0, body.police);
      if (typeof body.fire === 'number') serverEvacuationState.fire = Math.max(0, body.fire);
      if (typeof body.ambulance === 'number') serverEvacuationState.ambulance = Math.max(0, body.ambulance);
    }

    serverEvacuationState.total = 
      serverEvacuationState.police + serverEvacuationState.fire + serverEvacuationState.ambulance;
    serverEvacuationState.lastUpdatedBy = body.updatedBy || 'Field Personnel';
    serverEvacuationState.updatedAt = new Date().toISOString();

    return res.status(200).json({
      status: 'success',
      data: serverEvacuationState
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
