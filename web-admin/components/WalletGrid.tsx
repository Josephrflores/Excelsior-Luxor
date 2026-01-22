
"use client";

import { useEffect, useState } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Loader2, RefreshCw } from "lucide-react";

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
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchBalances = async () => {
        setLoading(true);
        const connection = new Connection("https://api.devnet.solana.com", "confirmed");
        const newBalances: Record<string, WalletBalance> = {};

        // In a real app, use getMultipleAccounts or optimize this. For now, sequential/parallel is fine for 50.
        // We will batch them in groups of 10 to avoid rate limits slightly.
        const BATCH_SIZE = 5;
        for (let i = 0; i < wallets.length; i += BATCH_SIZE) {
            const batch = wallets.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (wallet) => {
                try {
                    const pubKey = new PublicKey(wallet.address);

                    // 1. Get SOL Balance
                    const sol = await connection.getBalance(pubKey);

                    // 2. Get Token Accounts
                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
                        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token Program
                        // Note: Token-2022 is separate. We should check both or assume Mint is Token-2022.
                        // Actually our Mints are Token-2022.
                    });

                    // Fetch Token-2022 Accounts (Important!)
                    const token2022Accounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
                        programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
                    });

                    let lxr = 0;
                    let xls = 0;

                    // Helper to parse accounts
                    const parse = (accounts: any) => {
                        for (const { account } of accounts.value) {
                            const info = account.data.parsed.info;
                            const mint = info.mint;
                            const amount = info.tokenAmount.uiAmount;

                            if (mint === LXR_MINT.toBase58()) lxr = amount;
                            if (mint === XLS_MINT.toBase58()) xls = amount;
                        }
                    };

                    parse(tokenAccounts);
                    parse(token2022Accounts);

                    newBalances[wallet.address] = {
                        sol: sol / LAMPORTS_PER_SOL,
                        lxr,
                        xls
                    };

                } catch (e) {
                    console.error(`Failed to fetch for ${wallet.name}`, e);
                }
            }));
            // Small delay
            await new Promise(r => setTimeout(r, 200));
        }

        setBalances(newBalances);
        setLastUpdated(new Date());
        setLoading(false);
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
                <button
                    onClick={fetchBalances}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Syncing...' : 'Refresh Data'}
                </button>
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
                                    <span className="text-sm font-semibold text-emerald-400">{fmt(bal?.lxr)}</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-950/50 p-2 rounded">
                                    <span className="text-xs text-slate-400">XLS Balance</span>
                                    <span className="text-sm font-semibold text-amber-400">{fmt(bal?.xls)}</span>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Wallet Name</th>
                                <th className="px-6 py-3">Address</th>
                                <th className="px-6 py-3 text-right">SOL</th>
                                <th className="px-6 py-3 text-right">LXR</th>
                                <th className="px-6 py-3 text-right">XLS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {distWallets.map((wallet) => {
                                const bal = balances[wallet.address];
                                return (
                                    <tr key={wallet.address} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{wallet.name}</td>
                                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{wallet.address.slice(0, 4)}...{wallet.address.slice(-4)}</td>
                                        <td className="px-6 py-4 text-right text-slate-300">{fmt(bal?.sol)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-400 font-mono">{fmt(bal?.lxr)}</td>
                                        <td className="px-6 py-4 text-right text-amber-400 font-mono">{fmt(bal?.xls)}</td>
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
