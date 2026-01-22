"use client";

import { useEffect, useState } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { RefreshCw, AlertCircle, Eye, EyeOff, Edit2, Check, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#6366f1'];

export default function WalletGrid({ wallets }: { wallets: WalletInfo[] }) {
    const [balances, setBalances] = useState<Record<string, WalletBalance>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [visibleAddresses, setVisibleAddresses] = useState<Set<string>>(new Set());
    const [customNames, setCustomNames] = useState<Record<string, string>>({});
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editNameValue, setEditNameValue] = useState("");

    // Load custom names from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem("excelsior_wallet_names");
        if (stored) {
            setCustomNames(JSON.parse(stored));
        }
    }, []);

    const fetchBalances = async () => {
        setLoading(true);
        setError(null);

        try {
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");
            const walletKeys = wallets.map(w => new PublicKey(w.address));

            // 1. SOL
            const solAccounts = await connection.getMultipleAccountsInfo(walletKeys);

            // 2. ATAs
            const lxrAtas = walletKeys.map(key => getAssociatedTokenAddressSync(LXR_MINT, key, false, TOKEN_2022_PROGRAM_ID));
            const xlsAtas = walletKeys.map(key => getAssociatedTokenAddressSync(XLS_MINT, key, false, TOKEN_2022_PROGRAM_ID));

            // 3. Token Accounts
            const lxrAccounts = await connection.getMultipleAccountsInfo(lxrAtas);
            const xlsAccounts = await connection.getMultipleAccountsInfo(xlsAtas);

            const newBalances: Record<string, WalletBalance> = {};

            wallets.forEach((wallet, index) => {
                const solLamports = solAccounts[index]?.lamports || 0;

                let lxrAmount = 0;
                if (lxrAccounts[index]) {
                    const data = lxrAccounts[index]!.data;
                    if (data.length >= 72) lxrAmount = Number(data.readBigUInt64LE(64)) / 1_000_000_000;
                }

                let xlsAmount = 0;
                if (xlsAccounts[index]) {
                    const data = xlsAccounts[index]!.data;
                    if (data.length >= 72) xlsAmount = Number(data.readBigUInt64LE(64)) / 1_000_000_000;
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

    // Actions
    const toggleVisibility = (address: string) => {
        const next = new Set(visibleAddresses);
        if (next.has(address)) next.delete(address);
        else next.add(address);
        setVisibleAddresses(next);
    };

    const startEditing = (address: string, currentName: string) => {
        setEditingId(address);
        setEditNameValue(customNames[address] || currentName);
    };

    const saveName = (address: string) => {
        const next = { ...customNames, [address]: editNameValue };
        setCustomNames(next);
        localStorage.setItem("excelsior_wallet_names", JSON.stringify(next));
        setEditingId(null);
    };

    // Filter helpers
    const masterWallets = wallets.filter(w => w.type === "Master" || w.type === "System");
    const distWallets = wallets.filter(w => w.type === "Distribution");

    // Chart Data Preparation
    const chartData = masterWallets.map(w => ({
        name: customNames[w.address] || w.name.replace("master_", "").toUpperCase(),
        value: balances[w.address]?.lxr || 0
    })).filter(d => d.value > 0);

    const fmt = (n: number | undefined) => n ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">

                {/* Left: General Stats & Controls */}
                <div className="flex-1 w-full space-y-8">
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {masterWallets.map((wallet) => {
                            const bal = balances[wallet.address];
                            const displayName = customNames[wallet.address] || wallet.name.replace("master_", "").toUpperCase();
                            const isEditing = editingId === wallet.address;

                            return (
                                <div key={wallet.address} className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={editNameValue}
                                                    onChange={(e) => setEditNameValue(e.target.value)}
                                                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-indigo-500"
                                                />
                                                <button onClick={() => saveName(wallet.address)}><Check className="w-4 h-4 text-emerald-400" /></button>
                                                <button onClick={() => setEditingId(null)}><X className="w-4 h-4 text-red-400" /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-indigo-300 uppercase tracking-wider">{displayName}</span>
                                                <button onClick={() => startEditing(wallet.address, wallet.name)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Edit2 className="w-3 h-3 text-slate-500 hover:text-white" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-slate-500 text-xs font-mono truncate">
                                                {visibleAddresses.has(wallet.address) ? wallet.address : `${wallet.address.slice(0, 6)}...${wallet.address.slice(-6)}`}
                                            </p>
                                            <button onClick={() => toggleVisibility(wallet.address)}>
                                                {visibleAddresses.has(wallet.address) ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3 text-slate-600" />}
                                            </button>
                                        </div>
                                        <h3 className="text-2xl font-bold text-white tracking-tight">
                                            {bal ? `${fmt(bal.sol)} SOL` : <div className="h-8 w-24 bg-slate-800 animate-pulse rounded" />}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 pt-4 border-t border-slate-800/50">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">LXR Balance</span>
                                            <span className="text-sm font-semibold text-emerald-400">{bal ? fmt(bal.lxr) : '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400">XLS Balance</span>
                                            <span className="text-sm font-semibold text-amber-400">{bal ? fmt(bal.xls) : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: Charts */}
                <div className="w-full md:w-1/3 min-w-[300px]">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col justify-center items-center">
                        <h3 className="text-white font-medium mb-6">Distribution Overview (LXR)</h3>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                                        formatter={(value: any) => [`${Number(value).toLocaleString()} LXR`, 'Holdings']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full mt-4">
                            {chartData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2 text-xs text-slate-400">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="truncate">{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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
                                const displayName = customNames[wallet.address] || wallet.name;
                                const isEditing = editingId === wallet.address;

                                return (
                                    <tr key={wallet.address} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white group">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        value={editNameValue}
                                                        onChange={(e) => setEditNameValue(e.target.value)}
                                                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs w-32 focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <button onClick={() => saveName(wallet.address)}><Check className="w-3 h-3 text-emerald-400" /></button>
                                                    <button onClick={() => setEditingId(null)}><X className="w-3 h-3 text-red-400" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {displayName}
                                                    <button onClick={() => startEditing(wallet.address, wallet.name)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit2 className="w-3 h-3 text-slate-500 hover:text-white" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                                            <div className="flex items-center gap-2">
                                                {visibleAddresses.has(wallet.address) ? wallet.address : `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`}
                                                <button onClick={() => toggleVisibility(wallet.address)}>
                                                    {visibleAddresses.has(wallet.address) ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3 text-slate-600" />}
                                                </button>
                                            </div>
                                        </td>
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
