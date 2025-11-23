// import USDC from '@/abis/USDC.json';
// import VaquitaPool from '@/abis/VaquitaPoolScrollSepolia.json';
// import { getDecimals, getVaquitaContract, toHexFromAny } from '@/core-ui/helpers';
// import { DepositFn, NetworkResponseDTO, WithdrawFn } from '@/core-ui/types';
// import { getPrivyData } from '@/helpers/privy';
// import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
// import { scrollSepolia } from 'viem/chains';

// export const scrollTransactions = async (token: NetworkResponseDTO['tokens'][number]) => {
//   const getWalletClient = async () => {
//     const { wallets } = getPrivyData();

//     if (!wallets[0]) return null;

//     try {
//       const provider = await wallets[0].getEthereumProvider();
//       return createWalletClient({
//         chain: scrollSepolia,
//         transport: custom(provider),
//       });
//     } catch (error) {
//       console.error('Error getting wallet client:', error);
//       return null;
//     }
//   };

//   const publicClient = createPublicClient({
//     chain: scrollSepolia,
//     transport: http(),
//   });

//   const transactionDeposit: DepositFn = async (id: number, amount: number, lockPeriod: number, log) => {
//     const { ready, wallets, authenticated } = getPrivyData();
//     const vaquitaContract = getVaquitaContract();
//     const decimals = getDecimals();
//     if (!ready || !authenticated || !wallets[0] || !vaquitaContract) {
//       log('Missing wallet or contract addresses, or not authenticated.', {
//         ready,
//         authenticated,
//         wallets,
//         vaquitaContract,
//       });
//       return {
//         success: false,
//         txHash: '',
//         transaction: null,
//         explorer: '',
//         depositIdHex: '',
//         error: new Error('Missing wallet or contract addresses, or not authenticated.'),
//       };
//     }

//     const walletClient = await getWalletClient();
//     if (!walletClient) {
//       return {
//         success: false,
//         txHash: '',
//         transaction: null,
//         explorer: '',
//         depositIdHex: '',
//         error: new Error('Wallet client not available'),
//       };
//     }

//     const address = wallets[0].address as `0x${string}`;
//     const parsedAmount = parseUnits(amount.toString(), decimals);
//     const depositIdHex = await toHexFromAny(id, 16);
//     const deadline = Math.floor(Date.now() / 1000) + 3600;

//     log('Normalized depositIdHex', { depositIdHex });

//     const approveHash = await walletClient.writeContract({
//       account: address,
//       address: token.contract as `0x${string}`,
//       abi: USDC,
//       functionName: 'approve',
//       args: [token.vaquitaContract, parsedAmount],
//       chain: scrollSepolia,
//     });
//     await publicClient.waitForTransactionReceipt({ hash: approveHash });

//     const depositHash = await walletClient.writeContract({
//       account: address,
//       address: vaquitaContract as `0x${string}`,
//       abi: VaquitaPool.abi,
//       functionName: 'deposit',
//       args: [depositIdHex, parsedAmount, lockPeriod / 1000, BigInt(deadline), '0x'],
//       chain: scrollSepolia,
//     });
//     const transaction = await publicClient.waitForTransactionReceipt({ hash: depositHash });

//     return { success: true, txHash: depositHash, depositIdHex, transaction, explorer: '', error: null };
//   };

//   const transactionWithdraw: WithdrawFn = async (_: number, depositIdHex, log) => {
//     const { ready, wallets, authenticated } = getPrivyData();
//     const vaquitaContract = getVaquitaContract();

//     if (!ready || !authenticated || !wallets[0] || !vaquitaContract) {
//       log('Missing wallet or contract addresses, or not authenticated.', {
//         ready,
//         authenticated,
//         wallets,
//         vaquitaContract,
//       });
//       return {
//         success: false,
//         txHash: '',
//         transaction: null,
//         explorer: '',
//         error: new Error('Missing wallet or contract addresses.'),
//       };
//     }

//     const walletClient = await getWalletClient();
//     if (!walletClient) {
//       return {
//         success: false,
//         txHash: '',
//         transaction: null,
//         explorer: '',
//         error: new Error('Wallet client not available'),
//       };
//     }

//     const address = wallets[0].address as `0x${string}`;

//     const withdrawHash = await walletClient.writeContract({
//       account: address,
//       address: vaquitaContract as `0x${string}`,
//       abi: VaquitaPool.abi,
//       functionName: 'withdraw',
//       args: [depositIdHex],
//       chain: scrollSepolia,
//     });
//     const transaction = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

//     return { success: true, txHash: withdrawHash, transaction, explorer: '', error: null };
//   };

//   return {
//     transactionDeposit,
//     transactionWithdraw,
//   };
// };
