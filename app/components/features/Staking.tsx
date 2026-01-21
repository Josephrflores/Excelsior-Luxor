'use client';

import { useState } from 'react';
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import idl from '@/lib/idl.json';

const PROGRAM_ID = new PublicKey("ACvdkCFF3piATdcAXQemmdu5FWXVHfv7kv4Y5vT3jawS");
const XLS_MINT = new PublicKey("GM4vKHRrqg84mKRixpVr5FuLUNL45b5dFLqcYQQpwoki");

export function StakingInterface() {
    const { connection } = useConnection();
    const wallet = useAnchorWallet();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleStake = async () => {
        if (!wallet || !amount) return;
        setIsLoading(true);
        try {
            const provider = new AnchorProvider(connection, wallet, {});
            const program = new Program(idl as Idl, PROGRAM_ID, provider);

            const amountVal = parseFloat(amount);
            const amountAtomic = new BN(amountVal * 1_000_000_000);

            const [globalConfig] = PublicKey.findProgramAddressSync([Buffer.from("global_config")], PROGRAM_ID);
            const [userAccount] = PublicKey.findProgramAddressSync([Buffer.from("user_account"), wallet.publicKey.toBuffer()], PROGRAM_ID);

            const { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } = await import('@solana/spl-token');

            const userXls = getAssociatedTokenAddressSync(XLS_MINT, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);

            // Logic handled by contract: where does it go?
            // stakeXls logic uses xlsVaultStaking which is passed by client.
            // In test we used xlsVaultSupply. In real app, we should probably have a dedicated Staking Vault?
            // For now, let's assume xlsVaultSupply acts as the holding vault (since global_config owns it).
            const xlsVaultStaking = getAssociatedTokenAddressSync(XLS_MINT, globalConfig, true, TOKEN_2022_PROGRAM_ID);

            // Check if user needs to init
            try {
                await program.account.userAccount.fetch(userAccount);
            } catch (e) {
                console.log("Creating User Account...");
                await program.methods.initUser()
                    .accounts({
                        user: wallet.publicKey,
                        userAccount,
                        systemProgram: PublicKey.default // System Program ID
                    })
                    .rpc();
            }

            await program.methods.stakeXls(amountAtomic)
                .accounts({
                    user: wallet.publicKey,
                    globalConfig,
                    userAccount,
                    userXlsAccount: userXls,
                    xlsVaultStaking, // Use supply vault as staking vault for V1
                    xlsMint: XLS_MINT,
                    tokenProgram: TOKEN_2022_PROGRAM_ID
                })
                .rpc();

            alert("Staked Successfully!");

        } catch (e) {
            console.error(e);
            alert("Staking Failed: " + (e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Staking Vault" className="w-full">
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold mb-1 block">
                        Stake XLS
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 focus:outline-none transition-colors"
                        placeholder="0.00"
                    />
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">APY</span>
                    <span className="text-green-400 font-bold">12.5%</span>
                </div>
                <Button
                    onClick={handleStake}
                    isLoading={isLoading}
                    className="w-full"
                    disabled={!wallet}
                >
                    Stake & Earn
                </Button>
            </div>
        </Card>
    );
}
