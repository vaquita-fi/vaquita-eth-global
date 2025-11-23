'use client';

import { setPrivySendTransaction } from '@/networks/evm/privyWriteContract';
import { useWallets, useSendTransaction } from '@privy-io/react-auth';
import { useEffect } from 'react';

/**
 * Provider que inicializa la función sendTransaction de Privy
 * para que pueda ser usada desde cualquier lugar del código
 */
export function PrivyTransactionProvider() {
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();

  useEffect(() => {
    if (sendTransaction && wallets.length > 0) {
      // Guardar la función sendTransaction en el módulo para uso global
      setPrivySendTransaction(sendTransaction);
    }
  }, [sendTransaction, wallets]);

  return null;
}

