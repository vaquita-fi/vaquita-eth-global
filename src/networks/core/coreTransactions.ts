// import VaquitaPool from '@/abis/VaquitaPoolCoreTestnet2.json';
// import { createPublicClient, createWalletClient, custom, http, parseUnits } from 'viem';
// import { coreTestnet2 } from 'viem/chains';
// import { getDecimals, getVaquitaContract, toHexFromAny } from '../../core-ui/helpers';
// import { DepositFn, WithdrawFn } from '../../core-ui/types';
// import { getPrivyData } from '../../helpers/privy';

// export const coreTransactions = async () => {
//   const getWalletClient = async () => {
//     const { wallets } = getPrivyData();

//     if (!wallets[0]) return null;

//     try {
//       const provider = await wallets[0].getEthereumProvider();
//       return createWalletClient({
//         chain: coreTestnet2,
//         transport: custom(provider),
//       });
//     } catch (error) {
//       console.error('Error getting wallet client:', error);
//       return null;
//     }
//   };

//   const publicClient = createPublicClient({
//     chain: coreTestnet2,
//     transport: http(),
//   });

//   const transactionDeposit: DepositFn = async (id: number, amount: number, lockPeriod, log) => {
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
//     log('Normalized depositIdHex', { depositIdHex });

//     const depositHash = await walletClient.writeContract({
//       account: address,
//       address: vaquitaContract as `0x${string}`,
//       abi: VaquitaPool,
//       functionName: 'deposit',
//       value: parsedAmount,
//       // TODO: 604800 means 1 week
//       args: [depositIdHex, lockPeriod / 1000], // pass empty bytes for signature
//       chain: coreTestnet2,
//     });
//     const transaction = await publicClient.waitForTransactionReceipt({ hash: depositHash });

//     return { success: true, txHash: depositHash, transaction, depositIdHex, explorer: '', error: null };
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
//         error: new Error('Wallet client not available'),
//       };
//     }

//     const address = wallets[0].address as `0x${string}`;

//     const withdrawHash = await walletClient.writeContract({
//       account: address,
//       address: vaquitaContract as `0x${string}`,
//       abi: VaquitaPool,
//       functionName: 'withdraw',
//       args: [depositIdHex],
//       chain: coreTestnet2,
//     });
//     const transaction = await publicClient.waitForTransactionReceipt({ hash: withdrawHash });

//     return { success: true, txHash: withdrawHash, transaction, explorer: '', error: null };
//   };

//   return {
//     transactionDeposit,
//     transactionWithdraw,
//   };
// };
