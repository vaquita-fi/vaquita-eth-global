import { NetworkResponseDTO } from '@/core-ui/types';
import { DepositFn, WithdrawFn } from '@/core-ui/types/transaction';
import { buildArgsFromInputs } from '@/networks/evm/buildArgsFromInputs';
import { generatePermitSignature } from '@/networks/evm/generatePermitSignature';
import { validateWagmi } from '@/networks/evm/validateWagmi';
import { evmWriteContract } from '@/networks/evm/writeContract';
import { type Abi, type AbiFunction, parseUnits } from 'viem';

export const baseTransactions = async (network: NetworkResponseDTO, token: NetworkResponseDTO['tokens'][number]) => {
  const transactionDeposit: DepositFn = async (_, amount, lockPeriod, log) => {
    const functionName = token.symbol === 'ETH' ? 'depositETH' : 'deposit';
    const { errorMessage, userWalletAddress, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage) {
      log(errorMessage, { token, functionName, network });
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage),
      };
    }
    log('Init transactionDeposit', { network, token });

    const parsedAmount = parseUnits(amount.toString(), token.decimals);
    const deadline = parseUnits((Math.floor(Date.now() / 1000) + 3600).toString(), 0);

    let signature = '0x';
    if (token.symbol === 'USDT' || token.symbol === 'cbBTC') {
      const functionName = 'approve';
      const abiFunction = token.contractAbi.find(
        (abi) => abi.type === 'function' && abi.name === functionName
      ) as AbiFunction;
      if (!abiFunction) {
        const errorMessage = 'ABI approve invalid function';
        log(errorMessage);
        return {
          success: false,
          txHash: '',
          transaction: null,
          explorer: '',
          depositIdHex: '',
          error: new Error(errorMessage),
        };
      }

      const args = buildArgsFromInputs(abiFunction.inputs, {
        spender: token.vaquitaContractAddress as `0x${string}`,
        amount: parsedAmount,
      });
      const writeContractParams = {
        account: userWalletAddress,
        address: token.contractAddress as `0x${string}`,
        abi: token.contractAbi as Abi,
        functionName,
        args,
        gas: 1000000n,
      };
      await evmWriteContract(writeContractParams, log);
    } else if (token.symbol === 'ETH') {
    } else {
      const generatePermitSignatureArgs: [`0x${string}`, `0x${string}`, bigint, bigint] = [
        token.contractAddress as `0x${string}`,
        token.vaquitaContractAddress as `0x${string}`,
        parsedAmount,
        deadline,
      ];
      log('Generating permit signature', generatePermitSignatureArgs);
      const response = await generatePermitSignature(...generatePermitSignatureArgs, log);
      signature = response.signature;
      log('Generated permit signature', { signature });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    let txHash = '';
    let transaction = null;
    if (token.symbol === 'ETH') {
      const period = lockPeriod / 1000;
      const args = buildArgsFromInputs(abiFunction.inputs, {
        period,
      });
      const writeContractParams = {
        account: userWalletAddress,
        address: token.vaquitaContractAddress as `0x${string}`,
        abi: token.vaquitaContractAbi as Abi,
        functionName,
        value: parsedAmount,
        args,
        gas: 1000000n,
      };
      ({ txHash, transaction } = await evmWriteContract(writeContractParams, log));
    } else {
      const period = lockPeriod / 1000;
      const args = buildArgsFromInputs(abiFunction.inputs, {
        asset: token.contractAddress,
        amount: parsedAmount,
        period,
        deadline,
        signature,
      });
      const writeContractParams = {
        account: userWalletAddress,
        address: token.vaquitaContractAddress as `0x${string}`,
        abi: token.vaquitaContractAbi as Abi,
        functionName,
        args,
        gas: 1000000n,
      };
      ({ txHash, transaction } = await evmWriteContract(writeContractParams, log));
    }

    const depositIdHex =
      (transaction?.logs?.[transaction?.logs?.length - 1] as unknown as { topics: string[] })?.topics?.[1] || '';
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

  const transactionWithdraw: WithdrawFn = async (_, depositIdHex, vaquitaContractAddress, log) => {
    const functionName = 'withdraw';
    const { errorMessage, userWalletAddress, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage) {
      log(errorMessage, { abiFunction, token, functionName });
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage),
      };
    }

    const args = buildArgsFromInputs(abiFunction.inputs, {
      depositId: depositIdHex,
    });
    const writeContractParams = {
      account: userWalletAddress,
      address: (vaquitaContractAddress || token.vaquitaContractAddress) as `0x${string}`,
      abi: token.vaquitaContractAbi,
      functionName,
      args,
      gas: 1000000n,
    };
    const { txHash, transaction } = await evmWriteContract(writeContractParams, log);

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
