import { DepositFn } from '@/core-ui/types';
import { config } from '@/networks/evm/config';
import { getBytecode, readContract, signTypedData } from '@wagmi/core';
import { erc20Abi } from 'viem';
import { validateWagmi } from './validateWagmi';

const permitTypes = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

const permitAbi = [
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// Function to generate EIP-712 permit signature
export const generatePermitSignature = async (
  address: `0x${string}`,
  spender: `0x${string}`,
  value: bigint,
  deadline: bigint,
  log: Parameters<DepositFn>[3]
) => {
  const { chainId, userWalletAddress = '0x0000000000000000000000000000000000000000' } = await validateWagmi();

  const bytecode = await getBytecode(config, { address });
  if (!bytecode) {
    throw new Error('No contract found at token address');
  }

  const nonce = await readContract(config, {
    address,
    abi: permitAbi,
    functionName: 'nonces',
    args: [userWalletAddress],
  });

  const tokenName = await readContract(config, {
    address,
    abi: erc20Abi,
    functionName: 'name',
  });

  const domain = {
    name: tokenName,
    version: '2',
    chainId,
    verifyingContract: address,
  };

  const message = {
    owner: userWalletAddress,
    spender,
    value,
    nonce,
    deadline,
  };

  const params = {
    account: userWalletAddress,
    domain,
    types: permitTypes,
    primaryType: 'Permit' as const,
    message,
  };
  log('Signing typed data', { params });
  const signature = await signTypedData(config, params);
  return { signature, nonce };
};
