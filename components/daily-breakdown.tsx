'use client';

import { useState, Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { DailyAggregate, Transaction, fmtNumber, fmtUSDT, fmtIDRCompact } from '@/lib/data-utils';
import { cn } from '@/lib/utils';

interface DailyBreakdownProps {
  dailyData: DailyAggregate[];
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short' });
}

/* Sub-row: individual transaction inside an expanded day */
function TxSubRow({ tx }: { tx: Transaction }) {
  return (
    <tr className="border-b border-border/40 bg-secondary/30 last:border-0">
      <td className="w-8" />
      {/* Rate label replaces Date column */}
      <td className="py-2.5 pl-3 pr-3 sm:pl-4 sm:pr-4">
        <span className="rounded bg-border/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          {tx.rateDisplay}
        </span>
        {/* Remark inline on mobile (hidden on md+) */}
        {tx.remark && (
          <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-muted-foreground/60 md:hidden">{tx.remark}</p>
        )}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground sm:px-4">
        {fmtNumber(tx.usdt)}
      </td>
      <td className="hidden px-4 py-2.5 text-right font-mono text-xs text-muted-foreground md:table-cell">
        {fmtIDRCompact(tx.idr)}
      </td>
      <td className="hidden px-4 py-2.5 text-right font-mono text-xs text-muted-foreground lg:table-cell">
        {fmtIDRCompact(tx.settlement)}
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground sm:px-4">
        {tx.profit > 0 ? fmtIDRCompact(tx.profit) : '—'}
      </td>
      <td className="hidden px-4 py-2.5 text-right font-mono text-xs md:table-cell">
        {tx.nonExpected > 0
          ? <span className="text-otc-loss">{fmtIDRCompact(tx.nonExpected)}</span>
          : <span className="text-muted-foreground/40">—</span>
        }
      </td>
      <td className="hidden max-w-[200px] truncate px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">
        {tx.remark || '—'}
      </td>
    </tr>
  );
}

export function DailyBreakdown({ dailyData }: DailyBreakdownProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (date: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });

  const sorted = [...dailyData].sort((a, b) => a.date.localeCompare(b.date));

  /* Totals row */
  const totals = sorted.reduce(
    (acc, d) => ({
      usdt: acc.usdt + d.usdt,
      idr: acc.idr + d.idr,
      settlement: acc.settlement + d.settlement,
      profit: acc.profit + d.profit,
      nonExpected: acc.nonExpected + d.nonExpected,
    }),
    { usdt: 0, idr: 0, settlement: 0, profit: 0, nonExpected: 0 }
  );

  return (
    <section>
      {/* Section header */}
      <div className="mb-5 flex items-center gap-4">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Daily Breakdown
        </span>
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground">
          Click a row to expand orders
        </span>
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="w-8 px-3 py-3 sm:px-4" />
                <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:px-4">Date</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:px-4">USDT</th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">Gross IDR</th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:table-cell">Settlement</th>
                <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:px-4">Profit</th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:table-cell">Non-Exp</th>
                <th className="hidden px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground lg:table-cell">VWAP</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(day => {
                const isOpen = expanded.has(day.date);
                return (
                  <Fragment key={day.date}>
                    {/* Day summary row */}
                    <tr
                      className={cn(
                        'cursor-pointer border-b border-border/60 transition-colors last:border-0',
                        isOpen
                          ? 'bg-secondary/60'
                          : 'hover:bg-secondary/30'
                      )}
                      onClick={() => toggle(day.date)}
                    >
                      <td className="px-3 py-3.5 text-center sm:px-4">
                        <ChevronRight
                          size={14}
                          className={cn(
                            'text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-90'
                          )}
                        />
                      </td>
                      <td className="px-3 py-3.5 sm:px-4">
                        <p className="font-medium text-foreground">{fmtDate(day.date)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {fmtDay(day.date)} &middot; {day.txCount} {day.txCount === 1 ? 'order' : 'orders'}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-foreground sm:px-4">
                        {fmtUSDT(day.usdt)}
                      </td>
                      <td className="hidden px-4 py-3.5 text-right font-mono text-foreground md:table-cell">
                        {fmtIDRCompact(day.idr)}
                      </td>
                      <td className="hidden px-4 py-3.5 text-right font-mono text-foreground lg:table-cell">
                        {fmtIDRCompact(day.settlement)}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono sm:px-4">
                        <span className={day.profit > 0 ? 'text-otc-profit' : 'text-muted-foreground'}>
                          {day.profit > 0 ? '+' : ''}{fmtIDRCompact(day.profit)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 text-right font-mono md:table-cell">
                        {day.nonExpected > 0
                          ? <span className="rounded-full bg-otc-loss/10 px-2 py-0.5 text-xs font-semibold text-otc-loss">
                              {fmtIDRCompact(day.nonExpected)}
                            </span>
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
                      <td className="hidden px-4 py-3.5 text-right font-mono text-sm text-muted-foreground lg:table-cell">
                        {day.wAvgRate.toFixed(0)}
                      </td>
                    </tr>

                    {/* Expanded order sub-rows */}
                    {isOpen && day.transactions.map((tx, i) => (
                      <TxSubRow key={i} tx={tx} />
                    ))}
                  </Fragment>
                );
              })}
            </tbody>

            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 border-border bg-secondary/60">
                <td className="px-3 py-3.5 sm:px-4" />
                <td className="px-3 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sm:px-4">
                  Period Total
                </td>
                <td className="px-3 py-3.5 text-right font-mono font-bold text-otc-volume sm:px-4">
                  {fmtUSDT(totals.usdt)}
                </td>
                <td className="hidden px-4 py-3.5 text-right font-mono font-bold text-foreground md:table-cell">
                  {fmtIDRCompact(totals.idr)}
                </td>
                <td className="hidden px-4 py-3.5 text-right font-mono font-bold text-foreground lg:table-cell">
                  {fmtIDRCompact(totals.settlement)}
                </td>
                <td className="px-3 py-3.5 text-right font-mono font-bold text-otc-profit sm:px-4">
                  +{fmtIDRCompact(totals.profit)}
                </td>
                <td className="hidden px-4 py-3.5 text-right font-mono font-bold md:table-cell">
                  {totals.nonExpected > 0
                    ? <span className="text-otc-loss">{fmtIDRCompact(totals.nonExpected)}</span>
                    : <span className="text-muted-foreground/40">—</span>
                  }
                </td>
                <td className="hidden px-4 py-3.5 lg:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Non-expected costs callout — only if any exist */}
      {sorted.some(d => d.nonExpected > 0) && (
        <div className="mt-6 rounded-xl border border-otc-loss/20 bg-otc-loss/5 p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-otc-loss">
            Non-Expected Costs Detail
          </p>
          <div className="space-y-2">
            {sorted.flatMap(d =>
              d.transactions
                .filter(t => t.nonExpected > 0)
                .map((t, i) => (
                  <div key={`${d.date}-${i}`} className="flex items-start justify-between gap-4">
                    <div>
                      <span className="font-mono text-xs font-medium text-foreground">{fmtDate(t.date)}</span>
                      <span className="ml-3 text-xs text-muted-foreground">{t.remark || '—'}</span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-otc-loss">
                      Rp {fmtNumber(t.nonExpected)}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
