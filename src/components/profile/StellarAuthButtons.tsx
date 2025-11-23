'use client';

import { ConnectButton, WalletButton } from '@/core-ui/components';
import { isStellarWalletConnected, stellarSession } from '@/networks/stellar';

export default function StellarAuthButtons() {
  const { connect, logout } = stellarSession();
  const isConnected = isStellarWalletConnected();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex items-center gap-4">
      {isConnected ? (
        <WalletButton handleLogout={handleLogout} startContentSrc="/chains/stellar.png" startContentAlt="Stellar" />
      ) : (
        <ConnectButton onPress={connect} startContentSrc="/chains/stellar.png" startContentAlt="Stellar" />
      )}
    </div>
  );
}
