import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface HospitalBedState {
  H1: number;
  H2: number;
  updatedAt: string;
}

const DEFAULT_BEDS: HospitalBedState = {
  H1: 28,
  H2: 12,
  updatedAt: '2026-11-17T00:00:00.000Z'
};

const CLOUD_HOSP_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1f7de2e890020';
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');
const CACHE_FILE = path.join(os.tmpdir(), 'aegis_hospital_beds_state.json');

declare global {
  var __AEGIS_HOSPITAL_BEDS_STATE__: HospitalBedState | undefined;
}

function loadLocalCache(): HospitalBedState {
  if (global.__AEGIS_HOSPITAL_BEDS_STATE__) {
    return global.__AEGIS_HOSPITAL_BEDS_STATE__;
  }
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed.H1 === 'number') {
        global.__AEGIS_HOSPITAL_BEDS_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  global.__AEGIS_HOSPITAL_BEDS_STATE__ = DEFAULT_BEDS;
  return DEFAULT_BEDS;
}

function saveLocalCache(state: HospitalBedState) {
  global.__AEGIS_HOSPITAL_BEDS_STATE__ = state;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (_) {}
}

async function fetchCloudBeds(): Promise<HospitalBedState | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(CLOUD_HOSP_URL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data;
    if (data && typeof data.H1 === 'number') {
      const state: HospitalBedState = {
        H1: data.H1,
        H2: typeof data.H2 === 'number' ? data.H2 : 12,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      saveLocalCache(state);
      return state;
    }
  } catch (_) {}
  return null;
}

async function saveCloudBeds(state: HospitalBedState): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    await fetch(CLOUD_HOSP_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'aegis_hospital_beds',
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
    await fetch(`${BACKEND_URL}/api/hospitals/update`, {
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
  const cloud = await fetchCloudBeds();
  if (cloud) {
    const localTime = new Date(currentState.updatedAt).getTime() || 0;
    const cloudTime = new Date(cloud.updatedAt).getTime() || 0;
    if (cloudTime >= localTime) {
      currentState = cloud;
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json(currentState);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    let nextH1 = currentState.H1;
    let nextH2 = currentState.H2;

    if (body.hospital_id === 'H1' && typeof body.available_beds === 'number') {
      nextH1 = Math.max(0, Math.min(37, body.available_beds));
    } else if (body.hospital_id === 'H2' && typeof body.available_beds === 'number') {
      nextH2 = Math.max(0, Math.min(29, body.available_beds));
    } else {
      if (typeof body.H1 === 'number') nextH1 = Math.max(0, Math.min(37, body.H1));
      if (typeof body.H2 === 'number') nextH2 = Math.max(0, Math.min(29, body.H2));
    }

    const nextState: HospitalBedState = {
      H1: nextH1,
      H2: nextH2,
      updatedAt: new Date().toISOString()
    };

    saveLocalCache(nextState);
    await saveCloudBeds(nextState);

    if (body.hospital_id && typeof body.available_beds === 'number') {
      forwardToRender(body).catch(() => {});
    } else {
      forwardToRender({ hospital_id: 'H1', available_beds: nextH1 }).catch(() => {});
      forwardToRender({ hospital_id: 'H2', available_beds: nextH2 }).catch(() => {});
    }

    return res.status(200).json({
      status: 'success',
      ...nextState
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
