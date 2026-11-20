import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

export type UserRole =
  | 'incident_commander'
  | 'fleet_operator'
  | 'hospital_staff'
  | 'driver_police'
  | 'driver_fire'
  | 'driver_ambulance';

export interface RoleCredential {
  roleId: UserRole;
  salt: string;
  hash: string;
  updatedAt: string;
  updatedBy: string;
}

export interface MasterCredentialVault {
  initialized: boolean;
  version: string;
  activatedAt: string;
  activatedBy: string;
  customized?: boolean;
  isDefaultFallback?: boolean;
  credentials: Record<UserRole, RoleCredential>;
  auditLog: {
    timestamp: string;
    event: string;
    role: UserRole;
    actor: string;
  }[];
}

interface ServerVaultState {
  initialized: boolean;
  resigned: boolean;
  resignedAt?: string;
  vault: MasterCredentialVault | null;
}

// Active customized credentials set by Commander (guaranteed baseline across cold starts)
const DEFAULT_PRESEEDED_VAULT: MasterCredentialVault = {
  initialized: true,
  version: '1.0.0-AEGIS-SECURE',
  activatedAt: '2026-11-20T14:15:07.869Z',
  activatedBy: 'Incident Commander',
  customized: true,
  isDefaultFallback: false,
  credentials: {
    incident_commander: {
      roleId: 'incident_commander',
      salt: 'ad4a810cf0045d9de13a9c295b84b4c4',
      hash: '9d5480582969d67750af979067ccc071a3af1375cf95591ae59e0440a4f94c88',
      updatedAt: '2026-11-19T17:11:49.436Z',
      updatedBy: 'Incident Commander'
    },
    fleet_operator: {
      roleId: 'fleet_operator',
      salt: '3c3a2cc39cee1ebc31548996b3e5745f',
      hash: '95c9e1db6671646c01be0a702e754e14d291933bce9f6e8280cbbbb581693671',
      updatedAt: '2026-11-20T14:15:07.869Z',
      updatedBy: 'Incident Commander'
    },
    hospital_staff: {
      roleId: 'hospital_staff',
      salt: 'a0644b4a928fe23f7ea1a4c374623cd1',
      hash: 'e2a4f661c7c5dfcee2ff5b1ef883f1045be8aff5625088db6c4c9f77f695d0f5',
      updatedAt: '2026-11-19T17:11:49.436Z',
      updatedBy: 'Incident Commander'
    },
    driver_police: {
      roleId: 'driver_police',
      salt: 'e69cda44102c6e406db026b7e4355f38',
      hash: 'cda01376b5820c5424371cdf47c8eddc701517522c651615a0de5f1a542e9940',
      updatedAt: '2026-11-19T17:11:49.436Z',
      updatedBy: 'Incident Commander'
    },
    driver_fire: {
      roleId: 'driver_fire',
      salt: 'd77064bba6332d3daa48a17ef0a51ed8',
      hash: '7c78ba963c38ed61105dd50484e60747ee9c8aedb4ae5bb69b5d10c0cb9d8452',
      updatedAt: '2026-11-19T17:11:49.436Z',
      updatedBy: 'Incident Commander'
    },
    driver_ambulance: {
      roleId: 'driver_ambulance',
      salt: '5e0274d4030f5b0523866ac971f11ab1',
      hash: '7a97902c1e8e75387aefeadc1d44e3e75e70cdb4d936a04e19e94d755dea619f',
      updatedAt: '2026-11-19T17:11:49.436Z',
      updatedBy: 'Incident Commander'
    }
  },
  auditLog: [
    {
      timestamp: '2026-11-20T14:15:07.869Z',
      event: 'SYSTEM_CENTRAL_VAULT_ACTIVE',
      role: 'incident_commander',
      actor: 'Incident Commander'
    }
  ]
};

const CLOUD_VAULT_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a1f7dbdce30018';
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'aegis_central_vault_state.json');
const CONFIG_FILE_PATH = path.join(process.cwd(), 'config', 'central_vault.json');

declare global {
  var __AEGIS_SERVER_VAULT_STATE__: ServerVaultState | undefined;
}

function nodeComputeHash(password: string, salt: string): string {
  const saltedString = `aegis-salt-${salt}-pass-${password}-salt-${salt}`;
  return crypto.createHash('sha256').update(saltedString, 'utf8').digest('hex');
}

function loadLocalCachedState(): ServerVaultState {
  if (global.__AEGIS_SERVER_VAULT_STATE__) {
    return global.__AEGIS_SERVER_VAULT_STATE__;
  }

  // 1. Check local /tmp cache
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data) as ServerVaultState;
      if (parsed) {
        global.__AEGIS_SERVER_VAULT_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (_) {}

  // 2. Check bundled configuration file from deployment
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed) {
        const state: ServerVaultState = {
          initialized: Boolean(parsed.initialized !== false),
          resigned: Boolean(parsed.resigned),
          resignedAt: parsed.resignedAt,
          vault: parsed.vault || (parsed.credentials ? parsed : DEFAULT_PRESEEDED_VAULT)
        };
        global.__AEGIS_SERVER_VAULT_STATE__ = state;
        return state;
      }
    }
  } catch (_) {}

  const initialState: ServerVaultState = {
    initialized: true,
    resigned: false,
    vault: DEFAULT_PRESEEDED_VAULT
  };

  global.__AEGIS_SERVER_VAULT_STATE__ = initialState;
  saveLocalCachedState(initialState);
  return initialState;
}

