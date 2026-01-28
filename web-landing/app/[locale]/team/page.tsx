'use client';

import { Shield, FileText, CheckCircle } from 'lucide-react';

export default function TeamPage() {
    return (
        <div className="min-h-screen bg-black pt-12 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                <div className="text-center mb-20">
                    <h1 className="text-5xl font-bold text-white mb-6">Transparency & Team</h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        Built on trust, verified by code. We prioritize security and legal compliance.
                    </p>
                </div>

                {/* Legal & Audit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <Shield className="text-green-400" /> Legal Compliance
                        </h2>
                        <div className="space-y-4 text-gray-300">
                            <p>
                                <strong>GENIUS Act 2026:</strong> Fully compliant with new stablecoin and digital asset regulations.
                            </p>
                            <p>
                                <strong>Utility Token:</strong> $LXR is designed as a utility token for ecosystem governance and rewards. It is NOT a security.
                            </p>
                            <p>
                                <strong>Disclaimer:</strong> Crypto assets are volatile. Invest responsibly. No profit guarantees.
                            </p>
                        </div>
                    </div>

                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <FileText className="text-blue-400" /> Audits & Contracts
                        </h2>
                        <ul className="space-y-4">
                            <li className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <span className="text-gray-300">Smart Contract</span>
                                <a href="#" className="text-blue-400 hover:text-blue-300 underline">View on Solscan</a>
                            </li>
                            <li className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <span className="text-gray-300">Treasury Wallet</span>
                                <a href="#" className="text-blue-400 hover:text-blue-300 underline">View Reserves</a>
                            </li>
                            <li className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                                <span className="text-gray-300">Burn Wallet</span>
                                <a href="#" className="text-blue-400 hover:text-blue-300 underline">Track Burns</a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Team Section */}
                <h2 className="text-3xl font-bold text-white mb-12 text-center">Core Contributors</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <TeamMember
                        name="Joseph (Founder)"
                        role="Lead Developer & Strategy"
                        wallet="Gw6...9x2 (Locked)"
                    />
                    <TeamMember
                        name="Operations Lead"
                        role="Marketing & Partnerships"
                        wallet="8sA...k2L (Vesting)"
                    />
                    <TeamMember
                        name="Community Manager"
                        role="Socials & Support"
                        wallet="3xP...m9Q"
                    />
                </div>

            </div>
        </div>
    );
}

function TeamMember({ name, role, wallet }: { name: string, role: string, wallet: string }) {
    return (
        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-colors">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white">{name}</h3>
            <p className="text-purple-400 text-sm mb-2">{role}</p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full text-xs text-gray-500">
                <CheckCircle size={12} /> {wallet}
            </div>
        </div>
    );
}
