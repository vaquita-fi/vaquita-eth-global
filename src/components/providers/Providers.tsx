'use client';

import { DesktopSidebar, MobileNavigation } from '@/components';
import { AblyProvider, NetworksProvider, sendLogToAbly } from '@/core-ui/components';
import { isEvmType } from '@/core-ui/helpers';
import { getNetworks } from '@/core-ui/hooks';
import { useResize } from '@/core-ui/stores';
import { useVisibility } from '@/core-ui/stores/visibility';
import { config as wagmiConfig } from '@/networks/evm/config';
import { initPosthog } from '@/posthog';
import { HeroUIProvider } from '@heroui/react';
import { ToastProvider } from '@heroui/toast';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Ably from 'ably';
import { ChannelProvider, useChannel } from 'ably/react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { base } from 'viem/chains';
import { PrivyProviderSync } from './PrivyProviderSync';
import { TransactionsProvider } from './TransactionsProvider';

export const queryClient = new QueryClient();

const originalLog = console.log;
const originalInfo = console.info;
const originalError = console.error;
const originalWarn = console.warn;

if (process.env.NODE_ENV !== 'development') {
  console.log = (...args) => {
    void sendLogToAbly('log', args);
    originalLog(...args);
  };
  console.info = (...args) => {
    void sendLogToAbly('info', args);
    originalInfo(...args);
  };
  console.error = (...args) => {
    void sendLogToAbly('error', args);
    originalError(...args);
  };
  console.warn = (...args) => {
    void sendLogToAbly('warn', args);
    originalWarn(...args);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  const { ref } = useResize();
  useVisibility();

  useEffect(() => {
    initPosthog();
    const listener = () => {
      const vh = window.innerHeight * 0.01;
      document?.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    listener();
    window?.addEventListener('resize', listener);
    return () => window?.removeEventListener('resize', listener);
  }, []);

  return (
    <AblyProvider>
      <HeroUIProvider>
        <ToastProvider placement="top-center" />
        <div className="flex bg-background" style={{ overflow: 'hidden' }} ref={ref}>
          <DesktopSidebar />
          <Main>{children}</Main>
          <MobileNavigation />
        </div>
        <TransactionsProvider />
      </HeroUIProvider>
    </AblyProvider>
  );
}

const ListenDepositsChanges = () => {
  const queryClient = useQueryClient();
  const handleChange = (message: Ably.Message) => {
    console.info('handleChange deposit', message);
    return queryClient.invalidateQueries({ queryKey: ['deposit'], exact: false });
  };
  useChannel('deposits-changes', 'change', handleChange);
  return null;
};

const ListenProfileChanges = () => {
  const queryClient = useQueryClient();
  const handleChange = (message: Ably.Message) => {
    console.info('handleChange profile', message);
    return queryClient.invalidateQueries({ queryKey: ['profile'], exact: false });
  };
  useChannel('profiles-changes', 'change', handleChange);
  return null;
};

const AblyChanges = () => {
  return (
    <>
      <ChannelProvider channelName="deposits-changes">
        <ListenDepositsChanges />
      </ChannelProvider>
      <ChannelProvider channelName="profiles-changes">
        <ListenProfileChanges />
      </ChannelProvider>
    </>
  );
};

const Main = ({ children }: { children: ReactNode }) => {
  const [types, setTypes] = useState<string[]>([]);
  useEffect(() => {
    const fun = async () => {
      const { types } = await getNetworks();
      setTypes(types);
    };
    void fun();
  }, []);
  const isEVM = isEvmType(types);
  if (types.length === 0) return null;

  return (
    <main
      className="flex-1 md:ml-64 flex flex-col"
      style={{ height: 'var(--100VH)', minHeight: 'var(--100VH)', maxHeight: 'var(--100VH)', overflow: 'hidden' }}
      key={types.join(',')}
    >
      <>
        {isEVM.is ? (
          <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
            config={{ loginMethods: ['wallet', 'email'], defaultChain: base, supportedChains: [base] }}
          >
            <QueryClientProvider client={queryClient}>
              <WagmiProvider config={wagmiConfig}>
                <PrivyProviderSync />
                <NetworksProvider>{children}</NetworksProvider>
              </WagmiProvider>
              <AblyChanges />
            </QueryClientProvider>
          </PrivyProvider>
        ) : (
          <QueryClientProvider client={queryClient}>
            <NetworksProvider>{children}</NetworksProvider>
            <AblyChanges />
          </QueryClientProvider>
        )}
      </>
    </main>
  );
};
