import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface EvacuationTally {
  police: number;
  fire: number;
  ambulance: number;
  total: number;
  lastUpdatedBy: string;
  lastDelta: number;
  updatedAt: string;
}

const DEFAULT_EVACUATION: EvacuationTally = {
  police: 46,
  fire: 54,
  ambulance: 42,
  total: 142,
  lastUpdatedBy: 'C2 Central Dispatch',
  lastDelta: 0,
  updatedAt: '2026-11-17T00:00:00.000Z'
};

const CLOUD_EVAC_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1f7de1c6b001f';
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');
const CACHE_FILE = path.join(os.tmpdir(), 'aegis_evacuation_state.json');
const CONFIG_EVAC_PATH = path.join(process.cwd(), 'config', 'central_evacuation.json');

declare global {
  var __AEGIS_EVACUATION_STATE__: EvacuationTally | undefined;
}

function loadLocalCache(): EvacuationTally {
  if (global.__AEGIS_EVACUATION_STATE__) {
    return global.__AEGIS_EVACUATION_STATE__;
  }
  // 1. Check temporary runtime cache
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.total === 'number') {
        global.__AEGIS_EVACUATION_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (_) {}

  // 2. Check bundled configuration file from deployment
  try {
    if (fs.existsSync(CONFIG_EVAC_PATH)) {
      const data = fs.readFileSync(CONFIG_EVAC_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.total === 'number') {
        global.__AEGIS_EVACUATION_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (_) {}

  global.__AEGIS_EVACUATION_STATE__ = DEFAULT_EVACUATION;
  return DEFAULT_EVACUATION;
}

function saveLocalCache(state: EvacuationTally) {
  global.__AEGIS_EVACUATION_STATE__ = state;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (_) {}
}

async function fetchRemoteBackendEvacuation(): Promise<EvacuationTally | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${BACKEND_URL}/api/evacuation`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.total === 'number') {
      const local = loadLocalCache();
      const localTime = new Date(local.updatedAt).getTime() || 0;
      const remoteTime = new Date(data.updatedAt).getTime() || 0;
      if (remoteTime >= localTime) {
        saveLocalCache(data);
        return data;
      }
    }
  } catch (_) {}
  return null;
}

async function fetchCloudEvacuation(): Promise<EvacuationTally | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(CLOUD_EVAC_URL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'Mozilla/5.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data;
    if (data && typeof data.total === 'number') {
      saveLocalCache(data);
      return data;
    }
  } catch (_) {}
  return null;
}

async function saveCloudEvacuation(state: EvacuationTally): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    await fetch(CLOUD_EVAC_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({
        name: 'aegis_central_evacuation',
        data: state
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (_) {}
}

async function forwardToRender(payload: any): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    await fetch(`${BACKEND_URL}/api/evacuation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (_) {}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  let currentState = loadLocalCache();

  // Prefer remote Render backend as authoritative multi-device master
  const remote = await fetchRemoteBackendEvacuation();
  if (remote) {
    currentState = remote;
  } else {
    const cloud = await fetchCloudEvacuation();
    if (cloud) currentState = cloud;
  }

  if (req.method === 'GET') {
    return res.status(200).json(currentState);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const service = body.service;
    const count = body.count;
    const delta = body.delta;
    const updatedBy = body.updatedBy || 'Field Personnel';

    let police = currentState.police;
    let fire = currentState.fire;
    let ambulance = currentState.ambulance;

    if (service === 'police') {
      if (typeof count === 'number') police = Math.max(0, count);
      else if (typeof delta === 'number') police = Math.max(0, police + delta);
    } else if (service === 'fire') {
      if (typeof count === 'number') fire = Math.max(0, count);
      else if (typeof delta === 'number') fire = Math.max(0, fire + delta);
    } else if (service === 'ambulance') {
      if (typeof count === 'number') ambulance = Math.max(0, count);
      else if (typeof delta === 'number') ambulance = Math.max(0, ambulance + delta);
    } else {
      if (typeof body.police === 'number') police = Math.max(0, body.police);
      if (typeof body.fire === 'number') fire = Math.max(0, body.fire);
      if (typeof body.ambulance === 'number') ambulance = Math.max(0, body.ambulance);
    }

    const total = police + fire + ambulance;
    const nextState: EvacuationTally = {
      police,
      fire,
      ambulance,
      total,
      lastUpdatedBy: updatedBy,
      lastDelta: typeof delta === 'number' ? delta : 0,
      updatedAt: new Date().toISOString()
    };

    saveLocalCache(nextState);
    await saveCloudEvacuation(nextState);
    forwardToRender(body).catch(() => {});

    return res.status(200).json({
      status: 'success',
      data: nextState
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
