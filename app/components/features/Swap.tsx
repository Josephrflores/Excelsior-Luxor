'use client';

import { useState } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button'; // Adjust pathes if needed (using @/ alias usually works in Next.js)
import { Card } from '@/components/ui/card';
import idl from '@/lib/idl.json'; // Ensure this matches path

// Constants
const PROGRAM_ID = new PublicKey("ACvdkCFF3piATdcAXQemmdu5FWXVHfv7kv4Y5vT3jawS");
const LXR_MINT = new PublicKey("7Qm6qUCXGZfGBYYFzq2kTbwTDah5r3d9DcPJHRT8Wdth");
const XLS_MINT = new PublicKey("GM4vKHRrqg84mKRixpVr5FuLUNL45b5dFLqcYQQpwoki");

export function SwapInterface() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<'buy' | 'redeem'>('buy');

    const handleSwap = async () => {
        if (!wallet || !amount) return;
        setIsLoading(true);

        try {
            const provider = new AnchorProvider(connection, wallet, {});
            const program = new Program(idl as Idl, PROGRAM_ID, provider);

            // Convert amount to atomic units (Decimals 9)
            // 1 XLS = 1,000,000 LXR
            // Input is XLS amount desired?
            const amountVal = parseFloat(amount);
            const amountAtomic = new BN(amountVal * 1_000_000_000);

            // Derive PDAs
            const [globalConfig] = PublicKey.findProgramAddressSync([Buffer.from("global_config")], PROGRAM_ID);

            // Get Associated Token Accounts (need to be derived or passed)
            // Ideally we use getAssociatedTokenAddressSync
            const { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token');

            const userLxr = getAssociatedTokenAddressSync(LXR_MINT, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);
            const userXls = getAssociatedTokenAddressSync(XLS_MINT, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);

            const xlsVaultSupply = getAssociatedTokenAddressSync(XLS_MINT, globalConfig, true, TOKEN_2022_PROGRAM_ID);
            const rwaVaultLxr = getAssociatedTokenAddressSync(LXR_MINT, globalConfig, true, TOKEN_2022_PROGRAM_ID);

            if (mode === 'buy') {
                // Buy XLS
                await program.methods.buyXls(amountAtomic)
                    .accounts({
                        user: wallet.publicKey,
                        globalConfig,
                        userLxrAccount: userLxr, // Ensure exists? Usually client handles creation or instruction does if init_if_needed
                        userXlsAccount: userXls,
                        xlsVaultSupply,
                        rwaVaultLxr,
                        xlsMint: XLS_MINT,
                        lxrMint: LXR_MINT,
                        tokenProgram: TOKEN_2022_PROGRAM_ID
                    })
                    .rpc();
                alert("Swap Successful!");
            } else {
                // Redeem XLS
                await program.methods.redeemXls(amountAtomic)
                    .accounts({
                        user: wallet.publicKey,
                        globalConfig,
                        userLxrAccount: userLxr,
                        userXlsAccount: userXls,
                        xlsVaultSupply,
                        rwaVaultLxr,
                        xlsMint: XLS_MINT,
                        lxrMint: LXR_MINT,
                        tokenProgram: TOKEN_2022_PROGRAM_ID
                    })
                    .rpc();
                alert("Redemption Successful!");
            }

        } catch (e) {
            console.error(e);
            alert("Transaction Failed: " + (e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Swap / Redeem" className="w-full max-w-md mx-auto">
            <div className="flex gap-2 p-1 bg-white/5 rounded-lg mb-4">
                <button
                    onClick={() => setMode('buy')}
                    className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${mode === 'buy' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Buy XLS
                </button>
                <button
                    onClick={() => setMode('redeem')}
                    className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${mode === 'redeem' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                >
                    Redeem
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">
                        Amount ({mode === 'buy' ? 'XLS to Buy' : 'XLS to Burn'})
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
                        placeholder="0.00"
                    />
                </div>

                <div className="p-3 bg-white/5 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Price</span>
                        <span className="text-white font-mono">1,000,000 LXR</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Est. Cost</span>
                        <span className="text-amber-500 font-mono">
                            {amount ? (parseFloat(amount) * 1_000_000).toLocaleString() : '0'} LXR
                        </span>
                    </div>
                </div>

                <Button
                    onClick={handleSwap}
                    isLoading={isLoading}
                    className="w-full"
                    disabled={!wallet}
                >
                    {wallet ? (mode === 'buy' ? 'Buy Excelsior' : 'Redeem for Luxor') : 'Connect Wallet'}
                </Button>
            </div>
        </Card>
    );
}
