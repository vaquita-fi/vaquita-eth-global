import { isBaseNetwork, isBaseSepoliaTestnetNetwork } from '@/networks/base';
import { isCoreNetwork } from '@/networks/core';
import { isLiskNetwork } from '@/networks/lisk';
import { isScrollNetwork } from '@/networks/scroll';

export const isEvmTypeNetwork = (networkName: string) => {
  return (
    isLiskNetwork(networkName) ||
    isCoreNetwork(networkName) ||
    isBaseSepoliaTestnetNetwork(networkName) ||
    isBaseNetwork(networkName) ||
    isScrollNetwork(networkName)
  );
};
