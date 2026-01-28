'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Twitter, Send, Github } from 'lucide-react';

export default function Footer() {
    const t = useTranslations('Navbar'); // Reusing Navbar keys for simplicity or add specific footer keys

    return (
        <footer className="bg-black border-t border-white/10 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-2">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                            EXCELSIOR
                        </h2>
                        <p className="text-gray-400 max-w-sm">
                            The first Real World Asset ecosystem on Solana combining stability with growth.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Ecosystem</h3>
                        <ul className="space-y-2">
                            <li><Link href="/excelsior" className="text-gray-400 hover:text-white transition-colors">The Vault</Link></li>
                            <li><Link href="/luxor" className="text-gray-400 hover:text-white transition-colors">Luxor Token</Link></li>
                            <li><Link href="/roadmap" className="text-gray-400 hover:text-white transition-colors">Roadmap</Link></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Community</h3>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Send size={20} /></a>
                            <a href="#" className="text-gray-400 hover:text-white transition-colors"><Github size={20} /></a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-12 pt-8 text-center text-gray-500 text-sm">
                    <p>© 2026 Excelsior Ecosystem. All rights reserved.</p>
                    <p className="mt-2 text-xs">
                        Disclaimer: Not financial advice. $LXR is a utility token.
                    </p>
                </div>
            </div>
        </footer>
    );
}
