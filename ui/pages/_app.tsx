import type { AppProps } from 'next/app';
import '../styles/globals.css';
import 'leaflet/dist/leaflet.css';
import { AuthProvider } from '../contexts/AuthContext';
import { VaultSetupModal } from '../components/VaultSetupModal';
import { LoginModal } from '../components/LoginModal';
import { SecurityVaultModal } from '../components/SecurityVaultModal';
import { CommanderCornerMenu } from '../components/CommanderCornerMenu';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <VaultSetupModal />
      <LoginModal />
      <SecurityVaultModal />
      <CommanderCornerMenu />
    </AuthProvider>
  );
}
