import { NetworkResponseDTO } from '@/core-ui/types';
import { config } from '@/networks/evm/config';
import { usePrivyStore } from '@/stores';
import type { ConnectedWallet } from '@privy-io/react-auth';
import { getAccount, GetAccountReturnType, getWalletClient, GetWalletClientReturnType } from '@wagmi/core';
import type { AbiFunction } from 'viem';
import { createWalletClient, custom } from 'viem';

type VerifyWagmiSuccess = {
  userWalletAddress: `0x${string}`;
  chainId: number;
  chain: GetAccountReturnType['chain'] | undefined;
  walletClient: GetWalletClientReturnType;
  abiFunction?: AbiFunction;
  errorMessage: '';
};

type VerifyWagmiError = {
  userWalletAddress?: undefined;
  chainId?: undefined;
  chain?: undefined;
  walletClient?: undefined;
  abiFunction?: undefined;
  errorMessage: string;
};

export type VerifyWagmi = VerifyWagmiSuccess | VerifyWagmiError;

type AugmentedWallet = ConnectedWallet & {
  chainType?: string;
  chainId?: string | number;
  getEthereumProvider?: ConnectedWallet['getEthereumProvider'];
};

const isEvmWallet = (wallet: ConnectedWallet): wallet is AugmentedWallet => {
  const candidate = wallet as AugmentedWallet;
  if (candidate.chainType && ['ethereum', 'eip155', 'wallet'].includes(candidate.chainType)) {
    return true;
  }
  return typeof candidate.getEthereumProvider === 'function';
};

export const validateWagmi = async (
  token?: NetworkResponseDTO['tokens'][number],
  functionName?: string
): Promise<VerifyWagmi> => {
  const account = getAccount(config);
  let { chain } = account;
  let userWalletAddress = account.address as `0x${string}` | undefined;
  let walletClient: GetWalletClientReturnType | null = null;
  try {
    walletClient = (await getWalletClient(config)) as GetWalletClientReturnType | null;
  } catch (error) {
    console.debug('validateWagmi:getWalletClient failed', error);
    walletClient = null;
  }
  let chainId: number | undefined = chain?.id;

  if (!userWalletAddress || !walletClient || !chainId) {
    const { wallets } = usePrivyStore.getState();
    const evmWallets = wallets.filter(isEvmWallet);

    for (const wallet of evmWallets) {
      let provider: Awaited<ReturnType<ConnectedWallet['getEthereumProvider']>> | null = null;
      try {
        provider = await wallet.getEthereumProvider?.();
      } catch (error) {
        console.debug('validateWagmi:getEthereumProvider failed', error);
        provider = null;
      }

      if (!userWalletAddress && wallet.address) {
        userWalletAddress = wallet.address as `0x${string}`;
      }

      if (!chainId && typeof wallet.chainId !== 'undefined') {
        const numericChainId =
          typeof wallet.chainId === 'number'
            ? wallet.chainId
            : Number.parseInt(String(wallet.chainId), 16);
        if (!Number.isNaN(numericChainId)) {
          chainId = numericChainId;
        }
      }

      if (!chainId && provider) {
        try {
          const hexChainId = (await provider.request?.({ method: 'eth_chainId' })) as string | undefined;
          if (hexChainId) {
            const numericChainId = Number.parseInt(hexChainId, 16);
            if (!Number.isNaN(numericChainId)) {
              chainId = numericChainId;
            }
          }
        } catch (error) {
          console.debug('validateWagmi:provider chainId request failed', error);
        }
      }

      if (chainId) {
        chain = config.chains.find((candidate) => candidate.id === chainId) ?? chain;
      }

      if (!walletClient && provider && userWalletAddress) {
        try {
          walletClient = createWalletClient({
            account: userWalletAddress,
            chain: chain ?? undefined,
            transport: custom(provider),
          }) as GetWalletClientReturnType;
        } catch (error) {
          console.debug('validateWagmi:createWalletClient failed', error);
          walletClient = null;
        }
      }

      if (userWalletAddress && walletClient && chainId) {
        break;
      }
    }
  }

  if (!userWalletAddress) {
    return {
      errorMessage: 'User wallet not found.',
    };
  }

  if (!walletClient) {
    return {
      errorMessage: 'Wallet client not available',
    };
  }

  if (!chainId) {
    return {
      errorMessage: 'No chain connected',
    };
  }

  let abiFunction: AbiFunction | undefined;
  if (token && functionName) {
    const abi = token.vaquitaContractAbi;
    abiFunction = abi.find((candidate) => candidate.type === 'function' && candidate.name === functionName) as
      | AbiFunction
      | undefined;
    if (!abiFunction) {
      return {
        errorMessage: 'ABI deposit invalid',
      };
    }
  }

  return {
    chain,
    chainId,
    userWalletAddress,
    walletClient,
    abiFunction,
    errorMessage: '',
  };
};
