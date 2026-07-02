'use client';

import Link from 'next/link';
import { useData } from '@/components/data-provider';
import { AppShell } from '@/components/app-shell';
import { HeroKpi } from '@/components/hero-kpi';
import { VolumeSummary } from '@/components/volume-summary';
import { PerformanceCharts } from '@/components/performance-charts';
import { DailyBreakdown } from '@/components/daily-breakdown';
import { Database, Upload } from 'lucide-react';

export default function DashboardPage() {
  const { summary, dailyData, source, isSyncing } = useData();

  const isEmpty = source === 'empty' && !isSyncing;

  return (
    <AppShell>
      {isEmpty ? (
        <main className="mx-auto w-full max-w-screen-2xl flex-1 flex items-center justify-center px-4 py-20">
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card">
              <Database size={28} className="text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">No data available</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Your Google Sheet is empty or not yet configured. Upload a CSV to populate the dashboard.
              </p>
            </div>
            <Link
              href="/upload"
              className="flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Upload size={14} />
              Upload CSV
            </Link>
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
