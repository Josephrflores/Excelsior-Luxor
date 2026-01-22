
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { LayoutDashboard, Wallet, Settings, LogOut, Shield } from "lucide-react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <Shield className="h-6 w-6 text-indigo-500 mr-2" />
                    <span className="font-bold text-lg tracking-tight">Staff Treasury</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link href="/" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group">
                        <LayoutDashboard className="h-5 w-5 mr-3 text-slate-500 group-hover:text-indigo-400" />
                        Overview
                    </Link>
                    <Link href="/" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group">
                        <Wallet className="h-5 w-5 mr-3 text-slate-500 group-hover:text-emerald-400" />
                        Wallet Management
                    </Link>
                    <Link href="/" className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors group">
                        <Settings className="h-5 w-5 mr-3 text-slate-500 group-hover:text-slate-400" />
                        Admin Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center mb-4 px-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/20 items-center justify-center flex text-indigo-400 font-bold text-xs">
                            {(session?.user?.name || "AD").substring(0, 2).toUpperCase()}
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-white">{session?.user?.name}</p>
                            <p className="text-xs text-slate-500">{session?.user?.email}</p>
                        </div>
                    </div>
                    <form action={async () => {
                        "use server";
                        await signOut();
                    }}>
                        <button type="submit" className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                            <LogOut className="h-4 w-4 mr-3" />
                            Sign Out
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/30 backdrop-blur-sm sticky top-0 z-10">
                    <h1 className="text-xl font-semibold text-slate-200">Dashboard</h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Connected to Solana Devnet
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
