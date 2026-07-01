import { Summary, fmtIDRCompact, fmtUSDT, fmtNumber } from '@/lib/data-utils';

interface HeroKpiProps {
  summary: Summary;
}

interface KpiItem {
  label: string;
  value: string;
  sub: string;
  accent?: 'profit' | 'loss' | 'volume' | 'neutral';
}

export function HeroKpi({ summary }: HeroKpiProps) {
  const profitMarginPct = (summary.profitMarginBps / 100).toFixed(2);

  const kpis: KpiItem[] = [
    {
      label: 'Total USDT Sold',
      value: fmtUSDT(summary.totalUSDAT),
      sub: 'USDT across all orders',
      accent: 'volume',
    },
    {
      label: 'Gross IDR Value',
      value: fmtIDRCompact(summary.totalIDR),
      sub: `Settlement: ${fmtIDRCompact(summary.totalSettlement)}`,
      accent: 'neutral',
    },
    {
      label: 'Total Net Profit',
      value: fmtIDRCompact(summary.totalProfit),
      sub: `${profitMarginPct}% margin · ${fmtNumber(summary.activeDays)} active days`,
      accent: 'profit',
    },
    {
      label: 'Non-Expected Costs',
      value: summary.totalNonExpected > 0 ? fmtIDRCompact(summary.totalNonExpected) : '—',
      sub: summary.totalNonExpected > 0
        ? `Rp ${fmtNumber(summary.totalNonExpected)}`
        : 'No unexpected deductions',
      accent: summary.totalNonExpected > 0 ? 'loss' : 'neutral',
    },
  ];

  const accentClasses: Record<NonNullable<KpiItem['accent']>, string> = {
    volume:  'text-otc-volume',
    profit:  'text-otc-profit',
    loss:    'text-otc-loss',
    neutral: 'text-foreground',
  };

  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi, i) => (
            <div
              key={i}
              className={[
                'flex flex-col gap-1 px-4 py-5 sm:px-6 sm:py-6',
                // right border on all but last in a row
                i % 2 === 0 ? 'border-r border-border' : '',
                // bottom border on first row (items 0 and 1) on mobile 2-col grid
                i < 2 ? 'border-b border-border lg:border-b-0' : '',
                // on lg+, right border on all but last col
                i < 3 ? 'lg:border-r lg:border-border' : 'lg:border-r-0',
              ].join(' ')}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {kpi.label}
              </p>
              <p className={`font-mono text-2xl font-bold leading-none tracking-tight sm:text-3xl lg:text-4xl ${kpi.accent ? accentClasses[kpi.accent] : 'text-foreground'}`}>
                {kpi.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
