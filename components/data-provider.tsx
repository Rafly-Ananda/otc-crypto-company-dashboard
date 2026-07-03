'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  parseCSVData,
  calculateSummary,
  aggregateByDay,
  Transaction,
  Summary,
  DailyAggregate,
} from '@/lib/data-utils';

export type DataSource = 'empty' | 'uploaded' | 'sheet';

// Polling interval in ms — configurable via NEXT_PUBLIC_SYNC_INTERVAL_MS env var (default 10 s)
const SYNC_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_SYNC_INTERVAL_MS ?? 10_000);

interface DataContextValue {
  transactions: Transaction[];
  summary: Summary;
  dailyData: DailyAggregate[];
  source: DataSource;
  fileName: string | null;
  sheetConfigured: boolean;
  lastSynced: Date | null;
  isSyncing: boolean;
  isLoading: boolean;
  loadCSV: (csvString: string, fileName: string) => void;
  resetToEmpty: () => void;
  refetch: () => void;
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
  const [source, setSource]                   = useState<DataSource>('empty');
  const [fileName, setFileName]               = useState<string | null>(null);
  const [csvString, setCsvString]             = useState<string>('');
  const [sheetConfigured, setSheetConfigured] = useState(false);
  const [lastSynced, setLastSynced]           = useState<Date | null>(null);
  const [isSyncing, setIsSyncing]             = useState(false);
  const [isLoading, setIsLoading]             = useState(true);

  // Keep a ref so the interval closure always sees the latest source
  const sourceRef = useRef(source);
  useEffect(() => { sourceRef.current = source; }, [source]);

  const fetchSheet = useCallback(async (isInitial = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sheet');
      if (res.ok) {
        const csv = await res.text();
        setSheetConfigured(true);
        if (csv.trim()) {
          setCsvString(csv);
          setSource('sheet');
          setFileName('Google Sheet');
        } else {
          // Sheet exists but is empty
          if (sourceRef.current !== 'uploaded') {
            setCsvString('');
            setSource('empty');
            setFileName(null);
          }
        }
        setLastSynced(new Date());
      } else if (res.status === 503) {
        // Not configured — fall back to session on initial load
        setSheetConfigured(false);
        if (isInitial) {
          const stored     = sessionStorage.getItem(SESSION_KEY_CSV);
          const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
          if (stored && storedName) {
            setCsvString(stored);
            setFileName(storedName);
            setSource('uploaded');
          }
        }
      } else {
        setSheetConfigured(true);
        if (isInitial && sourceRef.current === 'empty') {
          const stored     = sessionStorage.getItem(SESSION_KEY_CSV);
          const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
          if (stored && storedName) {
            setCsvString(stored);
            setFileName(storedName);
            setSource('uploaded');
          }
        }
      }
    } catch {
      // Network error — on initial load fall back to session
      if (isInitial) {
        const stored     = sessionStorage.getItem(SESSION_KEY_CSV);
        const storedName = sessionStorage.getItem(SESSION_KEY_NAME);
        if (stored && storedName) {
          setCsvString(stored);
          setFileName(storedName);
          setSource('uploaded');
        }
      }
    } finally {
      setIsSyncing(false);
      if (isInitial) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSheet(true);
  }, [fetchSheet]);

  // Polling
  useEffect(() => {
    if (SYNC_INTERVAL_MS <= 0) return;
    const id = setInterval(() => fetchSheet(false), SYNC_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchSheet]);

  function loadCSV(csv: string, name: string) {
    setCsvString(csv);
    setFileName(name);
    setSource('uploaded');
    sessionStorage.setItem(SESSION_KEY_CSV, csv);
    sessionStorage.setItem(SESSION_KEY_NAME, name);
  }

  function resetToEmpty() {
    setCsvString('');
    setFileName(null);
    setSource('empty');
    sessionStorage.removeItem(SESSION_KEY_CSV);
    sessionStorage.removeItem(SESSION_KEY_NAME);
  }

  const { transactions, summary, dailyData } = buildDerivedData(csvString);

  const refetch = useCallback(() => { fetchSheet(false); }, [fetchSheet]);

  return (
    <DataContext.Provider value={{
      transactions, summary, dailyData,
      source, fileName, sheetConfigured,
      lastSynced, isSyncing, isLoading,
      loadCSV, resetToEmpty, refetch,
    }}>
      {children}
    </DataContext.Provider>
  );
}
