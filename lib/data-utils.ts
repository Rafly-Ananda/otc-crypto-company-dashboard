// Data cleaning and parsing utilities for OTC transaction data

export interface Transaction {
  date: string;
  name: string;
  order: string;
  rate: number;
  rateDisplay: string;
  usdt: number;
  idr: number;
  settlement: number;
  profit: number;
  nonExpected: number;
  remark: string;
}

export interface DailyAggregate {
  date: string;
  label: string; // e.g. "May 19"
  txCount: number;
  usdt: number;
  idr: number;
  settlement: number;
  profit: number;
  nonExpected: number;
  avgRate: number;
  /** weighted average rate = sum(usdt * rate) / sum(usdt) */
  wAvgRate: number;
  transactions: Transaction[];
}

export interface Summary {
  totalTransactions: number;
  totalUSDAT: number;
  totalIDR: number;
  totalSettlement: number;
  totalProfit: number;
  totalNonExpected: number;
  /** VWAP across all transactions */
  vwapRate: number;
  profitMarginBps: number; // basis points: profit / idr * 10000
  dateRange: { start: string; end: string };
  activeDays: number;
}

/**
 * Reformat Rp amounts that use semicolons as thousand separators.
 * e.g. "Rp2;052;620" → "Rp2,052,620"
 */
export function formatIDRRemark(text: string): string {
  return text.replace(/(\d);(\d)/g, '$1,$2');
}

/** Format IDR in Rupiah millions: 1_234_567_890 → "1.23B" or "123.5M" */
export function fmtIDRCompact(val: number): string {
  if (val >= 1_000_000_000) {
    return (val / 1_000_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + 'B';
  }
  if (val >= 1_000_000) {
    return (val / 1_000_000).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + 'M';
  }
  return fmtNumber(val);
}

/** Format number with thousand separators */
export function fmtNumber(num: number, decimals = 0): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format USDT volume compactly */
export function fmtUSDT(val: number): string {
  if (val >= 1_000_000) {
    return (val / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';
  }
  if (val >= 1_000) {
    return (val / 1_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K';
  }
  return fmtNumber(val);
}

/**
 * Parse the CSV string and clean known quality issues:
 * 1. Year typo 2006 → 2026
 * 2. Name casing normalization
 * 3. Remark semicolon → comma for IDR amounts
 */
export function parseCSVData(csv: string): Transaction[] {
  const lines = csv.trim().split('\n');
  const transactions: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Split carefully — remarks may contain commas after our semicolon fix is NOT applied yet
    // We split on the first 9 commas, remainder is remark
    const parts = lines[i].split(',');
    if (parts.length < 9) continue;

    // Remark is everything from index 9 onward (re-join in case it had commas)
    const rawRemark = parts.slice(9).join(',').trim();

    let date = parts[0].trim();
    // Fix year typos: any year < 2020 is almost certainly a two-decade typo
    // e.g. 2006-08-11 → 2026-08-11. Add 20 years to correct it.
    const yearMatch = date.match(/^(\d{4})-/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year < 2020) {
        date = date.replace(/^\d{4}/, String(year + 20));
      }
    }

    let name = parts[1].trim();
    if (name.toLowerCase() === 'mnc') name = 'MNC';

    const rate = parseFloat(parts[3]);

    transactions.push({
      date,
      name,
      order: parts[2].trim(),
      rate,
      rateDisplay: rate.toFixed(2),
      usdt: parseFloat(parts[4]),
      idr: parseFloat(parts[5]),
      settlement: parseFloat(parts[6]),
      profit: parseFloat(parts[7]),
      nonExpected: parseFloat(parts[8]),
      remark: formatIDRRemark(rawRemark),
    });
  }

  return transactions;
}

/** Format date string to short label: "2026-05-19" → "May 19" */
export function fmtDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Aggregate transactions by date for the daily breakdown.
 * Returns an array sorted by date ascending.
 */
export function aggregateByDay(transactions: Transaction[]): DailyAggregate[] {
  const map = new Map<string, DailyAggregate>();

  for (const tx of transactions) {
    if (!map.has(tx.date)) {
      map.set(tx.date, {
        date: tx.date,
        label: fmtDateLabel(tx.date),
        txCount: 0,
        usdt: 0,
        idr: 0,
        settlement: 0,
        profit: 0,
        nonExpected: 0,
        avgRate: 0,
        wAvgRate: 0,
        transactions: [],
      });
    }
    const agg = map.get(tx.date)!;
    agg.txCount++;
    agg.usdt += tx.usdt;
    agg.idr += tx.idr;
    agg.settlement += tx.settlement;
    agg.profit += tx.profit;
    agg.nonExpected += tx.nonExpected;
    agg.transactions.push(tx);
  }

  // Compute avg rates
  for (const agg of map.values()) {
    const rateSum = agg.transactions.reduce((s, t) => s + t.rate, 0);
    agg.avgRate = rateSum / agg.transactions.length;
    // VWAP: weighted by USDT
    const weighted = agg.transactions.reduce((s, t) => s + t.usdt * t.rate, 0);
    agg.wAvgRate = agg.usdt > 0 ? weighted / agg.usdt : agg.avgRate;
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Compute summary stats across all transactions */
export function calculateSummary(transactions: Transaction[]): Summary {
  if (transactions.length === 0) {
    return {
      totalTransactions: 0, totalUSDAT: 0, totalIDR: 0,
      totalSettlement: 0, totalProfit: 0, totalNonExpected: 0,
      vwapRate: 0, profitMarginBps: 0,
      dateRange: { start: '', end: '' }, activeDays: 0,
    };
  }

  const totalUSDAT      = transactions.reduce((s, t) => s + t.usdt, 0);
  const totalIDR        = transactions.reduce((s, t) => s + t.idr, 0);
  const totalSettlement = transactions.reduce((s, t) => s + t.settlement, 0);
  const totalProfit     = transactions.reduce((s, t) => s + t.profit, 0);
  const totalNonExpected= transactions.reduce((s, t) => s + t.nonExpected, 0);
  const weightedRateSum = transactions.reduce((s, t) => s + t.usdt * t.rate, 0);
  const vwapRate        = totalUSDAT > 0 ? weightedRateSum / totalUSDAT : 0;
  const profitMarginBps = totalIDR > 0 ? (totalProfit / totalIDR) * 10_000 : 0;

  const uniqueDays = new Set(transactions.map(t => t.date));
  const dates = [...uniqueDays].sort();

  return {
    totalTransactions: transactions.length,
    totalUSDAT,
    totalIDR,
    totalSettlement,
    totalProfit,
    totalNonExpected,
    vwapRate,
    profitMarginBps,
    dateRange: { start: dates[0], end: dates[dates.length - 1] },
    activeDays: uniqueDays.size,
  };
}
