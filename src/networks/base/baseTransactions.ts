import { NetworkResponseDTO } from '@/core-ui/types';
import { DepositFn, WithdrawFn } from '@/core-ui/types/transaction';
import { buildArgsFromInputs } from '@/networks/evm/buildArgsFromInputs';
import { generatePermitSignature } from '@/networks/evm/generatePermitSignature';
import { privyWriteContract } from '@/networks/evm/privyWriteContract';
import { validateWagmi } from '@/networks/evm/validateWagmi';
import { config } from '@/networks/evm/config';
import { readContract } from '@wagmi/core';
import { erc20Abi, type Abi, type AbiFunction, parseUnits } from 'viem';

export const baseTransactions = async (network: NetworkResponseDTO, token: NetworkResponseDTO['tokens'][number]) => {
  const transactionDeposit: DepositFn = async (_, amount, lockPeriod, log) => {
    const functionName = token.symbol === 'ETH' ? 'depositETH' : 'deposit';
    const { errorMessage, userWalletAddress, chainId, chain, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage || !chainId || !chain) {
      log(errorMessage || 'Missing chain information', { token, functionName, network });
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage || 'Missing chain information'),
      };
    }
    log('Init transactionDeposit', { 
      network: network?.name, 
      token: token.symbol, 
      contractAddress: token.contractAddress,
      vaquitaContract: token.vaquitaContractAddress,
      amount 
    });

    const parsedAmount = parseUnits(amount.toString(), token.decimals);
    const deadline = parseUnits((Math.floor(Date.now() / 1000) + 3600).toString(), 0);

    let signature = '0x';
    let needsApprove = false;
    
    // Para tokens ERC20 (no ETH), necesitamos verificar allowance y hacer approve si es necesario
    if (token.symbol !== 'ETH') {
      log('Processing ERC20 token, checking allowance...', { token: token.symbol });
      try {
        // Verificar allowance actual
        const currentAllowance = await readContract(config, {
          address: token.contractAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userWalletAddress, token.vaquitaContractAddress as `0x${string}`],
        }) as bigint;

        log('Current allowance', { currentAllowance: currentAllowance.toString(), parsedAmount: parsedAmount.toString() });

        // Si el allowance es insuficiente, necesitamos hacer approve o permit
        if (currentAllowance < parsedAmount) {
          needsApprove = true;
          
          // Intentar usar permit para tokens que lo soportan (excepto USDT y cbBTC que siempre usan approve)
          if (token.symbol !== 'USDT' && token.symbol !== 'cbBTC') {
            try {
              log('Attempting to use permit signature');
              const generatePermitSignatureArgs: [`0x${string}`, `0x${string}`, bigint, bigint] = [
                token.contractAddress as `0x${string}`,
                token.vaquitaContractAddress as `0x${string}`,
                parsedAmount,
                deadline,
              ];
              const response = await generatePermitSignature(...generatePermitSignatureArgs, log);
              signature = response.signature;
              log('Generated permit signature successfully', { signature });
              // IMPORTANTE: Aún necesitamos hacer approve para que la simulación de Privy funcione
              // El contrato puede usar el permit si está disponible, pero el approve asegura que la simulación pase
              needsApprove = true;
              await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (permitError) {
              log('Permit failed, will use approve instead', { permitError });
              signature = '0x';
              needsApprove = true;
            }
          }

          // Siempre hacer approve para asegurar que la simulación de Privy funcione
          // El contrato puede usar el permit si está disponible, pero el approve es necesario para la simulación
          if (needsApprove) {
            log('Executing approve transaction', { 
              hasPermit: signature !== '0x',
              reason: signature !== '0x' 
                ? 'Approve needed for Privy simulation even with permit' 
                : 'Approve needed (no permit available)'
            });
            
            // Usar erc20Abi de viem que garantiza tener la función approve estándar
            const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
            const approveWriteContractParams = {
              account: userWalletAddress,
              address: token.contractAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: 'approve',
              args: [token.vaquitaContractAddress as `0x${string}`, maxApproval],
              chainId,
              chain,
            };
            
            log('Sending approve transaction with Privy', {
              ...approveWriteContractParams,
              userWalletAddress,
              tokenContract: token.contractAddress,
              vaquitaContract: token.vaquitaContractAddress,
            });
            const approveResult = await privyWriteContract(approveWriteContractParams, log);
            log('Approve transaction completed', { txHash: approveResult.txHash, status: approveResult.transaction.status });
            
            // Verificar que el approve se haya completado correctamente
            if (approveResult.transaction.status?.toString()?.toLowerCase() !== 'success') {
              return {
                success: false,
                txHash: approveResult.txHash,
                transaction: approveResult.transaction,
                explorer: '',
                depositIdHex: '',
                error: new Error('Approve transaction failed: ' + approveResult.transaction.status),
              };
            }
            
            // Esperar más tiempo para que el estado se propague en la blockchain
            // Esto es crítico para Privy porque simula la transacción antes de enviarla
            log('Waiting for approve to propagate on blockchain...');
            await new Promise((resolve) => setTimeout(resolve, 3000));
            
            // Verificar múltiples veces el allowance después del approve
            let newAllowance = 0n;
            let retries = 0;
            const maxRetries = 5;
            
            while (retries < maxRetries) {
              try {
                newAllowance = await readContract(config, {
                  address: token.contractAddress as `0x${string}`,
                  abi: erc20Abi,
                  functionName: 'allowance',
                  args: [userWalletAddress, token.vaquitaContractAddress as `0x${string}`],
                }) as bigint;
                
                log(`Allowance check attempt ${retries + 1}`, { 
                  newAllowance: newAllowance.toString(), 
                  parsedAmount: parsedAmount.toString(),
                  sufficient: newAllowance >= parsedAmount
                });
                
                if (newAllowance >= parsedAmount) {
                  log('Allowance confirmed sufficient!');
                  break;
                }
                
                retries++;
                if (retries < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
              } catch (error) {
                log('Error checking allowance after approve', { error, retry: retries + 1 });
                retries++;
                if (retries < maxRetries) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                }
              }
            }
            
            if (newAllowance < parsedAmount) {
              log('WARNING: Allowance still insufficient after approve and retries', {
                newAllowance: newAllowance.toString(),
                parsedAmount: parsedAmount.toString(),
              });
              // Continuar de todas formas - el approve se ejecutó, puede ser un problema de sincronización
            }
          }
        } else {
          log('Allowance sufficient, skipping approve');
        }
      } catch (error) {
        log('Error checking allowance, attempting approve anyway', { error });
        // Si falla la verificación, intentar approve de todas formas
        // Usar erc20Abi de viem que garantiza tener la función approve estándar
        const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        const approveWriteContractParams = {
          account: userWalletAddress,
          address: token.contractAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [token.vaquitaContractAddress as `0x${string}`, maxApproval],
          chainId,
          chain,
        };
        log('Sending approve transaction (fallback)', approveWriteContractParams);
        const approveResult = await privyWriteContract(approveWriteContractParams, log);
        log('Approve transaction completed (fallback)', { txHash: approveResult.txHash, status: approveResult.transaction.status });
        
        if (approveResult.transaction.status?.toString()?.toLowerCase() !== 'success') {
          return {
            success: false,
            txHash: approveResult.txHash,
            transaction: approveResult.transaction,
            explorer: '',
            depositIdHex: '',
            error: new Error('Approve transaction failed: ' + approveResult.transaction.status),
          };
        }
        
        // Esperar más tiempo para que el estado se propague en la blockchain
        log('Waiting for approve to propagate on blockchain (fallback)...');
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    
    // Verificación final antes del depósito
    if (token.symbol !== 'ETH') {
      try {
        const finalAllowanceCheck = await readContract(config, {
          address: token.contractAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [userWalletAddress, token.vaquitaContractAddress as `0x${string}`],
        }) as bigint;
        log('Final allowance check before deposit', {
          allowance: finalAllowanceCheck.toString(),
          amount: parsedAmount.toString(),
          sufficient: finalAllowanceCheck >= parsedAmount,
          usingPermit: signature !== '0x',
        });
      } catch (error) {
        log('Error in final allowance check', { error });
      }
    }
    
    log('Proceeding with deposit transaction...', {
      token: token.symbol,
      usingPermit: signature !== '0x',
    });
    
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
        chainId,
        chain,
      };
      ({ txHash, transaction } = await privyWriteContract(writeContractParams, log));
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
        chainId,
        chain,
      };
      ({ txHash, transaction } = await privyWriteContract(writeContractParams, log));
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
    const { errorMessage, userWalletAddress, chainId, chain, abiFunction = { inputs: [] } } = await validateWagmi(token, functionName);
    if (errorMessage || !chainId || !chain) {
      log(errorMessage || 'Missing chain information', { abiFunction, token, functionName });
      return {
        success: false,
        txHash: '',
        transaction: null,
        explorer: '',
        depositIdHex: '',
        error: new Error(errorMessage || 'Missing chain information'),
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
