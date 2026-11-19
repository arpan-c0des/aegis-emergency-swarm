import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import {
  UserRole,
  UserSession,
  MasterCredentialVault,
  ROLE_CONFIGS,
  isVaultInitialized,
  loadMasterVault,
  initializeMasterVault,
  verifyRoleCredentials,
  updateRolePasswordByCommander,
  getActiveSession,
  createActiveSession,
  clearSession,
  isRouteAuthorizedForRole,
  syncVaultWithServer,
  resignCommanderOnServer
} from '../utils/auth';

interface AuthContextType {
  user: UserSession | null;
  role: UserRole | null;
  isInitialized: boolean;
  isLoading: boolean;
  vault: MasterCredentialVault | null;
  showLoginModal: boolean;
  showInitModal: boolean;
  showSecurityModal: boolean;
  login: (role: UserRole, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  resignCommander: () => Promise<void>;
  initializeSystem: (passwords: Record<UserRole, string>) => Promise<void>;
  updateRolePassword: (targetRole: UserRole, newPass: string) => Promise<boolean>;
  openSecurityModal: () => void;
  closeSecurityModal: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  reloadVault: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vault, setVault] = useState<MasterCredentialVault | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showInitModal, setShowInitModal] = useState<boolean>(false);
  const [showSecurityModal, setShowSecurityModal] = useState<boolean>(false);

  // Initialize auth state from browser storage and sync with central server on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Initial fast local resolution
      const localInitialized = isVaultInitialized();
      const localVault = loadMasterVault();
      const session = getActiveSession();

      if (isMounted) {
        setIsInitialized(localInitialized);
        setVault(localVault);
        if (session) {
          setUser(session);
          setShowLoginModal(false);
          setShowInitModal(false);
        } else {
          setUser(null);
          if (localInitialized) {
            setShowLoginModal(true);
            setShowInitModal(false);
          } else {
            setShowInitModal(true);
            setShowLoginModal(false);
          }
        }
        setIsLoading(false);
      }

      // 2. Multi-device sync with central server (/api/vault)
      try {
        const serverSync = await syncVaultWithServer();
        if (!isMounted) return;

        if (serverSync.resigned || !serverSync.initialized) {
          // Commander has resigned across the network! Reset state and force setup modal
          setIsInitialized(false);
          setVault(null);
          setUser(null);
          setShowInitModal(true);
          setShowLoginModal(false);
        } else if (serverSync.initialized && serverSync.vault) {
          setIsInitialized(true);
          setVault(serverSync.vault);
          setShowInitModal(false);
          const currentSession = getActiveSession();
          if (!currentSession) {
            setUser(null);
            setShowLoginModal(true);
          }
        }
      } catch (e) {
        console.warn('[Aegis Auth] Network sync warning:', e);
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Enforce Route Protection whenever user or route changes
  useEffect(() => {
    if (isLoading) return;

    if (!isInitialized) {
      setShowInitModal(true);
      setShowLoginModal(false);
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Check if current route is authorized for this role
    const currentPath = router.pathname;
    const authorized = isRouteAuthorizedForRole(user.role, currentPath);

    if (!authorized) {
      const defaultPath = ROLE_CONFIGS[user.role].defaultRoute;
      console.warn(`[Aegis Auth] Unauthorized access attempt to ${currentPath} by ${user.role}. Redirecting to ${defaultPath}`);
      router.replace(defaultPath);
    }
  }, [user, isInitialized, router.pathname, isLoading]);

  const reloadVault = () => {
    const v = loadMasterVault();
    setVault(v);
    setIsInitialized(isVaultInitialized());
  };

  const login = async (selectedRole: UserRole, plainPass: string): Promise<{ success: boolean; error?: string }> => {
    const valid = await verifyRoleCredentials(selectedRole, plainPass);
    if (!valid) {
      return {
        success: false,
        error: `ACCESS DENIED: Authentication credentials invalid for role ${ROLE_CONFIGS[selectedRole].shortTitle}.`
      };
    }

    const session = createActiveSession(selectedRole);
    setUser(session);
    setShowLoginModal(false);

    // ALWAYS navigate freshly to the designated default route for this role
    const defaultRoute = ROLE_CONFIGS[selectedRole].defaultRoute;
    router.push(defaultRoute);

    return { success: true };
  };

  // Normal exit: clears only local device session; master credentials remain active
  const logout = () => {
    clearSession();
    setUser(null);
    setShowLoginModal(true);

    // Clean up any residual driver query parameters from the URL
    if (router.query.driver) {
      router.replace(router.pathname, undefined, { shallow: true });
    }
  };

  // Resign Commander: revokes credentials system-wide across all devices and triggers re-initialization
  const resignCommander = async (): Promise<void> => {
    await resignCommanderOnServer();
    setUser(null);
    setVault(null);
    setIsInitialized(false);
    setShowInitModal(true);
    setShowLoginModal(false);
    setShowSecurityModal(false);

    if (router.pathname !== '/') {
      router.replace('/');
    }
  };

  const initializeSystem = async (passwords: Record<UserRole, string>): Promise<void> => {
    const newVault = await initializeMasterVault(passwords);
    setVault(newVault);
    setIsInitialized(true);
    setShowInitModal(false);

    // Automatically log in as Incident Commander upon successful activation
    const commanderSession = createActiveSession('incident_commander');
    setUser(commanderSession);
    setShowLoginModal(false);
  };

  const updateRolePassword = async (targetRole: UserRole, newPass: string): Promise<boolean> => {
    if (!user || user.role !== 'incident_commander') {
      throw new Error('Only Incident Commander can update role passwords.');
    }
    const success = await updateRolePasswordByCommander(targetRole, newPass, user.role);
    if (success) {
      reloadVault();
    }
    return success;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isInitialized,
        isLoading,
        vault,
        showLoginModal,
        showInitModal,
        showSecurityModal,
        login,
        logout,
        resignCommander,
        initializeSystem,
        updateRolePassword,
        openSecurityModal: () => setShowSecurityModal(true),
        closeSecurityModal: () => setShowSecurityModal(false),
        openLoginModal: () => setShowLoginModal(true),
        closeLoginModal: () => setShowLoginModal(false),
        reloadVault,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
