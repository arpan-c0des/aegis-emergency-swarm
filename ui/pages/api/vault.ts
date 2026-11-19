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

// Fallback pre-seeded master credentials
const DEFAULT_PRESEEDED_VAULT: MasterCredentialVault = {
  initialized: true,
  version: '1.0.0-AEGIS-SECURE',
  activatedAt: '2026-11-17T00:00:00.000Z',
  activatedBy: 'Incident Commander (EOC Gold Command)',
  credentials: {
    incident_commander: {
      roleId: 'incident_commander',
      salt: 'c0mm4nd3r_s4lt_k0lk4t4_2026_aegis',
      hash: '6a9540cddf003c5e8b83411b051764566c7caba4729b05cfe798338d33a4e32e',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    },
    fleet_operator: {
      roleId: 'fleet_operator',
      salt: 'fl33t_0p3r4t0r_s4lt_2026_aegis_sec',
      hash: '3ebe285e91ebfb04487447d7baf45df5fd5b93d965bb1154c124caa548a19e58',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    },
    hospital_staff: {
      roleId: 'hospital_staff',
      salt: 'h0sp1t4l_b3d_s4lt_2026_aegis_intake',
      hash: '76b160e0dba2794ac012f7b1b5f39b21b24e4c46e384bcffe341e4824fdf1507',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    },
    driver_police: {
      roleId: 'driver_police',
      salt: 'p0l1c3_dr1v3r_s4lt_2026_aegis_pol02',
      hash: '9771ab567afe6ae73bf594a282201ba22ee7e3512cf7adb556cfc1ab0493b990',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    },
    driver_fire: {
      roleId: 'driver_fire',
      salt: 'f1r3_dr1v3r_s4lt_2026_aegis_fire03',
      hash: '620c0d52018045ecb99a4f72399a177969d2640d7795e2a3e0c962502fb9f567',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    },
    driver_ambulance: {
      roleId: 'driver_ambulance',
      salt: '4mb_dr1v3r_s4lt_2026_aegis_amb07',
      hash: '0f8fd069ffff4c067704f488c118777372f65420c2747bca657c00dbd24e80c2',
      updatedAt: '2026-11-17T00:00:00.000Z',
      updatedBy: 'Incident Commander'
    }
  },
  auditLog: [
    {
      timestamp: '2026-11-17T00:00:00.000Z',
      event: 'SYSTEM_CENTRAL_VAULT_PROVISIONED',
      role: 'incident_commander',
      actor: 'Incident Commander (EOC Gold Command)'
    }
  ]
};

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');
const CACHE_FILE_PATH = path.join(os.tmpdir(), 'aegis_central_vault_state.json');

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

  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(data) as ServerVaultState;
      if (parsed) {
        global.__AEGIS_SERVER_VAULT_STATE__ = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Vault API] Could not read cache file:', err);
  }

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
  } catch (err) {
    console.warn('[Vault API] Could not write cache file:', err);
  }
}

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
    if (data && (data.vault || data.resigned || data.initialized !== undefined)) {
      const state: ServerVaultState = {
        initialized: data.resigned ? false : Boolean(data.initialized),
        resigned: Boolean(data.resigned),
        resignedAt: data.resignedAt,
        vault: data.resigned ? null : (data.vault || DEFAULT_PRESEEDED_VAULT)
      };
      saveLocalCachedState(state);
      return state;
    }
  } catch (err) {
    // Fall back to local cache if Render is temporarily unreachable
  }
  return null;
}

async function pushRemoteBackendVault(payload: any): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(`${BACKEND_URL}/api/vault`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[Vault API] Could not push to Render backend:', err);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  // Attempt sync with central Render backend
  let currentState = loadLocalCachedState();
  const remoteState = await fetchRemoteBackendVault();
  if (remoteState) {
    currentState = remoteState;
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      initialized: currentState.initialized,
      resigned: currentState.resigned,
      resignedAt: currentState.resignedAt || null,
      vault: currentState.vault
    });
  }

  if (req.method === 'POST') {
    const { action, role, password, vault } = req.body || {};

    // 1. Direct Server-Side Password Verification for Any Device
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

      if (isMatch) {
        return res.status(200).json({
          valid: true,
          role,
          vault: activeVault
        });
      } else {
        return res.status(200).json({
          valid: false,
          error: `ACCESS DENIED: Authentication credentials invalid for role.`
        });
      }
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
      // Push resignation to Render backend in background
      await pushRemoteBackendVault({ action: 'resign', timestamp: resignedState.resignedAt });

      return res.status(200).json({
        success: true,
        initialized: false,
        resigned: true,
        resignedAt: resignedState.resignedAt,
        message: 'Incident Commander resignation confirmed. System reset globally across all devices.'
      });
    }

    // 3. First-time setup or Password Updates
    if (action === 'initialize' || action === 'save' || vault) {
      const updatedVault = vault || req.body;
      if (!updatedVault || !updatedVault.credentials) {
        return res.status(400).json({ error: 'Invalid vault payload provided.' });
      }

      const newState: ServerVaultState = {
        initialized: true,
        resigned: false,
        vault: updatedVault
      };

      saveLocalCachedState(newState);
      // Push updated vault to Render backend
      await pushRemoteBackendVault({ action: 'save', vault: updatedVault });

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
