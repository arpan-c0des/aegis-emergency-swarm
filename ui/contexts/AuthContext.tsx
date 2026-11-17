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
  isRouteAuthorizedForRole
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

  // Initialize auth state from browser storage on mount
  useEffect(() => {
    const initialized = isVaultInitialized();
    setIsInitialized(initialized);

    if (!initialized) {
      setShowInitModal(true);
      setShowLoginModal(false);
      setUser(null);
    } else {
      const activeVault = loadMasterVault();
      setVault(activeVault);

      const session = getActiveSession();
      if (session) {
        setUser(session);
        setShowLoginModal(false);
      } else {
        setUser(null);
        setShowLoginModal(true);
      }
    }
    setIsLoading(false);
  }, []);

  // Enforce Route Protection whenever user or route changes
  useEffect(() => {
    if (isLoading) return;

    if (!isInitialized) {
      setShowInitModal(true);
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

    // Redirect to default route for this role if not already there or unauthorized
    const defaultRoute = ROLE_CONFIGS[selectedRole].defaultRoute;
    if (!isRouteAuthorizedForRole(selectedRole, router.pathname)) {
      router.push(defaultRoute);
    }

    return { success: true };
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setShowLoginModal(true);
  };

  const initializeSystem = async (passwords: Record<UserRole, string>): Promise<void> => {
    const newVault = await initializeMasterVault(passwords);
    setVault(newVault);
    setIsInitialized(true);
    setShowInitModal(false);

    // Automatically log in as Incident Commander upon successful first-time activation
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
