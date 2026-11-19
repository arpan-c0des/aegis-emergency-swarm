/**
 * AEGIS Emergency Response Swarm - Cryptographic Authentication & RBAC Engine
 * Provides role-based access control, salted cryptographic password hashing,
 * persistent credential vault management, centralized server synchronization,
 * and route authorization.
 */

export type UserRole =
  | 'incident_commander'
  | 'fleet_operator'
  | 'hospital_staff'
  | 'driver_police'
  | 'driver_fire'
  | 'driver_ambulance';

export interface RoleMetadata {
  id: UserRole;
  title: string;
  shortTitle: string;
  description: string;
  category: 'command' | 'operations' | 'field_driver';
  color: string;
  bgLight: string;
  borderColor: string;
  icon: string;
  defaultRoute: string;
  allowedRoutes: string[];
  assignedVehicleId?: string;
  assignedVehicleName?: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleMetadata> = {
  incident_commander: {
    id: 'incident_commander',
    title: 'Incident Commander (EOC Gold Command)',
    shortTitle: 'Commander',
    description: 'Master operational authority across all sectors, C2 swarm, fleet dispatch, hospital triage, and security credentials.',
    category: 'command',
    color: '#F59E0B', // Amber
    bgLight: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    icon: '🛡️',
    defaultRoute: '/',
    allowedRoutes: ['/', '/fleet', '/hospitals'],
  },
  fleet_operator: {
    id: 'fleet_operator',
    title: 'Fleet Uber Dispatch Operator',
    shortTitle: 'Fleet Operator',
    description: 'Full dispatch authority over Kolkata emergency fleet, Bidirectional A* route routing, and road impedance control.',
    category: 'operations',
    color: '#3B82F6', // Blue
    bgLight: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    icon: '🗺️',
    defaultRoute: '/fleet',
    allowedRoutes: ['/fleet'],
  },
  hospital_staff: {
    id: 'hospital_staff',
    title: 'Hospital Bed Intake Specialist',
    shortTitle: 'Bed Intake Specialist',
    description: 'Direct authority over SSKM Hospital (H1) and Apollo Trauma Clinic (H2) emergency bed intake and triage quotas.',
    category: 'operations',
    color: '#10B981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: '🏥',
    defaultRoute: '/hospitals',
    allowedRoutes: ['/hospitals'],
  },
  driver_police: {
    id: 'driver_police',
    title: 'Police Field Interceptor (POL-02)',
    shortTitle: 'Police Driver',
    description: 'Field officer tactical cockpit. Vehicle fixed to POL-02 Rapid Interceptor. Authorized to select destination and receive dispatch orders.',
    category: 'field_driver',
    color: '#6366F1', // Indigo
    bgLight: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
    icon: '🚓',
    defaultRoute: '/fleet?driver=police',
    allowedRoutes: ['/fleet'],
    assignedVehicleId: 'POL-02',
    assignedVehicleName: 'POL-02 Rapid Interceptor (Alipore Command Depot)',
  },
  driver_fire: {
    id: 'driver_fire',
    title: 'Fire & Rescue Engine (FIRE-03)',
    shortTitle: 'Fire Driver',
    description: 'Field fire suppression cockpit. Vehicle fixed to FIRE-03 Heavy Pumper. Authorized to select destination and receive dispatch orders.',
    category: 'field_driver',
    color: '#EF4444', // Red
    bgLight: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    icon: '🚒',
    defaultRoute: '/fleet?driver=fire',
    allowedRoutes: ['/fleet'],
    assignedVehicleId: 'FIRE-03',
    assignedVehicleName: 'FIRE-03 Heavy Pumper (Shyambazar Command Depot)',
  },
  driver_ambulance: {
    id: 'driver_ambulance',
    title: 'Paramedic Ambulance (AMB-07)',
    shortTitle: 'Ambulance Driver',
    description: 'Field critical care cockpit. Vehicle fixed to AMB-07 Advanced Life Support. Authorized to select destination and receive trauma bay orders.',
    category: 'field_driver',
    color: '#EC4899', // Pink / Rose
    bgLight: 'rgba(236, 72, 153, 0.12)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    icon: '🚑',
    defaultRoute: '/fleet?driver=ambulance',
    allowedRoutes: ['/fleet'],
    assignedVehicleId: 'AMB-07',
    assignedVehicleName: 'AMB-07 Paramedic Ambulance (Shyambazar Command Depot)',
  }
};

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

export interface UserSession {
  role: UserRole;
  name: string;
  sessionToken: string;
  createdAt: number;
  expiresAt: number;
  assignedVehicleId?: string;
  assignedVehicleName?: string;
}

const VAULT_STORAGE_KEY = 'aegis_master_security_vault_v1';
const SESSION_STORAGE_KEY = 'aegis_auth_session_v1';
const RESIGNED_STORAGE_KEY = 'aegis_commander_resigned_v1';

// Pre-seeded master credentials matching the pre-filled tactical passwords
export const DEFAULT_PRESEEDED_VAULT: MasterCredentialVault = {
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

/**
 * Generate cryptographically secure random hexadecimal salt
 */
export function generateCryptographicSalt(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // SSR fallback
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Securely compute SHA-256 hash with cryptographic salt using Web Crypto API
 */
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const saltedString = `aegis-salt-${salt}-pass-${password}-salt-${salt}`;

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Pure JS fallback (djb2 / murmur hybrid) for non-crypto SSR environments
  let hash = 5381;
  for (let i = 0; i < saltedString.length; i++) {
    hash = ((hash << 5) + hash) + saltedString.charCodeAt(i);
    hash = hash & hash;
  }
  return 'fallback_' + Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Check if the Master Security Vault has been initialized.
 * Defaults to true for any device unless the Commander has explicitly resigned.
 */
export function isVaultInitialized(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem(RESIGNED_STORAGE_KEY) === 'true') {
      return false;
    }
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      // Default pre-seeded vault is initialized by default
      return true;
    }
    const parsed: MasterCredentialVault = JSON.parse(raw);
    return Boolean(parsed && parsed.initialized && parsed.credentials && parsed.credentials.incident_commander);
  } catch (e) {
    return true;
  }
}