function saveLocalCachedState(state: ServerVaultState) {
  global.__AEGIS_SERVER_VAULT_STATE__ = state;
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (_) {}
}

/**
 * Fetch permanent vault state from the central Render backend
 */
async function fetchRemoteBackendVault(): Promise<ServerVaultState | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${BACKEND_URL}/api/vault`, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && (data.vault || data.resigned)) {
      const state: ServerVaultState = {
        initialized: Boolean(data.initialized),
        resigned: Boolean(data.resigned),
        resignedAt: data.resignedAt,
        vault: data.vault
      };
      saveLocalCachedState(state);
      return state;
    }
  } catch (_) {}
  return null;
}

/**
 * Fetch permanent vault state from high-availability cloud storage
 */
async function fetchCloudVault(): Promise<ServerVaultState | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(CLOUD_VAULT_URL, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const body = await res.json();
    const data = body?.data;
    if (data) {
      if (data.resigned) {
        const state: ServerVaultState = {
          initialized: false,
          resigned: true,
          resignedAt: data.resignedAt,
          vault: null
        };
        saveLocalCachedState(state);
        return state;
      }
      if (data.vault && data.vault.credentials) {
        const state: ServerVaultState = {
          initialized: true,
          resigned: false,
          vault: data.vault
        };
        saveLocalCachedState(state);
        return state;
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Persist vault state to permanent cloud storage
 */
async function saveCloudVault(state: ServerVaultState): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(CLOUD_VAULT_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'aegis_master_vault',
        data: {
          initialized: state.initialized,
          resigned: state.resigned,
          resignedAt: state.resignedAt,
          vault: state.vault,
          updatedAt: new Date().toISOString()
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[Vault API] Cloud save error:', err);
  }
}

async function forwardToRenderBackend(payload: any): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    await fetch(`${BACKEND_URL}/api/vault`, {
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

  // Load state from local cache / bundled config
  let currentState = loadLocalCachedState();
  
  // Query remote Render backend for live master state
  const remoteState = await fetchRemoteBackendVault();
  if (remoteState) {
    currentState = remoteState;
  } else {
    // Secondary fallback: cloud storage
    const cloudState = await fetchCloudVault();
    if (cloudState && cloudState.vault) {
      currentState = cloudState;
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      initialized: currentState.initialized,
      resigned: currentState.resigned,
      resignedAt: currentState.resignedAt || null,
      vault: currentState.vault || DEFAULT_PRESEEDED_VAULT
    });
  }

  if (req.method === 'POST') {
    const { action, role, password, vault } = req.body || {};

    // 1. Password verification for ANY device
    if (action === 'verify') {
      const activeVault = currentState.vault || DEFAULT_PRESEEDED_VAULT;
      const cred = activeVault?.credentials?.[role as UserRole];

      if (!cred) {
        return res.status(200).json({
          valid: false,
          error: `No credential record found for role ${role}.`
        });
      }

      const computedHash = nodeComputeHash(password || '', cred.salt);
      const isMatch = computedHash === cred.hash;

      return res.status(200).json({
        valid: isMatch,
        role,
        vault: activeVault,
        error: isMatch ? undefined : 'ACCESS DENIED: Authentication credentials invalid for role.'
      });
    }

    // 2. Resign Commander Workflow
    if (action === 'resign') {
      const resignedState: ServerVaultState = {
        initialized: false,
        resigned: true,
        resignedAt: new Date().toISOString(),
        vault: null
      };

      saveLocalCachedState(resignedState);
      await saveCloudVault(resignedState);
      forwardToRenderBackend({ action: 'resign', timestamp: resignedState.resignedAt }).catch(() => {});

      return res.status(200).json({
        success: true,
        initialized: false,
        resigned: true,
        resignedAt: resignedState.resignedAt,
        message: 'Incident Commander resignation confirmed. System reset globally across all devices.'
      });
    }

    // 3. Save / Update Passwords
    if (action === 'initialize' || action === 'save' || vault) {
      const updatedVault: MasterCredentialVault = vault || req.body;
      if (!updatedVault || !updatedVault.credentials) {
        return res.status(400).json({ error: 'Invalid vault payload provided.' });
      }

      // Mark as explicitly customized by the user
      updatedVault.customized = true;
      updatedVault.isDefaultFallback = false;

      const newState: ServerVaultState = {
        initialized: true,
        resigned: false,
        vault: updatedVault
      };

      saveLocalCachedState(newState);
      await saveCloudVault(newState);
      forwardToRenderBackend({ action: 'save', vault: updatedVault }).catch(() => {});

      return res.status(200).json({
        success: true,
        initialized: true,
        resigned: false,
        vault: updatedVault
      });
    }

    return res.status(400).json({ error: 'Unrecognized action or payload.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
