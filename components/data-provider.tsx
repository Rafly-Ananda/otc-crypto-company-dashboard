'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  parseCSVData,
  calculateSummary,
  aggregateByDay,
  Transaction,
  Summary,
  DailyAggregate,
} from '@/lib/data-utils';

export type DataSource = 'sheet' | 'uploaded' | 'empty';

interface DataContextValue {
  transactions: Transaction[];
  summary: Summary;
  dailyData: DailyAggregate[];
  source: DataSource;
  fileName: string | null;
  syncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  loadCSV: (csvString: string, fileName: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}

function buildDerivedData(csvString: string) {
  try {
    const transactions = parseCSVData(csvString);
    const summary = calculateSummary(transactions);
    const dailyData = aggregateByDay(transactions);
    return { transactions, summary, dailyData };
  } catch {
    return {
      transactions: [],
      summary: {
        totalUSDAT: 0,
        totalIDR: 0,
        totalSettlement: 0,
        totalProfit: 0,
        totalNonExpected: 0,
        profitMarginBps: 0,
        dateRange: { start: '', end: '' },
        tradingDays: 0,
        totalOrders: 0,
        averageRate: 0,
      },
      dailyData: [],
    };
  }
}

const SESSION_KEY_CSV = 'otc-csv-data';
const SESSION_KEY_NAME = 'otc-csv-filename';
const POLL_INTERVAL_MS = parseInt(
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_SHEET_SYNC_INTERVAL_MS ?? '10000'
    : '10000',
  10
);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<DataSource>('empty');
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvString, setCsvString] = useState('');
  const [syncing, setSyncing] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Fetch data from Google Sheet
  const fetchFromSheet = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sheet');
      if (res.ok) {
        const csv = await res.text();
        if (csv.trim()) {
          setCsvString(csv);
          setSource('sheet');
          setFileName(null);
          setLastSyncTime(new Date());
          setSyncError(null);
        } else {
          setCsvString('');
          setSource('empty');
          setLastSyncTime(new Date());
          setSyncError(null);
        }
      } else if (res.status === 503) {
        setCsvString('');
        setSource('empty');
        setLastSyncTime(new Date());
        setSyncError('Sheet not configured');
      } else {
        setSyncError(`Sync error: ${res.status}`);
      }
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Network error'
      );
    } finally {
      setSyncing(false);
    }
  }, []);

  // On mount: fetch immediately, then set up polling
  useEffect(() => {
    fetchFromSheet();
    const interval = setInterval(fetchFromSheet, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchFromSheet]);

  // Try to restore uploaded CSV from sessionStorage (override sheet if present)
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY_CSV);
    const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
    if (stored && storedName) {
      setCsvString(stored);
      setFileName(storedName);
      setSource('uploaded');
      setLastSyncTime(null);
      setSyncError(null);
    }
  }, []);

  function loadCSV(csv: string, name: string) {
    setCsvString(csv);
    setFileName(name);
    setSource('uploaded');
    sessionStorage.setItem(SESSION_KEY_CSV, csv);
    sessionStorage.setItem(SESSION_KEY_NAME, name);
    setLastSyncTime(null);
  }

  const { transactions, summary, dailyData } = buildDerivedData(csvString);

  return (
    <DataContext.Provider
      value={{
        transactions,
        summary,
        dailyData,
        source,
        fileName,
        syncing,
        lastSyncTime,
        syncError,
        loadCSV,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
