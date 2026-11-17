import type { AppProps } from 'next/app';
import Head from 'next/head';
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
      <Head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
      <VaultSetupModal />
      <LoginModal />
      <SecurityVaultModal />
      <CommanderCornerMenu />
    </AuthProvider>
  );
}
