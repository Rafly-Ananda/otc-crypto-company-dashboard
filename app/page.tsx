'use client';

import { useData } from '@/components/data-provider';
import { AppShell } from '@/components/app-shell';
import { HeroKpi } from '@/components/hero-kpi';
import { VolumeSummary } from '@/components/volume-summary';
import { PerformanceCharts } from '@/components/performance-charts';
import { DailyBreakdown } from '@/components/daily-breakdown';

export default function DashboardPage() {
  const { summary, dailyData } = useData();

  return (
    <AppShell>
      <HeroKpi summary={summary} />
      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-10">
        <VolumeSummary summary={summary} dailyData={dailyData} />
        <PerformanceCharts dailyData={dailyData} />
        <DailyBreakdown dailyData={dailyData} />
      </main>
    </AppShell>
  );
}
