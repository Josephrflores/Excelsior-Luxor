'use client';

import { motion } from 'framer-motion';
import { Building2, Lock, PieChart } from 'lucide-react';

export default function ExcelsiorPage() {
    return (
        <div className="min-h-screen bg-black pt-12 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="text-center mb-20">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-6"
                    >
                        THE VAULT
                    </motion.h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        The Excelsior Reserve is a transparent, on-chain treasury holding real-world assets to back the ecosystem.
                    </p>
                </div>

                {/* Live Treasury Stats (Placeholder for now) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
                    <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-900/10 to-purple-900/10 border border-white/10 backdrop-blur-xl">
                        <div className="flex items-center gap-4 mb-2">
                            <Lock className="text-blue-400" size={24} />
                            <h3 className="text-lg font-semibold text-gray-300">Total Value Locked (USDC)</h3>
                        </div>
                        <div className="text-5xl font-mono font-bold text-white">
                            $0.00
                        </div>
                        <p className="text-sm text-gray-500 mt-2">Verified on Solana • Live Update</p>
                    </div>

                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                        <h3 className="text-lg font-semibold text-gray-300 mb-4">Target Allocation</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Real Estate</span>
                                <span className="text-white font-bold">80%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-[80%]" />
                            </div>

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Liquid Reserves (USDC)</span>
                                <span className="text-white font-bold">20%</span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 w-[20%]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Assets Gallery Placeholder */}
                <h2 className="text-3xl font-bold text-white mb-12 flex items-center gap-3">
                    <Building2 className="text-blue-400" /> Real World Assets
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                                <span>Property Image Placeholder</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                <h3 className="text-xl font-bold text-white">Future Acquisition #{i}</h3>
                                <p className="text-sm text-gray-400">Target Value: $250,000</p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
