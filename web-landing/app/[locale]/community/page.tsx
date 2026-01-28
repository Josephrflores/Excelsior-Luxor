'use client';

import { Twitter, Send, Github, MessageCircle } from 'lucide-react';

export default function CommunityPage() {
    return (
        <div className="min-h-screen bg-black pt-12 pb-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

                <h1 className="text-5xl font-bold text-white mb-6">Join the Revolution</h1>
                <p className="text-xl text-gray-400 mb-16 max-w-2xl mx-auto">
                    Be part of the community building the future of RWA on Solana.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-24">
                    <SocialCard
                        icon={<Twitter size={40} />}
                        name="X (Twitter)"
                        desc="Latest announcements and alpha."
                        link="#"
                        color="hover:text-blue-400"
                    />
                    <SocialCard
                        icon={<Send size={40} />}
                        name="Telegram"
                        desc="Chat with the community and team."
                        link="#"
                        color="hover:text-blue-300"
                    />
                    <SocialCard
                        icon={<MessageCircle size={40} />}
                        name="Discord"
                        desc="Governance and proposals."
                        link="#"
                        color="hover:text-purple-400"
                    />
                </div>

                {/* Whitepaper CTA */}
                <div className="p-12 rounded-3xl bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-white/10">
                    <h2 className="text-3xl font-bold text-white mb-4">Read the Whitepaper</h2>
                    <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                        Deep dive into our Tokenomics, RWA legal structure, and technical architecture.
                    </p>
                    <button className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
                        Download PDF
                    </button>
                </div>

            </div>
        </div>
    );
}

function SocialCard({ icon, name, desc, link, color }: any) {
    return (
        <a href={link} className={`p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group ${color}`}>
            <div className="mb-4 text-gray-400 group-hover:text-inherit transition-colors flex justify-center">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
            <p className="text-sm text-gray-500 group-hover:text-gray-400">{desc}</p>
        </a>
    );
}