/**
 * Load the active vault from storage or return default pre-seeded vault
 */
export function loadMasterVault(): MasterCredentialVault | null {
  if (typeof window === 'undefined') return DEFAULT_PRESEEDED_VAULT;
  try {
    if (localStorage.getItem(RESIGNED_STORAGE_KEY) === 'true') {
      return null;
    }
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) {
      // Initialize with default pre-seeded vault
      saveMasterVault(DEFAULT_PRESEEDED_VAULT);
      return DEFAULT_PRESEEDED_VAULT;
    }
    return JSON.parse(raw) as MasterCredentialVault;
  } catch (e) {
    console.error('Failed to parse Aegis Master Vault:', e);
    return DEFAULT_PRESEEDED_VAULT;
  }
}

/**
 * Save master vault to storage
 */
export function saveMasterVault(vault: MasterCredentialVault): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RESIGNED_STORAGE_KEY);
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (e) {
    console.error('Failed to persist Aegis Master Vault:', e);
  }
}

/**
 * Fetch centralized vault state from server to sync multi-device state
 */
export async function syncVaultWithServer(): Promise<{
  initialized: boolean;
  resigned: boolean;
  vault: MasterCredentialVault | null;
}> {
  try {
    const res = await fetch('/api/vault', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch /api/vault: ${res.statusText}`);
    }
    const data = await res.json();

    if (data.resigned || !data.initialized) {
      // System has been resigned! Wipe local state
      if (typeof window !== 'undefined') {
        localStorage.setItem(RESIGNED_STORAGE_KEY, 'true');
        localStorage.removeItem(VAULT_STORAGE_KEY);
        clearSession();
      }
      return { initialized: false, resigned: true, vault: null };
    }

    if (data.initialized && data.vault) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(RESIGNED_STORAGE_KEY);
        saveMasterVault(data.vault);
      }
      return { initialized: true, resigned: false, vault: data.vault };
    }
  } catch (err) {
    console.warn('[Aegis Auth] Central vault sync offline/failed, using local vault:', err);
  }

  const localVault = loadMasterVault();
  const initialized = isVaultInitialized();
  return { initialized, resigned: !initialized, vault: localVault };
}

/**
 * Push updated vault to server so all other devices receive the changes
 */
export async function syncVaultToServer(vault: MasterCredentialVault): Promise<boolean> {
  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', vault })
    });
    return res.ok;
  } catch (err) {
    console.warn('[Aegis Auth] Failed to push vault to server:', err);
    return false;
  }
}

/**
 * Commander Resignation: revokes master credentials system-wide on server and client
 */
export async function resignCommanderOnServer(): Promise<boolean> {
  try {
    await fetch('/api/vault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resign' })
    });
  } catch (err) {
    console.warn('[Aegis Auth] Failed to notify server of commander resignation:', err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(RESIGNED_STORAGE_KEY, 'true');
    localStorage.removeItem(VAULT_STORAGE_KEY);
    clearSession();
  }
  return true;
}

/**
 * First-time initialization of the Master Security Vault
 * Incident Commander sets his master password and provisions credentials for all operational roles.
 */
export async function initializeMasterVault(
  passwords: Record<UserRole, string>
): Promise<MasterCredentialVault> {
  const credentials: Record<UserRole, RoleCredential> = {} as any;
  const now = new Date().toISOString();

  const roleKeys = Object.keys(ROLE_CONFIGS) as UserRole[];
  for (const roleId of roleKeys) {
    const plainPass = passwords[roleId] || '';
    if (!plainPass) {
      throw new Error(`Password for ${ROLE_CONFIGS[roleId].title} cannot be blank.`);
    }
    const salt = generateCryptographicSalt(32);
    const hash = await hashPasswordWithSalt(plainPass, salt);

    credentials[roleId] = {
      roleId,
      salt,
      hash,
      updatedAt: now,
      updatedBy: 'Incident Commander (System Setup)'
    };
  }

  const vault: MasterCredentialVault = {
    initialized: true,
    version: '1.0.0-AEGIS-SECURE',
    activatedAt: now,
    activatedBy: 'Incident Commander',
    credentials,
    auditLog: [
      {
        timestamp: now,
        event: 'MASTER_VAULT_INITIALIZED',
        role: 'incident_commander',
        actor: 'Incident Commander'
      },
      ...roleKeys.map((r) => ({
        timestamp: now,
        event: 'ROLE_CREDENTIAL_PROVISIONED',
        role: r,
        actor: 'Incident Commander'
      }))
    ]
  };

  saveMasterVault(vault);
  await syncVaultToServer(vault);
  return vault;
}

/**
 * Verify credentials for a specific role
 */
export async function verifyRoleCredentials(role: UserRole, plainPassword: string): Promise<boolean> {
  let vault = loadMasterVault();
  if (!vault || !vault.initialized) {
    const syncRes = await syncVaultWithServer();
    vault = syncRes.vault;
  }
  if (!vault || !vault.initialized) return false;

  const cred = vault.credentials[role];
  if (!cred) return false;

  const computedHash = await hashPasswordWithSalt(plainPassword, cred.salt);
  return computedHash === cred.hash;
}

/**
 * Update password for any role (Authorized only for Incident Commander)
 */
export async function updateRolePasswordByCommander(
  targetRole: UserRole,
  newPassword: string,
  commanderRole: UserRole = 'incident_commander'
): Promise<boolean> {
  if (commanderRole !== 'incident_commander') {
    throw new Error('UNAUTHORIZED: Only Incident Commander can re-provision role credentials.');
  }

  const vault = loadMasterVault();
  if (!vault || !vault.initialized) {
    throw new Error('Vault is uninitialized.');
  }

  const salt = generateCryptographicSalt(32);
  const hash = await hashPasswordWithSalt(newPassword, salt);
  const now = new Date().toISOString();

  vault.credentials[targetRole] = {
    roleId: targetRole,
    salt,
    hash,
    updatedAt: now,
    updatedBy: 'Incident Commander'
  };

  vault.auditLog.unshift({
    timestamp: now,
    event: 'CREDENTIAL_UPDATED',
    role: targetRole,
    actor: 'Incident Commander'
  });

  saveMasterVault(vault);
  await syncVaultToServer(vault);
  return true;
}

/**
 * Session Management
 */
export function getActiveSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: UserSession = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function createActiveSession(role: UserRole): UserSession {
  const config = ROLE_CONFIGS[role];
  const session: UserSession = {
    role,
    name: config.title,
    sessionToken: 'aegis_' + generateCryptographicSalt(24),
    createdAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    assignedVehicleId: config.assignedVehicleId,
    assignedVehicleName: config.assignedVehicleName,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

/**
 * Validate route access based on active role
 */
export function isRouteAuthorizedForRole(role: UserRole, pathname: string): boolean {
  const config = ROLE_CONFIGS[role];
  if (!config) return false;

  // Incident Commander has unrestricted access to everything
  if (role === 'incident_commander') return true;

  // Clean pathname (remove query params or trailing slashes)
  const cleanPath = pathname.split('?')[0].replace(/\/$/, '') || '/';

  return config.allowedRoutes.some((allowed) => {
    const cleanAllowed = allowed.split('?')[0].replace(/\/$/, '') || '/';
    return cleanPath === cleanAllowed;
  });
}
