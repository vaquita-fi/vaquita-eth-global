'use client';

import { VAQUITA_KEY_TIMESTAMP, VAQUITA_TIMESTAMP_VALUE } from '@/components/providers/constants';
import { T } from '@/core-ui/components/atoms';
import { LoaderScreen } from '@/core-ui/components/molecules/LoaderScreen';
import { useNetworks } from '@/core-ui/hooks';
import { useNetworkConfigStore } from '@/core-ui/stores';
import { usePrivyStore } from '@/stores';
import React, { useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

// ✅ Privy
import { usePrivy, useWallets } from '@privy-io/react-auth';

// ✅ Mantén tu store de compatibilidad (mismo import que antes)
export function PrivyProviderSync() {
  const { data: { networks } = { networks: [] } } = useNetworks();

  const setWalletAddress = useNetworkConfigStore((s) => s.setWalletAddress);
  const setNetwork       = useNetworkConfigStore((s) => s.setNetwork);
  const setSwitchChain   = useNetworkConfigStore((s) => s.setSwitchChain);
  const { walletAddress: userWalletAddress, network, reset } = useNetworkConfigStore();

  // wagmi
  const { address } = useAccount();
  const chainId     = useChainId();
  const { switchChain } = useSwitchChain();

  // Privy
  const { authenticated, logout, ready, user } = usePrivy();
  const { wallets } = useWallets(); // si necesitas el provider EIP-1193
  const setPrivyData = usePrivyStore((s) => s.setPrivyData);

  // 👉 1) Derivar network desde chainId (igual que antes)
  useEffect(() => {
    const net = networks.find((n) => n.chainId === chainId) ?? null;
    setNetwork(net);
  }, [chainId, networks, setNetwork]);

  // 👉 2) Inyectar switchChain en tu store (API intacta)
  useEffect(() => {
    setSwitchChain((cid) => switchChain({ chainId: cid }));
  }, [switchChain, setSwitchChain]);


  // 👉 4) Sincronizar address hacia el store (no persistir)
  useEffect(() => {
    if (!authenticated) {
      setWalletAddress('');
      setPrivyData({
        ready,
        authenticated,
        wallets: [],
        logout,
        userInfo: null,
        address: '',
      });
      return;
    }

    const privyWalletAddress = address || wallets.find((wallet) => Boolean(wallet.address))?.address || null;

    if (privyWalletAddress) {
      setWalletAddress(privyWalletAddress);
    }

    setPrivyData({
      ready,
      authenticated,
      wallets,
      logout,
      userInfo: user
        ? {
            id: user.id ?? null,
            email: user.email?.address ?? null,
            phone: user.phone?.number ?? null,
          }
        : null,
      address: privyWalletAddress ?? '',
    });
  }, [authenticated, address, logout, ready, setPrivyData, setWalletAddress, user, wallets]);

  // 👉 5) Hard reset por foco (misma lógica; usa logout de Privy)
  const resetHardRef = useRef(() => {});
  resetHardRef.current = () => {
    reset(true);
    void logout();
  };

  useEffect(() => {
    const handleFocus = () => {
      const timestamp = +(localStorage.getItem(VAQUITA_KEY_TIMESTAMP) ?? 0);
      if (!!timestamp && timestamp > VAQUITA_TIMESTAMP_VALUE.current) {
        // Si quieres forzar hard reset al volver de otra pestaña, descomenta:
        // resetHardRef.current();
      }
      VAQUITA_TIMESTAMP_VALUE.current = Date.now();
      localStorage.setItem(VAQUITA_KEY_TIMESTAMP, VAQUITA_TIMESTAMP_VALUE.current.toString());
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('mouseenter', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('mouseenter', handleFocus);
    };
  }, []);

  // 👉 6) Placeholder de lógica adicional cuando tengas address+network
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const run = async () => {
      try {
        if (!userWalletAddress) return;
        setLoading(true);
        // ... tu lógica de post-conexión / chain checks ...
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [userWalletAddress, network?.name, reset]);

  if (!ready || loading) {
    return (
      <LoaderScreen withImage>
        <></>
      </LoaderScreen>
    );
  }

  return null;
}
