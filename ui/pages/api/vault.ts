import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import os from 'os';

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

// Pre-seeded master credentials matching the pre-filled tactical passwords
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

const CACHE_FILE_PATH = path.join(os.tmpdir(), 'aegis_central_vault_state.json');

// Global memory cache across warm serverless / node invocations
declare global {
  var __AEGIS_SERVER_VAULT_STATE__: ServerVaultState | undefined;
}

function loadPersistedState(): ServerVaultState {
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
    console.warn('[Vault API] Could not read cache file, using default in-memory state:', err);
  }

  const initialState: ServerVaultState = {
    initialized: true,
    resigned: false,
    vault: DEFAULT_PRESEEDED_VAULT
  };

  global.__AEGIS_SERVER_VAULT_STATE__ = initialState;
  savePersistedState(initialState);
  return initialState;
}

function savePersistedState(state: ServerVaultState) {
  global.__AEGIS_SERVER_VAULT_STATE__ = state;
  try {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Vault API] Could not write cache file:', err);
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const currentState = loadPersistedState();

  if (req.method === 'GET') {
    return res.status(200).json({
      initialized: currentState.initialized,
      resigned: currentState.resigned,
      resignedAt: currentState.resignedAt || null,
      vault: currentState.vault
    });
  }

  if (req.method === 'POST') {
    const { action, vault } = req.body || {};

    // 1. Resign Commander workflow
    if (action === 'resign') {
      const resignedState: ServerVaultState = {
        initialized: false,
        resigned: true,
        resignedAt: new Date().toISOString(),
        vault: null
      };

      savePersistedState(resignedState);

      return res.status(200).json({
        success: true,
        initialized: false,
        resigned: true,
        resignedAt: resignedState.resignedAt,
        message: 'Incident Commander resignation confirmed. Central vault wiped. All devices will prompt for first-time password setup.'
      });
    }

    // 2. First-time setup or Re-initialization
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

      savePersistedState(newState);

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
