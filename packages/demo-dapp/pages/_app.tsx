import type { AppProps } from 'next/app';
import React from 'react';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

import '@solana/wallet-adapter-react-ui/styles.css';

import '../styles/globals.css';

type RpcUrlState = {
  rpcUrl: string;
  setRpcUrl: (url: string) => void;
};

const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';

export const RpcUrlContext = React.createContext<RpcUrlState>({
  rpcUrl: DEFAULT_RPC_URL,
  setRpcUrl: () => {},
});

export function useRpcUrl(): RpcUrlState {
  return React.useContext(RpcUrlContext);
}

function RpcUrlProvider({ children }: { children: React.ReactNode }) {
  const [rpcUrl, setRpcUrlState] = React.useState(DEFAULT_RPC_URL);

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem('noirforge_rpc_url');
      if (saved && typeof saved === 'string') setRpcUrlState(saved);
    } catch {}
  }, []);

  const setRpcUrl = React.useCallback((url: string) => {
    setRpcUrlState(url);
    try {
      window.localStorage.setItem('noirforge_rpc_url', url);
    } catch {}
  }, []);

  return <RpcUrlContext.Provider value={{ rpcUrl, setRpcUrl }}>{children}</RpcUrlContext.Provider>;
}

function Providers({ children }: { children: React.ReactNode }) {
  const { rpcUrl } = useRpcUrl();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const wallets = React.useMemo(() => {
    if (!mounted) return [];
    return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
  }, [mounted]);

  return (
    <ConnectionProvider endpoint={rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RpcUrlProvider>
      <Providers>
        <Component {...pageProps} />
      </Providers>
    </RpcUrlProvider>
  );
}
