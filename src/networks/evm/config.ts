import { createConfig } from '@privy-io/wagmi';
import { metaMask } from '@wagmi/connectors';
import { http } from 'wagmi';
import { base, baseSepolia, coreTestnet2, lisk, scrollSepolia } from 'wagmi/chains';

export const config = createConfig({
  chains: [lisk, baseSepolia, scrollSepolia, coreTestnet2, base], // Pass your required chains as an array
  connectors: [metaMask()],
  transports: {
    [lisk.id]: http(),
    [baseSepolia.id]: http(),
    [scrollSepolia.id]: http(),
    [coreTestnet2.id]: http(),
    [base.id]: http(),
  },
});
