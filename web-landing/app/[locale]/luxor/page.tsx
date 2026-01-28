'use client';

import { motion } from 'framer-motion';
import { Flame, Coins, ExternalLink } from 'lucide-react';

export default function LuxorPage() {
    return (
        <div className="min-h-screen bg-black pt-12 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="inline-block px-4 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-sm font-semibold mb-6"
                    >
                        POWERED BY SOLANA
                    </motion.div>
                    <h1 className="text-5xl md:text-8xl font-black text-white mb-6 uppercase tracking-tighter">
                        LUXOR <span className="text-pink-500">$LXR</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        The hyper-deflationary engine of the ecosystem. Every transaction burns supply, fueling scarcity.
                    </p>
                </div>

                {/* Burn Mechanics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                    <div className="col-span-1 md:col-span-2 p-10 rounded-3xl bg-gradient-to-br from-pink-900/20 to-purple-900/10 border border-white/10 backdrop-blur-xl flex flex-col justify-center">
                        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                            <Flame className="text-orange-500" size={32} /> The Inferno Mechanism
                        </h2>
                        <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                            Designed to reward holders. A <strong>1% fee</strong> is applied to every transaction (Buy/Sell/Transfer).
                            This feel is automatically collected and sent to the Treasury to acquire assets, while the circulating supply permanently decreases.
                        </p>
                        <div className="flex gap-4">
                            <button className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2">
                                Buy on Raydium <ExternalLink size={18} />
                            </button>
                            <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all">
                                View Chart
                            </button>
                        </div>
                    </div>

                    <div className="p-10 rounded-3xl bg-black border border-white/10 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-32 bg-pink-500/20 blur-[100px] rounded-full pointer-events-none" />
                        <h3 className="text-gray-400 font-semibold mb-2">Total Burnt (Mock)</h3>
                        <div className="text-5xl font-mono font-bold text-white mb-8">
                            3,450,210
                        </div>

                        <h3 className="text-gray-400 font-semibold mb-2">Circulating Supply</h3>
                        <div className="text-3xl font-mono font-bold text-white text-opacity-80">
                            996,549,790
                        </div>
                    </div>
                </div>

                {/* Tokenomics Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-bold text-white mb-8 flex items-center gap-4">
                            <Coins className="text-yellow-400" /> Token Distribution
                        </h2>
                        <ul className="space-y-6">
                            <DistributionItem label="Public / Vault" percent="60%" color="bg-blue-500" />
                            <DistributionItem label="Holding / Private" percent="20%" color="bg-purple-500" />
                            <DistributionItem label="Operations" percent="10%" color="bg-pink-500" />
                            <DistributionItem label="Creator (Vesting)" percent="10%" color="bg-yellow-500" />
                        </ul>
                    </div>

                    {/* Placeholder for 3D Chart */}
                    <div className="aspect-square bg-white/5 rounded-full border border-white/10 flex items-center justify-center">
                        <span className="text-gray-500">3D Tokenomics Chart Area</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

function DistributionItem({ label, percent, color }: { label: string, percent: string, color: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <span className="text-lg text-gray-200 font-medium">{label}</span>
            <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-xl font-bold text-white">{percent}</span>
            </div>
        </div>
    );
}
