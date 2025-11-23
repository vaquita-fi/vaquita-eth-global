'use client';

import { DummyAuthButtons, NetworkSelector } from '@/core-ui/components';
import { isEvmType } from '@/core-ui/helpers';
import { useNetworks } from '@/core-ui/hooks';
import { useNetworkConfigStore } from '@/core-ui/stores';
import { isDummyNetwork } from '@/networks/dummy';
import { isEvmTypeNetwork } from '@/networks/evm';
import { isStellarNetwork } from '@/networks/stellar';
import PrivyAuthButtons from './PrivyButtons';
import StellarAuthButtons from './StellarAuthButtons';

export const AuthButtons = () => {
  const { network } = useNetworkConfigStore();
  const {
    data: { types },
  } = useNetworks();
  if (types.length === 0) {
    return null;
  }
  return (
    <div className="absolute top-0 left-0 right-0">
      <div className="flex justify-end gap-1 w-full">
        <NetworkSelector />
        {network && isStellarNetwork(network.name) && <StellarAuthButtons />}
        {network && (isEvmType(types).isUnique || isEvmTypeNetwork(network.name)) && <PrivyAuthButtons />}
        {isDummyNetwork() && <DummyAuthButtons />}
      </div>
    </div>
  );
};
