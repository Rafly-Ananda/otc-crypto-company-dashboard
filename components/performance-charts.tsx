'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area, ComposedChart, Line,
} from 'recharts';
import { DailyAggregate, fmtIDRCompact, fmtUSDT, fmtNumber } from '@/lib/data-utils';
import { useTheme } from '@/components/theme-provider';

interface PerformanceChartsProps {
  dailyData: DailyAggregate[];
  isLoading?: boolean;
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="skeleton mb-1.5 h-3.5 w-40 rounded" />
      <div className="skeleton mb-5 h-2.5 w-64 rounded" />
      <div className="skeleton w-full rounded-lg" style={{ height }} />
    </div>
  );
}

const PALETTE = {
  light: {
    profit:    '#16a34a',
    volume:    '#0e7490',
    neutral:   '#4f46e5',
    border:    '#d8dce8',
    muted:     '#6b7488',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d8dce8',
    tooltipLabel: '#1e2230',
    cursor:    'rgba(0,0,0,0.04)',
    gridLine:  '#d8dce8',
  },
  dark: {
    profit:    '#4ade80',
    volume:    '#67e8f9',
    neutral:   '#a5b4fc',
    border:    'rgba(255,255,255,0.10)',
    muted:     'rgba(255,255,255,0.38)',
    tooltipBg: '#1c1c1c',
    tooltipBorder: 'rgba(255,255,255,0.12)',
    tooltipLabel: 'rgba(255,255,255,0.92)',
    cursor:    'rgba(255,255,255,0.04)',
    gridLine:  'rgba(255,255,255,0.07)',
  },
} as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = '' }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 ${className}`}>
      <div className="mb-1 flex items-start justify-between">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mb-4 text-xs text-muted-foreground sm:mb-5">{subtitle}</p>
      {children}
    </div>
  );
}

function withCumulative(data: DailyAggregate[]) {
  let cum = 0;
  return data.map(d => { cum += d.profit; return { ...d, cumProfit: cum }; });
}

export function PerformanceCharts({ dailyData, isLoading }: PerformanceChartsProps) {
  if (isLoading) {
    return (
      <section>
        <div className="mb-5 flex items-center gap-4">
          <div className="skeleton h-2.5 w-36 rounded" />
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="mb-4">
          <ChartSkeleton height={260} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <ChartSkeleton height={220} />
          <ChartSkeleton height={220} />
        </div>
      </section>
    );
  }
  const { theme } = useTheme();
  const p = PALETTE[theme];

  const axisStyle = {
    tick: { fill: p.muted, fontSize: 11, fontFamily: 'var(--font-geist-mono), monospace' },
    axisLine: { stroke: p.border },
    tickLine: false as const,
  };

  const ttStyle = {
    background: p.tooltipBg,
    border: `1px solid ${p.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
  };

  const chartData = withCumulative(dailyData);
  const avgRate = chartData.reduce((s, d) => s + d.wAvgRate, 0) / chartData.length;

  return (
    <section>
      <SectionLabel>Performance Charts</SectionLabel>

      {/* Row 1: Full-width cumulative profit + volume composed chart */}
      <div className="mb-4">
        <ChartCard
          title="Daily profit & USDT volume"
          subtitle="Bars = profit (IDR) · Line = USDT volume — all trading days"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} vertical={false} />
              <XAxis dataKey="label" {...axisStyle} />
              <YAxis
                yAxisId="profit"
                {...axisStyle}
                tickFormatter={v => fmtIDRCompact(v)}
                width={62}
              />
              <YAxis
                yAxisId="usdt"
                orientation="right"
                {...axisStyle}
                tickFormatter={v => fmtUSDT(v)}
                width={54}
              />
              <Tooltip
                contentStyle={ttStyle}
                labelStyle={{ color: p.tooltipLabel, marginBottom: 6, fontWeight: 600 }}
                itemStyle={{ fontFamily: 'var(--font-geist-mono), monospace' }}
                cursor={{ fill: p.cursor }}
                formatter={(v: number, name: string) => {
                  if (name === 'profit') return [`Rp ${fmtNumber(v)}`, 'Profit'];
                  return [fmtNumber(v) + ' USDT', 'Volume'];
                }}
              />
              <Bar yAxisId="profit" dataKey="profit" fill={p.profit} fillOpacity={0.80} radius={[4, 4, 0, 0]} barSize={18} />
              <Line yAxisId="usdt" type="monotone" dataKey="usdt" stroke={p.volume} strokeWidth={2} dot={{ fill: p.volume, r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Cumulative profit | Rate */}
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <ChartCard
          title="Cumulative profit"
          subtitle="Running IDR total — all trading days"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={p.profit} stopOpacity={0.20} />
                  <stop offset="100%" stopColor={p.profit} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} vertical={false} />
              <XAxis dataKey="label" {...axisStyle} />
              <YAxis {...axisStyle} tickFormatter={v => fmtIDRCompact(v)} width={62} />
              <Tooltip
                formatter={(v: number) => [fmtIDRCompact(v), 'Cumulative profit']}
                contentStyle={ttStyle}
                labelStyle={{ color: p.tooltipLabel, marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: p.profit, fontFamily: 'var(--font-geist-mono), monospace' }}
                cursor={{ stroke: p.border }}
              />
              <Area
                type="monotone"
                dataKey="cumProfit"
                stroke={p.profit}
                strokeWidth={2.5}
                fill="url(#gradProfit)"
                dot={{ fill: p.profit, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: p.profit, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="VWAP rate by day"
          subtitle="IDR per USDT · dashed = period avg"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barSize={16} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={p.gridLine} vertical={false} />
              <XAxis dataKey="label" {...axisStyle} />
              <YAxis
                {...axisStyle}
                tickFormatter={v => fmtNumber(v, 0)}
                domain={['auto', 'auto']}
                width={54}
              />
              <Tooltip
                formatter={(v: number) => [v.toFixed(2), 'VWAP Rate']}
                contentStyle={ttStyle}
                labelStyle={{ color: p.tooltipLabel, marginBottom: 4, fontWeight: 600 }}
                itemStyle={{ color: p.neutral, fontFamily: 'var(--font-geist-mono), monospace' }}
                cursor={{ fill: p.cursor }}
              />
              <ReferenceLine
                y={avgRate}
                stroke={p.muted}
                strokeDasharray="5 4"
                label={{
                  value: `avg ${fmtNumber(Math.round(avgRate))}`,
                  fill: p.muted,
                  fontSize: 10,
                  position: 'insideTopRight',
                  fontFamily: 'var(--font-geist-mono), monospace',
                }}
              />
              <Bar dataKey="wAvgRate" fill={p.neutral} fillOpacity={0.75} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
