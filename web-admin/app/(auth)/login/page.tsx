
"use client";

import { useState } from "react";
import { authenticate } from "@/lib/actions";
import { Lock, User } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsPending(true);
        setErrorMessage(null);

        const formData = new FormData(event.currentTarget);
        try {
            const result = await authenticate(undefined, formData);
            if (result) {
                setErrorMessage(result);
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred.");
        } finally {
            setIsPending(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
            <div className="w-full max-w-md space-y-8 relative">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px] -z-10" />

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Staff Treasury</h1>
                        <p className="text-slate-400">Secure Access Portal</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    className="block w-full pl-10 bg-slate-800/50 border border-slate-700 rounded-lg py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Identify yourself"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    className="block w-full pl-10 bg-slate-800/50 border border-slate-700 rounded-lg py-3 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Enter passphrase"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isPending ? "Verifying..." : "Access Mainframe"}
                        </button>
                    </form>
                </div>

                <div className="text-center text-xs text-slate-600">
                    For use by authorized personnel only. <br /> Access attempts are logged.
                </div>
            </div>
        </main>
    );
}
