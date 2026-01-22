"use client";

import { useEffect, useState } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { RefreshCw, AlertCircle } from "lucide-react";

// Types corresponding to our JSON
interface WalletInfo {
    name: string;
    address: string;
    type: "Master" | "Distribution" | "System";
}

// Token Mints on Devnet
const LXR_MINT = new PublicKey("7Qm6qUCXGZfGBYYFzq2kTbwTDah5r3d9DcPJHRT8Wdth");
const XLS_MINT = new PublicKey("GM4vKHRrqg84mKRixpVr5FuLUNL45b5dFLqcYQQpwoki");

interface WalletBalance {
    sol: number;
    lxr: number;
    xls: number;
}

export default function WalletGrid({ wallets }: { wallets: WalletInfo[] }) {
    const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalances = async () => {
        setLoading(true);
        setError(null);

        try {
            // Using a public RPC endpoint. If this fails, consider a dedicated QuickNode/Helius endpoint.
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");

            const walletKeys = wallets.map(w => new PublicKey(w.address));

            // 1. Fetch SOL Balances (Batched)
            // getMultipleAccountsInfo supports up to 100 accounts per call. We have ~55.
            const solAccounts = await connection.getMultipleAccountsInfo(walletKeys);

            // 2. Prepare ATAs for Tokens (LXR & XLS)
            // We use Token-2022 Program ID as per project specs
            const lxrAtas = walletKeys.map(key => getAssociatedTokenAddressSync(LXR_MINT, key, false, TOKEN_2022_PROGRAM_ID));
            const xlsAtas = walletKeys.map(key => getAssociatedTokenAddressSync(XLS_MINT, key, false, TOKEN_2022_PROGRAM_ID));

            // 3. Fetch Token Accounts (Batched)
            const lxrAccounts = await connection.getMultipleAccountsInfo(lxrAtas);
            const xlsAccounts = await connection.getMultipleAccountsInfo(xlsAtas);

            const newBalances: Record<string, WalletBalance> = {};

            wallets.forEach((wallet, index) => {
                // Parse SOL
                const solLamports = solAccounts[index]?.lamports || 0;

                // Parse LXR (Manual Layout Parsing for efficiency)
                // Layout: Mint(32) + Owner(32) + Amount(8) + ...
                // The amount is at offset 64. It looks like a u64 (little endian).
                let lxrAmount = 0;
                if (lxrAccounts[index]) {
                    const data = lxrAccounts[index]!.data;
                    if (data.length >= 72) { // 64 offset + 8 bytes
                        lxrAmount = Number(data.readBigUInt64LE(64)) / 1_000_000_000; // Decimals 9
                    }
                }

                // Parse XLS
                let xlsAmount = 0;
                if (xlsAccounts[index]) {
                    const data = xlsAccounts[index]!.data;
                    if (data.length >= 72) {
                        xlsAmount = Number(data.readBigUInt64LE(64)) / 1_000_000_000; // Decimals 9
                    }
                }

                newBalances[wallet.address] = {
                    sol: solLamports / LAMPORTS_PER_SOL,
                    lxr: lxrAmount,
                    xls: xlsAmount
                };
            });

            setBalances(newBalances);

        } catch (e: any) {
            console.error("Fetch error:", e);
            setError(e.message || "Failed to sync with Solana Network");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalances();
    }, []);

    const masterWallets = wallets.filter(w => w.type === "Master" || w.type === "System");
    const distWallets = wallets.filter(w => w.type === "Distribution");

    // Helper to format numbers
    const fmt = (n: number | undefined) => n ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-slate-400">Network Overview</h2>
                <div className="flex items-center gap-4">
                    {error && (
                        <div className="flex items-center text-red-400 text-sm gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <button
                        onClick={fetchBalances}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Syncing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Master Wallets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {masterWallets.map((wallet) => {
                    const bal = balances[wallet.address];
                    return (
                        <div key={wallet.address} className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded uppercase tracking-wider font-bold">
                                    {wallet.name.replace("master_", "").toUpperCase()}
                                </span>
                            </div>

                            <div className="mb-4">
                                <p className="text-slate-500 text-xs font-mono mb-1 truncate w-40">{wallet.address}</p>
                                <h3 className="text-2xl font-bold text-white tracking-tight">
                                    {bal ? `${fmt(bal.sol)} SOL` : <div className="h-8 w-24 bg-slate-800 animate-pulse rounded" />}
                                </h3>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-800/50">
                                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                                    <span className="text-xs text-slate-400">LXR Balance</span>
                                    <span className="text-sm font-semibold text-emerald-400">{bal ? fmt(bal.lxr) : '-'}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                                    <span className="text-xs text-slate-400">XLS Balance</span>
                                    <span className="text-sm font-semibold text-amber-400">{bal ? fmt(bal.xls) : '-'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Distribution Wallets Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="font-semibold text-white">Distribution Fleet ({distWallets.length})</h3>
                </div>
                <div className="overflow-x-auto h-[600px]">
                    <table className="w-full text-sm text-left relative">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 bg-slate-950">Wallet Name</th>
                                <th className="px-6 py-3 bg-slate-950">Address</th>
                                <th className="px-6 py-3 text-right bg-slate-950">SOL</th>
                                <th className="px-6 py-3 text-right bg-slate-950">LXR</th>
                                <th className="px-6 py-3 text-right bg-slate-950">XLS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 overflow-y-auto">
                            {distWallets.map((wallet) => {
                                const bal = balances[wallet.address];
                                return (
                                    <tr key={wallet.address} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{wallet.name}</td>
                                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}</td>
                                        <td className="px-6 py-4 text-right text-slate-300">{bal ? fmt(bal.sol) : '-'}</td>
                                        <td className="px-6 py-4 text-right text-emerald-400 font-mono">{bal ? fmt(bal.lxr) : '-'}</td>
                                        <td className="px-6 py-4 text-right text-amber-400 font-mono">{bal ? fmt(bal.xls) : '-'}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
