'use client';

import { BarChart2, DollarSign, TrendingUp, AlertTriangle, Wallet, Calendar, Activity, BarChart, ArrowUpRight, TrendingDown, Zap, Info } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
import { Summary, fmtIDRCompact, fmtUSDT, fmtNumber, fmtDateLabel, DailyAggregate } from '@/lib/data-utils';

interface VolumeSummaryProps {
  summary: Summary;
  dailyData: DailyAggregate[];
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {children}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* Best / worst day derived from daily data */
function PeriodSidebar({ summary, dailyData }: VolumeSummaryProps) {
  const sorted = [...dailyData].sort((a, b) => b.profit - a.profit);
  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];

  const profitMarginPct = (summary.profitMarginBps / 100).toFixed(2);
  const avgDailyUSDT = summary.totalUSDAT / summary.activeDays;
  const avgDailyProfit = summary.totalProfit / summary.activeDays;

  return (
    <div className="flex flex-col gap-4">

      {/* Period banner */}
      <div className="rounded-xl border border-border bg-card p-5 sheen">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Report Period
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">From</span>
            <span className="font-mono text-xs font-semibold text-foreground">{summary.dateRange.start}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">To</span>
            <span className="font-mono text-xs font-semibold text-foreground">{summary.dateRange.end}</span>
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Trading days</span>
            <span className="font-mono text-xs font-bold text-foreground">{summary.activeDays}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total orders</span>
            <span className="font-mono text-xs font-bold text-foreground">{summary.totalTransactions}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Profit margin</span>
            <span className="font-mono text-xs font-bold text-otc-profit">{profitMarginPct}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">VWAP rate</span>
            <span className="font-mono text-xs font-bold text-foreground">{fmtNumber(Math.round(summary.vwapRate))}</span>
          </div>
        </div>
      </div>

      {/* Averages */}
      <div className="rounded-xl border border-border bg-card p-5 sheen">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Averages
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Avg USDT / day</p>
            <p className="font-mono text-lg font-bold text-otc-volume">{fmtUSDT(avgDailyUSDT)}</p>
          </div>
          <div className="h-px bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Avg profit / day</p>
            <p className="font-mono text-lg font-bold text-otc-profit">{fmtIDRCompact(avgDailyProfit)}</p>
          </div>
        </div>
      </div>

      {/* Best / worst day */}
      <div className="rounded-xl border border-border bg-card p-5 sheen">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Highlights
        </p>
        <div className="space-y-3">
          {best && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Best day</p>
                <p className="text-xs font-medium text-foreground">{fmtDateLabel(best.date)}</p>
              </div>
              <div className="flex items-center gap-1 text-otc-profit">
                <ArrowUpRight size={12} />
                <span className="font-mono text-xs font-bold">{fmtIDRCompact(best.profit)}</span>
              </div>
            </div>
          )}
          {worst && worst.date !== best?.date && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lowest day</p>
                <p className="text-xs font-medium text-foreground">{fmtDateLabel(worst.date)}</p>
              </div>
              <span className="font-mono text-xs font-semibold text-muted-foreground">
                {fmtIDRCompact(worst.profit)}
              </span>
            </div>
          )}
          {summary.totalNonExpected > 0 && (
            <>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Non-expected</p>
                  <p className="text-[10px] text-muted-foreground/60">Total deductions</p>
                </div>
                <span className="font-mono text-xs font-semibold text-otc-loss">
                  {fmtIDRCompact(summary.totalNonExpected)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}

interface InsightItem {
  icon: React.ReactNode;
  label: string;
  text: string;
  tone: 'positive' | 'negative' | 'neutral';
}

function InsightsPanel({ summary, dailyData }: VolumeSummaryProps) {
  const sorted = [...dailyData].sort((a, b) => b.profit - a.profit);
  const best   = sorted[0];
  const worst  = sorted[sorted.length - 1];

  // Rate trend: compare first-half vs second-half VWAP.
  // Sort by date ascending first so the split is always chronological,
  // not dependent on the order the caller passes dailyData.
  const byDate = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(byDate.length / 2);
  const firstHalf  = byDate.slice(0, mid);
  const secondHalf = byDate.slice(mid);
  const avgFirst  = firstHalf.reduce((s, d)  => s + d.wAvgRate, 0) / (firstHalf.length  || 1);
  const avgSecond = secondHalf.reduce((s, d) => s + d.wAvgRate, 0) / (secondHalf.length || 1);
  const rateUp = avgSecond >= avgFirst;
  const rateDiff = Math.abs(avgSecond - avgFirst).toFixed(0);

  // Settlement efficiency
  const slippage = summary.totalIDR > 0
    ? ((summary.totalIDR - summary.totalSettlement) / summary.totalIDR * 100).toFixed(3)
    : '0';

  // Non-expected as % of profit
  const nonExpPct = summary.totalProfit > 0
    ? (summary.totalNonExpected / summary.totalProfit * 100).toFixed(1)
    : '0';

  // Largest single-day volume
  const bigDay = [...dailyData].sort((a, b) => b.usdt - a.usdt)[0];

  const items: InsightItem[] = [
    {
      icon: rateUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />,
      label: 'Rate trend',
      text: rateUp
        ? `VWAP improved by ${fmtNumber(parseFloat(rateDiff))} IDR/USDT in the second half of the period, indicating favorable market movement.`
        : `VWAP declined by ${fmtNumber(parseFloat(rateDiff))} IDR/USDT in the second half of the period. Monitor market conditions.`,
      tone: rateUp ? 'positive' : 'negative',
    },
    {
      icon: <Zap size={14} />,
      label: 'Best day',
      text: best
        ? `${fmtDateLabel(best.date)} was the strongest trading day with ${fmtIDRCompact(best.profit)} profit across ${best.txCount} order${best.txCount > 1 ? 's' : ''} and ${fmtUSDT(best.usdt)} USDT volume.`
        : 'No profit data available.',
      tone: 'positive',
    },
    {
      icon: <Activity size={14} />,
      label: 'Settlement efficiency',
      text: `Overall slippage between gross IDR and actual settlement was ${slippage}% — cost and fee deductions were ${parseFloat(slippage) < 0.3 ? 'minimal and within normal range' : 'notable and worth reviewing'}.`,
      tone: parseFloat(slippage) < 0.3 ? 'positive' : 'neutral',
    },
    ...(summary.totalNonExpected > 0 ? [{
      icon: <AlertTriangle size={14} />,
      label: 'Non-expected impact',
      text: `${fmtIDRCompact(summary.totalNonExpected)} in non-expected deductions represent ${nonExpPct}% of total profit. These should be reconciled and reported separately.`,
      tone: 'negative' as const,
    }] : []),
    ...(bigDay ? [{
      icon: <BarChart2 size={14} />,
      label: 'Peak volume day',
      text: `${fmtDateLabel(bigDay.date)} recorded the highest single-day volume at ${fmtUSDT(bigDay.usdt)} USDT, contributing ${fmtIDRCompact(bigDay.profit)} to total profit.`,
      tone: 'neutral' as const,
    }] : []),
    {
      icon: <Info size={14} />,
      label: 'Concentration',
      text: best
        ? `The top 3 trading days by profit account for ${fmtIDRCompact(sorted.slice(0,3).reduce((s,d)=>s+d.profit,0))} — ${(sorted.slice(0,3).reduce((s,d)=>s+d.profit,0)/summary.totalProfit*100).toFixed(0)}% of total period profit.`
        : '',
      tone: 'neutral',
    },
  ].filter(i => i.text);

  const toneClass: Record<InsightItem['tone'], string> = {
    positive: 'text-otc-profit',
    negative: 'text-otc-loss',
    neutral:  'text-muted-foreground',
  };

  const toneBg: Record<InsightItem['tone'], string> = {
    positive: 'bg-otc-profit/10 border-otc-profit/20',
    negative: 'bg-otc-loss/10 border-otc-loss/20',
    neutral:  'bg-border/40 border-border',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 sheen">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Period Insights
      </p>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`rounded-lg border p-3 ${toneBg[item.tone]}`}>
            <div className={`mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${toneClass[item.tone]}`}>
              {item.icon}
              {item.label}
            </div>
            <p className="text-xs leading-relaxed text-foreground/70">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolumeSummary({ summary, dailyData }: VolumeSummaryProps) {
  const profitMarginPct = (summary.profitMarginBps / 100).toFixed(2);
  const avgProfitPerDay = summary.activeDays > 0 ? summary.totalProfit / summary.activeDays : 0;

  return (
    <section>
      <div className="grid gap-8 xl:grid-cols-[1fr_280px]">

        {/* Left — card grids */}
        <div className="space-y-8">
          <div>
            <SectionLabel>Volume Summary</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label="Total USDT Sold"
                value={fmtUSDT(summary.totalUSDAT)}
                subValue={fmtNumber(summary.totalUSDAT) + ' USDT'}
                subLabel="All trading days"
                icon={<BarChart2 size={16} />}
                variant="volume"
              />
              <StatsCard
                label="Gross IDR"
                value={fmtIDRCompact(summary.totalIDR)}
                subValue={`Rp ${fmtNumber(summary.totalIDR)}`}
                subLabel="Before deductions"
                icon={<DollarSign size={16} />}
                variant="volume"
              />
              <StatsCard
                label="Settlement IDR"
                value={fmtIDRCompact(summary.totalSettlement)}
                subValue={`Rp ${fmtNumber(summary.totalSettlement)}`}
                subLabel="Actual received"
                icon={<Activity size={16} />}
                variant="neutral"
              />
              <StatsCard
                label="Total Orders"
                value={String(summary.totalTransactions)}
                subValue={`${summary.activeDays} trading days`}
                subLabel="OTC sell orders"
                icon={<BarChart size={16} />}
                variant="default"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Profit Summary</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                label="Total Net Profit"
                value={fmtIDRCompact(summary.totalProfit)}
                subValue={`Rp ${fmtNumber(summary.totalProfit)}`}
                subLabel="All days combined"
                icon={<TrendingUp size={16} />}
                variant="profit"
              />
              <StatsCard
                label="Profit Margin"
                value={`${profitMarginPct}%`}
                subValue={`${summary.profitMarginBps.toFixed(0)} bps`}
                subLabel="Profit / Gross IDR"
                icon={<Wallet size={16} />}
                variant="profit"
              />
              <StatsCard
                label="Avg Profit / Day"
                value={fmtIDRCompact(avgProfitPerDay)}
                subValue={`Rp ${fmtNumber(avgProfitPerDay)}`}
                subLabel="Per active trading day"
                icon={<Calendar size={16} />}
                variant="neutral"
              />
              <StatsCard
                label="Non-Expected"
                value={summary.totalNonExpected > 0 ? fmtIDRCompact(summary.totalNonExpected) : '—'}
                subValue={summary.totalNonExpected > 0 ? `Rp ${fmtNumber(summary.totalNonExpected)}` : 'None recorded'}
                subLabel="Outside normal flow"
                icon={<AlertTriangle size={16} />}
                variant={summary.totalNonExpected > 0 ? 'loss' : 'default'}
              />
            </div>
          </div>

          <InsightsPanel summary={summary} dailyData={dailyData} />

          {/* Period sidebar — shown inline on non-xl, hidden on xl (shown in right col instead) */}
          <div className="xl:hidden">
            <PeriodSidebar summary={summary} dailyData={dailyData} />
          </div>
        </div>

        {/* Right — period sidebar only on xl+ */}
        <div className="hidden xl:block">
          <PeriodSidebar summary={summary} dailyData={dailyData} />
        </div>

      </div>
    </section>
  );
}
