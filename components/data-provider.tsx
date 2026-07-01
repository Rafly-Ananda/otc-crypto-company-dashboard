'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  parseCSVData,
  calculateSummary,
  aggregateByDay,
  Transaction,
  Summary,
  DailyAggregate,
} from '@/lib/data-utils';

/* ── Raw sample data (same as original page) ────────────────────────────── */
const SAMPLE_CSV = `Date,Name,Order,Rate,USDT,IDR,Settlement,Profit,NonExpected,Remark
2006-05-19,MNC,Sell,17670,500000,8835000000,8835000000,0,0,Sell #1 Mandiri
2026-05-19,MNC,Sell,17680,499196,8825785280,8820793320,4991960,19412640,Sell #2 Mandiri. Non-exp: Rp2;052;620 PT Bahari + Rp10;000;000 min balance
2026-05-20,MNC,Sell,17710,200000,3542000000,3539000000,3000000,0,Wd 1 Mandiri AKG @ 17;710
2026-05-20,MNC,Sell,17609.80564,797500,14043819998,14036000000,7819998,0,Wd 2 & 3 Mandiri AKG. Rate slippage noted.
2026-05-22,MNC,Sell,17635,1000000,17635000000,17610000000,25000000,0,Block sell 1M USDT to MNC AKG
2026-05-25,MNC,Sell,17600,1190000,20944000000,20896400000,47600000,0,
2026-05-26,MNC,Sell,17610,1200000,21132000000,21084000000,48000000,0,
2026-06-03,MNC,Sell,17830,911000,16243130000,16188470000,54660000,0,
2026-06-05,MNC,Sell,18000,1000000,18000000000,17930000000,70000000,0,
2026-06-05,MNC,Sell,17995,1000000,17995000000,17930000000,65000000,0,
2026-06-08,MNC,Sell,18060,2140163,38651343780,38565737260,85606520,0,
2026-06-18,MNC,Sell,17840,1138397,20309002480,20263466600,45535880,0,
2026-06-23,mnc,Sell,17815,3029210,53965376150,53859353800,106022350,0,
2026-06-24,MNC,Sell,17890,948384,16966589760,16938138240,28451520,0,
2026-06-25,MNC,Sell,17905,3610996,64654883380,64546553500,108329880,0,`;

export type DataSource = 'sample' | 'uploaded' | 'sheet';

interface DataContextValue {
  transactions: Transaction[];
  summary: Summary;
  dailyData: DailyAggregate[];
  source: DataSource;
  fileName: string | null;
  sheetConfigured: boolean;
  loadCSV: (csvString: string, fileName: string) => void;
  resetToSample: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

function buildDerivedData(csvString: string) {
  const transactions = parseCSVData(csvString);
  const summary      = calculateSummary(transactions);
  const dailyData    = aggregateByDay(transactions);
  return { transactions, summary, dailyData };
}

const SESSION_KEY_CSV  = 'otc-csv-data';
const SESSION_KEY_NAME = 'otc-csv-filename';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource]           = useState<DataSource>('sample');
  const [fileName, setFileName]       = useState<string | null>(null);
  const [csvString, setCsvString]     = useState(SAMPLE_CSV);
  const [sheetConfigured, setSheetConfigured] = useState(false);

  // On mount: try fetching from Google Sheet first.
  // Falls back to sessionStorage, then sample data.
  useEffect(() => {
    async function init() {
      // 1. Try Google Sheet
      try {
        const res = await fetch('/api/sheet');
        if (res.ok) {
          const csv = await res.text();
          if (csv.trim()) {
            setCsvString(csv);
            setSource('sheet');
            setFileName('Google Sheet');
            setSheetConfigured(true);
            return;
          }
        }
        if (res.status !== 503) {
          // 503 means not configured — don't mark as configured
          setSheetConfigured(true);
        }
      } catch {
        // Network error or not configured — silently fall through
      }

      // 2. Fall back to sessionStorage
      const stored     = sessionStorage.getItem(SESSION_KEY_CSV);
      const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
      if (stored && storedName) {
        setCsvString(stored);
        setFileName(storedName);
        setSource('uploaded');
      }
    }
    init();
  }, []);

  function loadCSV(csv: string, name: string) {
    setCsvString(csv);
    setFileName(name);
    setSource('uploaded');
    sessionStorage.setItem(SESSION_KEY_CSV, csv);
    sessionStorage.setItem(SESSION_KEY_NAME, name);
  }

  function resetToSample() {
    setCsvString(SAMPLE_CSV);
    setFileName(null);
    setSource('sample');
    sessionStorage.removeItem(SESSION_KEY_CSV);
    sessionStorage.removeItem(SESSION_KEY_NAME);
  }

  const { transactions, summary, dailyData } = buildDerivedData(csvString);

  return (
    <DataContext.Provider value={{
      transactions, summary, dailyData,
      source, fileName, sheetConfigured,
      loadCSV, resetToSample,
    }}>
      {children}
    </DataContext.Provider>
  );
}
