import { DepositFn } from '@/core-ui/types';
import { config } from '@/networks/evm/config';
import { waitForTransactionReceipt, writeContract, WriteContractParameters } from '@wagmi/core';

export const evmWriteContract = async (writeContractParams: WriteContractParameters, log: Parameters<DepositFn>[3]) => {
  log('Writing contract', writeContractParams);
  const hash = await writeContract(config as never, writeContractParams as never);

  log(`Waiting for transaction receipt hash: "${hash}"`);
  const transaction = await waitForTransactionReceipt(config, { hash });
  return { txHash: hash, transaction };
};
