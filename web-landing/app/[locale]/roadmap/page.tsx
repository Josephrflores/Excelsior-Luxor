'use client';

import { motion } from 'framer-motion';
import { Flag, Rocket, Zap, Globe, Users } from 'lucide-react';

export default function RoadmapPage() {
    const steps = [
        {
            phase: "Phase 1: Foundation",
            title: "Mainnet Launch",
            icon: <Rocket className="text-purple-400" size={24} />,
            items: ["Smart Contract Deployment (Devnet Tested)", "Website Launch V1", "Community Setup (Telegram/X)", "Initial 54 Wallet Distribution"]
        },
        {
            phase: "Phase 2: Awareness",
            title: "Marketing & Hype",
            icon: <Users className="text-pink-400" size={24} />,
            items: ["Influencer Partnerships", "Meme Contests", "Raydium Liquidity Injection", "Listing on DexScreener"]
        },
        {
            phase: "Phase 3: Utility",
            title: "The Valve Opens",
            icon: <Zap className="text-yellow-400" size={24} />,
            items: ["First Property Acquisition", "Burn Mechanism Activation (1% Fee)", "Treasury Dashboard Live", "Holder Airdrops"]
        },
        {
            phase: "Phase 4: Expansion",
            title: "Ecosystem Growth",
            icon: <Globe className="text-blue-400" size={24} />,
            items: ["Legal Entity Formation (GENIUS Act)", "CEX Listings", "Partnership with Real Estate Firms", "Cross-chain Bridges"]
        }
    ];

    return (
        <div className="min-h-screen bg-black pt-12 pb-24">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-bold text-white mb-6">Roadmap</h1>
                    <p className="text-gray-400">Our journey to bridge Memes and Real Assets.</p>
                </div>

                <div className="space-y-12 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-white/10 md:left-1/2 md:-ml-px" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative flex items-center gap-8 ${index % 2 === 0 ? 'md:flex-row-reverse text-left md:text-left' : 'md:flex-row text-left md:text-right'}`}
                        >
                            {/* Timeline Dot */}
                            <div className="absolute left-8 -ml-3 md:left-1/2 md:-ml-3 w-6 h-6 rounded-full bg-black border-2 border-purple-500 z-10" />

                            <div className="flex-1 ml-16 md:ml-0 md:px-8">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors">
                                    <div className={`flex items-center gap-3 mb-4 ${index % 2 === 0 ? '' : 'md:justify-end'}`}>
                                        {step.icon}
                                        <span className="text-sm font-bold text-purple-400 uppercase tracking-wider">{step.phase}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                                    <ul className={`space-y-2 text-gray-400 ${index % 2 === 0 ? '' : 'md:flex md:flex-col md:items-end'}`}>
                                        {step.items.map((item, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" /> {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="flex-1 hidden md:block" />
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
