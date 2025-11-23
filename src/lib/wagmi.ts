import { createConfig, http } from '@wagmi/core';
import { base, baseSepolia, coreTestnet2, lisk, scrollSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const getRpcUrl = (envKey: string | undefined, fallbacks: readonly string[]) => {
  if (envKey && envKey.length > 0) {
    return envKey;
  }
  return fallbacks[0] ?? '';
};

const walletConnectProjectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn('WalletConnect project id is not defined. Set NEXT_PUBLIC_WC_PROJECT_ID to enable WalletConnect.');
}

const connectors = [
  injected({ shimDisconnect: true }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: 'Vaquita',
            description: 'Savings dapp',
            url: 'https://app.vaquita.fi',
            icons: ['https://app.vaquita.fi/icon.png'],
          },
        }),
      ]
    : []),
];

const configArgs = {
  autoConnect: true,
  ssr: true,
  chains: [lisk, baseSepolia, scrollSepolia, coreTestnet2, base],
  connectors,
  transports: {
    [lisk.id]: http(getRpcUrl(process.env.NEXT_PUBLIC_RPC_LISK, lisk.rpcUrls.default.http)),
    [baseSepolia.id]: http(getRpcUrl(process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA, baseSepolia.rpcUrls.default.http)),
    [scrollSepolia.id]: http(getRpcUrl(process.env.NEXT_PUBLIC_RPC_SCROLL_SEPOLIA, scrollSepolia.rpcUrls.default.http)),
    [coreTestnet2.id]: http(getRpcUrl(process.env.NEXT_PUBLIC_RPC_CORE_TESTNET2, coreTestnet2.rpcUrls.default.http)),
    [base.id]: http(getRpcUrl(process.env.NEXT_PUBLIC_RPC_BASE, base.rpcUrls.default.http)),
  },
} as const;

export const wagmiConfig = createConfig(configArgs as unknown as Parameters<typeof createConfig>[0]);

export const TARGET_CHAIN_ID =
  Number.parseInt(process.env.NEXT_PUBLIC_TARGET_CHAIN_ID ?? '', 10) || base.id;

export type TargetChainId = typeof TARGET_CHAIN_ID;


