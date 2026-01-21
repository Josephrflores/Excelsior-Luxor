'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
            <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 shadow-lg shadow-amber-500/20" />
                    <span className="text-xl font-bold tracking-tight text-white">
                        EXCELSIOR <span className="text-amber-500 font-light">LUXOR</span>
                    </span>
                </div>

                <div>
                    {/* Wallet Button - styled via CSS or override class */}
                    <WalletMultiButton className="!bg-white/10 !rounded-xl !border !border-white/10 hover:!bg-white/20 transition-all !font-bold !px-6 !py-3 !h-auto" />
                </div>
            </div>
        </nav>
    );
}
