import { DepositFn } from '@/core-ui/types';
import { usePrivyStore } from '@/stores';
import { encodeFunctionData, type Abi, type AbiFunction, type TransactionReceipt } from 'viem';
import { createPublicClient, http, type Chain } from 'viem';

type PrivySendTransaction = (params: {
  chainId: number;
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
}, options?: {
  sponsor?: boolean;
  address?: string;
  uiOptions?: {
    showWalletUIs?: boolean;
  };
}) => Promise<{ hash: `0x${string}` }>;

type WriteContractParams = {
  account: `0x${string}`;
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  value?: bigint;
  gas?: bigint;
};

type PrivyWriteContractParams = WriteContractParams & {
  chainId: number;
  chain: Chain;
};

let privySendTransactionRef: PrivySendTransaction | null = null;

export const setPrivySendTransaction = (sendTransaction: PrivySendTransaction) => {
  privySendTransactionRef = sendTransaction;
};

export const privyWriteContract = async (
  params: PrivyWriteContractParams,
  log: Parameters<DepositFn>[3]
): Promise<{ txHash: `0x${string}`; transaction: TransactionReceipt }> => {
  if (!privySendTransactionRef) {
    throw new Error('Privy sendTransaction not initialized. Make sure PrivyTransactionProvider is mounted.');
  }

  const { wallets } = usePrivyStore.getState();
  const evmWallet = wallets.find((wallet) => wallet.address && wallet.chainId);
  
  if (!evmWallet || !evmWallet.address) {
    throw new Error('No EVM wallet found');
  }
  
  log('Using wallet for transaction', {
    walletAddress: evmWallet.address,
    chainId: evmWallet.chainId,
    functionName: params.functionName,
    contractAddress: params.address,
  });

  // Encode function data
  const abiFunction = (params.abi as AbiFunction[]).find(
    (item) => item.type === 'function' && item.name === params.functionName
  ) as AbiFunction | undefined;

  if (!abiFunction) {
    throw new Error(`Function ${params.functionName} not found in ABI`);
  }

  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args || [],
  }) as `0x${string}`;

  log('Sending transaction with Privy sponsorship', {
    chainId: params.chainId,
    to: params.address,
    functionName: params.functionName,
    value: params.value || 0n,
  });

  // Send transaction with Privy sponsorship
  const result = await privySendTransactionRef(
    {
      chainId: params.chainId,
      to: params.address,
      data,
      value: params.value || 0n,
    },
    {
      sponsor: true,
      address: evmWallet.address,
      uiOptions: {
        showWalletUIs: false,
      },
    }
  );

  const txHash = result.hash;
  log(`Transaction sent, hash: "${txHash}"`);

  // Wait for transaction receipt using public client
  const publicClient = createPublicClient({
    chain: params.chain,
    transport: http(),
  });

  log(`Waiting for transaction receipt hash: "${txHash}"`);
  const transaction = await publicClient.waitForTransactionReceipt({ hash: txHash });

  return { txHash, transaction };
};

