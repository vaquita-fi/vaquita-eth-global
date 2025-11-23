import { isBaseNetwork, isBaseSepoliaTestnetNetwork } from '@/networks/base';


export const isNewDepositHandled = (networkName: string) => {
  return isBaseSepoliaTestnetNetwork(networkName) || isBaseNetwork(networkName);
};
