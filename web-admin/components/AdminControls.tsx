"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState } from "react";
import { Program, AnchorProvider, BN, Idl, web3 } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { AlertCircle, CheckCircle, Zap, Coins } from "lucide-react";
import idl from "../lib/idl.json";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// Config Addresses from your setup
const PROGRAM_ID = new PublicKey("CihitmkdTdh48gvUZSjU7rZ8EARQksJNxspwnRu7ZhAp");
const ADMIN_ADDRESS = "7EdDpmBEvhw1v79ysqQrEK7iHDVzBaRPuwnUDP2vu3Lk";

export default function AdminControls() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState<string>("0");

    // We need to reconstruct the provider
    const getProgram = () => {
        if (!wallet.publicKey || !wallet.signTransaction) return null;

        // This is a bit of a hack for AnchorProvider with Wallet Adapter
        // We need an object that mimics the Wallet interface expected by Anchor
        const anchorWallet = {
            publicKey: wallet.publicKey,
            signTransaction: wallet.signTransaction,
            signAllTransactions: wallet.signAllTransactions,
        };

        const provider = new AnchorProvider(connection, anchorWallet, {
            preflightCommitment: "confirmed",
        });

        // Cast idl to Idl type
        return new Program(idl as unknown as Idl, PROGRAM_ID, provider);
    };

    const handleDistribute = async () => {
        if (!wallet.publicKey) return;
        setStatus("loading");
        setMessage("Preparing Distribution...");

        try {
            const program = getProgram();
            if (!program) throw new Error("Wallet not connected");

            const amountVal = parseFloat(amount);
            if (isNaN(amountVal) || amountVal <= 0) throw new Error("Invalid Amount");
            const amountBN = new BN(amountVal * 1_000_000_000); // 9 decimals

            // derive GlobalConfig PDA
            const [globalConfigPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("global_config")],
                PROGRAM_ID
            );

            // Fetch Global Config to get vaults
            const configAccount = await program.account["globalConfig"].fetch(globalConfigPda);

            // Reconstruct keys
            const rwaVaultLxr = configAccount.rwaVaultLxr as PublicKey;
            const lxrVaultRewards = configAccount.lxrVaultRewards as PublicKey;
            const lxrMint = configAccount.lxrMint as PublicKey;

            // Admin source ATA
            const adminLxrAccount = getAssociatedTokenAddressSync(lxrMint, wallet.publicKey);

            // Send Tx
            const tx = await program.methods.distributeRent(amountBN)
                .accounts({
                    admin: wallet.publicKey,
                    globalConfig: globalConfigPda,
                    adminLxrAccount: adminLxrAccount,
                    rwaVaultLxr: rwaVaultLxr,
                    lxrVaultRewards: lxrVaultRewards,
                    lxrMint: lxrMint,
                })
                .rpc();

            console.log("Tx:", tx);
            setStatus("success");
            setMessage(`Distributed ${amountVal} LXR! Tx: ${tx.slice(0, 8)}...`);

        } catch (e: any) {
            console.error(e);
            setStatus("error");
            setMessage(e.message || "Transaction Failed");
        }
    };

    const handleInflation = async () => {
        if (!wallet.publicKey) return;
        setStatus("loading");
        setMessage("Triggering Inflation...");

        try {
            const program = getProgram();
            if (!program) throw new Error("Wallet not connected");

            const [globalConfigPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("global_config")],
                PROGRAM_ID
            );

            const configAccount = await program.account["globalConfig"].fetch(globalConfigPda);
            const lxrMint = configAccount.lxrMint as PublicKey;

            // Sending to Master Reserve as per plan
            const masterReserve = new PublicKey("3cRzxn7NvpKWuwGjbSQwS2SbsrLwn1g9LY8ke1GZTB8i");

            const tx = await program.methods.triggerInflation()
                .accounts({
                    admin: wallet.publicKey,
                    globalConfig: globalConfigPda,
                    lxrMint: lxrMint,
                    reserveWallet: masterReserve,
                })
                .rpc();

            setStatus("success");
            setMessage(`Inflation Triggered! Tx: ${tx.slice(0, 8)}...`);

        } catch (e: any) {
            console.error(e);
            setStatus("error");
            setMessage(e.message || "Transaction Failed");
        }
    };

    if (!wallet.connected) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-white font-medium mb-4">Admin Access</h3>
                <div className="flex justify-center md:justify-start">
                    <WalletMultiButton />
                </div>
            </div>
        );
    }

    if (wallet.publicKey?.toBase58() !== ADMIN_ADDRESS) {
        return (
            <div className="bg-slate-900 border border-red-900/50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-red-400 font-medium">Unauthorized Access</h3>
                    <WalletMultiButton />
                </div>
                <p className="text-slate-400 text-sm">
                    This wallet ({wallet.publicKey.toBase58().slice(0, 4)}...{wallet.publicKey.toBase58().slice(-4)}) is not the registered Protocol Admin.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-400" />
                    Protocol Controls
                </h3>
                <WalletMultiButton />
            </div>

            {/* Status Message */}
            {status !== 'idle' && (
                <div className={`p-3 rounded-lg mb-6 text-sm flex items-center gap-2 ${status === 'error' ? 'bg-red-500/10 text-red-400' :
                        status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-blue-500/10 text-blue-400'
                    }`}>
                    {status === 'error' ? <AlertCircle className="w-4 h-4" /> :
                        status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dividends */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <h4 className="text-slate-300 font-medium mb-2 flex items-center gap-2">
                        <Coins className="w-4 h-4" /> Distribute Dividends
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 h-10">
                        Distributes LXR from Admin Wallet to RWA Vault (60%) and Stakers (40%).
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white w-full text-sm focus:outline-none focus:border-indigo-500"
                            placeholder="Amount LXR"
                        />
                        <button
                            onClick={handleDistribute}
                            disabled={status === 'loading'}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Distribute
                        </button>
                    </div>
                </div>

                {/* Inflation */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <h4 className="text-slate-300 font-medium mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Trigger Inflation
                    </h4>
                    <p className="text-xs text-slate-500 mb-4 h-10">
                        Mints 2.5% supply to Reserve.
                        <span className="block text-slate-600 mt-1">Requires 5-year interval.</span>
                    </p>
                    <button
                        onClick={handleInflation}
                        disabled={status === 'loading'}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        Trigger Event
                    </button>
                </div>
            </div>
        </div>
    );
}
