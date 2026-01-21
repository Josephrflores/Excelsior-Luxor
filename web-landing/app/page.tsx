import TokenomicsChart from "@/components/TokenomicsChart";
import { ArrowRight, Coins, ShieldCheck, Zap } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-indigo-500/30">

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <span className="text-indigo-400">❖</span> Excelsior
          </div>
          <div className="flex gap-6 text-sm font-medium text-slate-400">
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#tokenomics" className="hover:text-white transition-colors">Tokenomics</a>
            <a href="https://excelsior-admin.vercel.app" target="_blank" className="text-indigo-400 hover:text-indigo-300 transition-colors">Staff Login</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] -z-10" />

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Live on Solana Devnet
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Two Tokens. <br /> One Powerful Ecosystem.
          </h1>

          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            **Excelsior (XLS)** preserves value using the Gold Standard model, while **Luxor (LXR)** powers the economy as the liquidity engine. Built for stability and growth on Solana.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
              Mint Luxor (LXR) <ArrowRight className="w-4 h-4" />
            </button>
            <button className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-all border border-slate-700">
              Read Whitepaper
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-900/40 border-y border-slate-800/50" id="about">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/30 transition-colors group">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Reserve Currency</h3>
              <p className="text-slate-400 leading-relaxed">
                Excelsior (XLS) acts as the ecosystem's store of value, with a scarce supply of 20.25M tokens designed for long-term holding.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Liquidity Engine</h3>
              <p className="text-slate-400 leading-relaxed">
                Luxor (LXR) provides the necessary liquidity for transactions, with a larger supply of 2.025B to facilitate ecosystem volume.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Solana Speed</h3>
              <p className="text-slate-400 leading-relaxed">
                Leveraging Solana's Token-2022 program for enforceable royalties, secure transfers, and sub-second finality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="py-24 px-6" id="tokenomics">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Transparent Allocation</h2>
              <p className="text-slate-400 mb-8 text-lg">
                Our distribution model ensures long-term sustainability. The majority of tokens are locked in the Central Vault to support market stability.
              </p>

              <ul className="space-y-4">
                {[
                  { label: "Founder Allocation", value: "10%", desc: "Vested over 4 years" },
                  { label: "Operations Fund", value: "10%", desc: "Marketing & Development" },
                  { label: "Ecosystem Holding", value: "15%", desc: "Rewards & Partnerships" },
                  { label: "Central Reserve", value: "65%", desc: "Liquidity Backing" },
                ].map((item, i) => (
                  <li key={i} className="flex flex-col p-4 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">{item.label}</span>
                      <span className="font-bold text-indigo-400">{item.value}</span>
                    </div>
                    <span className="text-sm text-slate-500">{item.desc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              {/* Chart Component */}
              <TokenomicsChart />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-slate-500 text-sm">
            &copy; 2026 Excelsior Ecosystem. Built on Solana.
          </div>
          <div className="flex gap-6">
            {/* Socials placeholders */}
          </div>
        </div>
      </footer>
    </main>
  );
}
