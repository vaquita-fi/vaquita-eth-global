import { DepositFn, NetworkResponseDTO, WithdrawFn } from '@/core-ui/types';
import { buildArgsFromInputs } from '@/networks/evm/buildArgsFromInputs';

import { generatePermitSignature } from '@/networks/evm/generatePermitSignature';
import { privyWriteContract } from '@/networks/evm/privyWriteContract';
import { validateWagmi } from '@/networks/evm/validateWagmi';
import { type Abi, parseUnits } from 'viem';

export const liskTransactions = async (token: NetworkResponseDTO['tokens'][number]) => {
  const transactionDeposit: DepositFn = async (_, amount: number, lockPeriod, log) => {
    const functionName = 'deposit';
    const { errorMessage, userWalletAddress, chainId, chain, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage || !chainId || !chain) {
      log(errorMessage || 'Missing chain information');
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage || 'Missing chain information'),
      };
    }

    const parsedAmount = parseUnits(amount.toString(), token.decimals);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const generatePermitSignatureArgs: [`0x${string}`, `0x${string}`, bigint, bigint] = [
      token.contractAddress as `0x${string}`,
      token.vaquitaContractAddress as `0x${string}`,
      parsedAmount,
      deadline,
    ];
    log('Generating permit signature', generatePermitSignatureArgs);
    const { signature } = await generatePermitSignature(...generatePermitSignatureArgs, log);
    log('Generated permit signature', { signature });

    const period = lockPeriod / 1000;
    const args = buildArgsFromInputs(abiFunction.inputs, {
      asset: token.contractAddress,
      amount: parsedAmount,
      period,
      deadline,
      signature,
      amountOutMin: 0,
      amount0Min: 0,
      amount1Min: 0,
    });
    const writeContractParams = {
      account: userWalletAddress,
      address: token.vaquitaContractAddress as `0x${string}`,
      abi: token.vaquitaContractAbi as Abi,
      functionName,
      args,
      chainId,
      chain,
    };

    const { txHash, transaction } = await privyWriteContract(writeContractParams, log);

    const depositIdHex = (transaction?.logs?.[transaction?.logs?.length - 1] as unknown as { topics: string[] })
      ?.topics?.[1];
    if (transaction.status?.toString()?.toLowerCase() !== 'success') {
      return {
        success: false,
        txHash,
        transaction,
        depositIdHex,
        explorer: '',
        error: new Error('Transaction failed: ' + transaction.status),
      };
    }
    return { success: true, txHash, transaction, depositIdHex, explorer: '', error: null };
  };

  const transactionWithdraw: WithdrawFn = async (_, depositIdHex, __, log) => {
    const functionName = 'withdraw';
    const { errorMessage, userWalletAddress, chainId, chain, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage || !chainId || !chain) {
      log(errorMessage || 'Missing chain information');
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage || 'Missing chain information'),
      };
    }

    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    const args = buildArgsFromInputs(abiFunction.inputs, {
      depositId: depositIdHex,
      amountOutMin: 0,
      amount0Min: 0,
      amount1Min: 0,
      deadline,
    });
    const writeContractParams = {
      account: userWalletAddress,
      address: token.vaquitaContractAddress as `0x${string}`,
      abi: token.vaquitaContractAbi as Abi,
      functionName,
      args,
      chainId,
      chain,
    };
    const { txHash, transaction } = await privyWriteContract(writeContractParams, log);
    if (transaction.status?.toString()?.toLowerCase() !== 'success') {
      return {
        success: false,
        txHash,
        transaction,
        explorer: '',
        error: new Error('Transaction failed: ' + transaction.status),
      };
    }

    return { success: true, txHash, transaction, explorer: '', error: null };
  };

  return {
    transactionDeposit,
    transactionWithdraw,
  };
};
