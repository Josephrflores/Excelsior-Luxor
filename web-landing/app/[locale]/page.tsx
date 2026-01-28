'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Coins, ArrowRight, FileText } from 'lucide-react';
// @ts-ignore
import TokenomicsChart from '@/components/TokenomicsChart';

export default function HomePage() {
  const t = useTranslations('HomePage');

  // Data matching the pie charts in the screenshot
  const excelsiorData = [
    { name: 'Central Vault', value: 65, color: '#6366f1' },      // Indigo (Big chunk)
    { name: 'Holding', value: 15, color: '#f59e0b' },           // Amber
    { name: 'Operations', value: 10, color: '#10b981' },        // Emerald
    { name: 'Founders', value: 10, color: '#3b82f6' },          // Blue
  ];

  const luxorData = [
    { name: 'Public Liquidity', value: 60, color: '#8b5cf6' },  // Purple
    { name: 'Holding', value: 20, color: '#f59e0b' },           // Amber
    { name: 'Operations', value: 10, color: '#10b981' },        // Emerald
    { name: 'Founders', value: 10, color: '#3b82f6' },          // Blue
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]"> {/* Custom dark background */}

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden py-20 px-4">
        {/* Subtle Background Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-[128px]" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-8">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-slate-300 text-sm font-medium">En vivo en Solana Devnet</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-tight whitespace-pre-line">
              {t('title')}
            </h1>

            <div className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed">
              {/* Rendering markdown-like bold text manually if needed, or relying on simple text for now */}
              {t.rich('subtitle', {
                strong: (chunks) => <strong className="text-white font-semibold">{chunks}</strong>
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/luxor"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2"
              >
                {t('cta_main')} <ArrowRight size={20} />
              </Link>
              <Link
                href="/whitepaper"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2"
              >
                {t('cta_secondary')}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 Main Features Cards */}
      <section className="py-10 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<ShieldCheck className="text-blue-500" size={32} />}
            title={t('features.reserve.title')}
            description={t('features.reserve.description')}
          />
          <FeatureCard
            icon={<Coins className="text-emerald-500" size={32} />}
            title={t('features.liquidity.title')}
            description={t('features.liquidity.description')}
          />
          <FeatureCard
            icon={<Zap className="text-yellow-500" size={32} />}
            title={t('features.speed.title')}
            description={t('features.speed.description')}
          />
        </div>
      </section>

      {/* Allocation / Tokenomics Section */}
      <section className="py-24 px-4 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Text Content */}
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                {t('allocation.title')}
              </h2>
              <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                {t('allocation.description')}
              </p>

              <div className="space-y-4">
                <AllocationRow
                  label={t('allocation.charts.founder')}
                  sub={t('allocation.charts.founder_sub')}
                  percent="10%"
                  color="bg-blue-500"
                />
                <AllocationRow
                  label={t('allocation.charts.operations')}
                  sub={t('allocation.charts.operations_sub')}
                  percent="10%"
                  color="bg-emerald-500"
                />
                <AllocationRow
                  label={t('allocation.charts.holding')}
                  sub={t('allocation.charts.holding_sub')}
                  percent={t('title').includes('Dos') ? '15%' : '15%'}
                  color="bg-amber-500"
                />
                <AllocationRow
                  label={t('allocation.charts.reserve')}
                  sub={t('allocation.charts.reserve_sub')}
                  percent={t('title').includes('Dos') ? '65%' : '65%'}
                  color="bg-indigo-500"
                />
              </div>
            </div>

            {/* Charts Column */}
            <div className="flex flex-col gap-8">
              <TokenomicsChart
                title={t('allocation.charts.excelsior_title')}
                data={excelsiorData}
              />
              <TokenomicsChart
                title={t('allocation.charts.luxor_title')}
                data={luxorData}
              />
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="mb-6 p-3 rounded-lg bg-slate-800/50 w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function AllocationRow({ label, sub, percent, color }: { label: string, sub: string, percent: string, color: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-800">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <div>
          <div className="text-white font-medium">{label}</div>
          <div className="text-slate-500 text-sm">{sub}</div>
        </div>
      </div>
      <div className="text-blue-400 font-bold font-mono">{percent}</div>
    </div>
  );
}
