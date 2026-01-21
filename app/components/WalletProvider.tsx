'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

export const AppWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // Default to Devnet as per plan
    const network = WalletAdapterNetwork.Devnet;

    // Use default RPC or custom one if needed
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            // new PhantomWalletAdapter(), // Phantom autodetection usually works without explicit adapter in standardized setups, but explicit is fine.
            // Actually newer adapter logic prefers Standard Wallet Adapter.
            // But let's keep it simple.
        ],
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
