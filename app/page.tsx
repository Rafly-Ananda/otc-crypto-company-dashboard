'use client';

import { useData } from '@/components/data-provider';
import { AppShell } from '@/components/app-shell';
import { HeroKpi } from '@/components/hero-kpi';
import { VolumeSummary } from '@/components/volume-summary';
import { PerformanceCharts } from '@/components/performance-charts';
import { DailyBreakdown } from '@/components/daily-breakdown';

export default function DashboardPage() {
  const { summary, dailyData, source } = useData();

  return (
    <AppShell>
      {source === 'empty' ? (
        <main className="mx-auto w-full max-w-screen-2xl flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-10">
          <div className="text-center max-w-md">
            <p className="text-sm text-muted-foreground mb-2">No data available</p>
            <p className="text-2xl font-bold text-foreground mb-6">Empty Dataset</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-8">
              The Google Sheet is empty or not configured. Upload a CSV file to get started, or check your environment variables.
            </p>
            <a
              href="/upload"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Upload Data
            </a>
          </div>
        </main>
      ) : (
        <>
          <HeroKpi summary={summary} />
          <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-8 px-4 py-6 sm:space-y-12 sm:px-6 sm:py-10 lg:px-10">
            <VolumeSummary summary={summary} dailyData={dailyData} />
            <PerformanceCharts dailyData={dailyData} />
            <DailyBreakdown dailyData={dailyData} />
          </main>
        </>
      )}
    </AppShell>
  );
}
