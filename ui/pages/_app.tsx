import type { AppProps } from 'next/app';
// @ts-expect-error CSS files are handled by Next.js at runtime.
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}