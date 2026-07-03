'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { useData } from '@/components/data-provider';
import { parseCSVData, Transaction } from '@/lib/data-utils';
import { NewEntryForm } from '@/components/new-entry-form';
import {
  Upload, FileText, AlertTriangle, CheckCircle2,
  X, ChevronRight, RotateCcw, Info, CloudUpload, Cloud, Plus, Download,
} from 'lucide-react';

/* ── Expected columns ─────────────────────────────────────────────────────── */
const REQUIRED_COLUMNS = [
  'Date', 'Name', 'Order', 'Rate', 'USDT',
  'IDR', 'Settlement', 'Profit', 'NonExpected', 'Remark',
];

/* ── Validation ───────────────────────────────────────────────────────────── */
interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
}

function validateCSV(csv: string): ValidationResult {
  const errors: string[]   = [];
  const warnings: string[] = [];

  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return { ok: false, errors: ['File has no data rows.'], warnings, rowCount: 0 };
  }

  // Check header
  const header = lines[0].split(',').map(h => h.trim());
  const missing = REQUIRED_COLUMNS.filter(c => !header.includes(c));
  if (missing.length > 0) {
    errors.push(`Missing columns: ${missing.join(', ')}`);
  }

  const rowCount = lines.length - 1;

  // Scan rows for common issues
  let yearTypos = 0, casingIssues = 0, semicolonRemarks = 0;
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 9) {
      errors.push(`Row ${i}: too few columns (expected ≥10, got ${parts.length}).`);
      continue;
    }
    const date = parts[0]?.trim();
    if (date && /^200\d-/.test(date)) yearTypos++;

    const name = parts[1]?.trim().toLowerCase();
    if (name && name !== name) casingIssues++;  // placeholder — actual logic in parser

    const remark = parts.slice(9).join(',');
    if (/\d;\d/.test(remark)) semicolonRemarks++;
  }

  if (yearTypos > 0)      warnings.push(`${yearTypos} row(s) with year typos auto-corrected (e.g. 2006 → 2026).`);
  if (semicolonRemarks > 0) warnings.push(`${semicolonRemarks} remark(s) with semicolon thousand-separators reformatted.`);

  return { ok: errors.length === 0, errors, warnings, rowCount };
}

/* ── Preview table ────────────────────────────────────────────────────────── */
function PreviewTable({ rows }: { rows: Transaction[] }) {
  const preview = rows.slice(0, 6);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-card">
            {['Date', 'Name', 'Rate', 'USDT', 'Profit', 'Remark'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.map((tx, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-foreground/[0.02]">
              <td className="px-3 py-2.5 font-mono text-foreground">{tx.date}</td>
              <td className="px-3 py-2.5 text-foreground">{tx.name}</td>
              <td className="px-3 py-2.5 font-mono text-foreground">{tx.rateDisplay}</td>
              <td className="px-3 py-2.5 font-mono text-foreground">{tx.usdt.toLocaleString()}</td>
              <td className={`px-3 py-2.5 font-mono ${tx.profit > 0 ? 'text-otc-profit' : 'text-muted-foreground'}`}>
                {tx.profit.toLocaleString()}
              </td>
              <td className="max-w-48 truncate px-3 py-2.5 text-muted-foreground">{tx.remark || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 6 && (
        <p className="px-3 py-2 text-[11px] text-muted-foreground border-t border-border bg-card/50">
          Showing 6 of {rows.length} rows
        </p>
      )}
    </div>
  );
}

/* ── Upload drop zone ─────────────────────────────────────────────────────── */
type UploadState = 'idle' | 'dragging' | 'parsed' | 'error';

export default function UploadPage() {
  const router = useRouter();
  const { loadCSV, resetToEmpty, source, fileName, sheetConfigured } = useData();
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState]           = useState<UploadState>('idle');
  const [csvText, setCsvText]       = useState<string>('');
  const [parsedFile, setParsedFile] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [preview, setPreview]       = useState<Transaction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [showEntry, setShowEntry]   = useState(false);
  const [exporting, setExporting]   = useState(false);

  /* ── File processing ── */
  function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setState('error');
      setValidation({ ok: false, errors: ['Only .csv files are supported.'], warnings: [], rowCount: 0 });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = validateCSV(text);
      setValidation(result);
      setCsvText(text);
      setParsedFile(file.name);
      if (result.ok) {
        const rows = parseCSVData(text);
        setPreview(rows);
        setState('parsed');
      } else {
        setState('error');
      }
    };
    reader.readAsText(file);
  }

  /* ── Drag handlers ── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState('dragging');
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setState(s => s === 'dragging' ? 'idle' : s);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  /* ── Confirm upload ── */
  async function handleConfirm() {
    setSubmitting(true);
    setSheetError(null);

    // Always update local session first so the dashboard works immediately
    loadCSV(csvText, parsedFile);

    // Try writing to Google Sheet if configured
    if (sheetConfigured) {
      try {
        const res = await fetch('/api/sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csv: csvText }),
        });
        if (!res.ok) {
          const data = await res.json();
          setSheetError(data.error ?? 'Failed to write to Google Sheet.');
          setSubmitting(false);
          return; // Stay on page so user sees the error
        }
      } catch {
        setSheetError('Network error while writing to Google Sheet.');
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    router.push('/');
  }

  /* ── Reset ── */
  function handleReset() {
    setState('idle');
    setCsvText('');
    setParsedFile('');
    setValidation(null);
    setPreview([]);
    if (inputRef.current) inputRef.current.value = '';
  }

  /* ── Export CSV from sheet ── */
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/sheet/export');
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Export failed.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `otc-crypto-${date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Network error during export.');
    } finally {
      setExporting(false);
    }
  }

  /* ── UI ── */
  const dropZoneClass = [
    'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-16 transition-all duration-200 cursor-pointer select-none',
    state === 'dragging'
      ? 'border-foreground/50 bg-foreground/[0.04]'
      : state === 'error'
      ? 'border-otc-loss/50 bg-otc-loss/5'
      : state === 'parsed'
      ? 'border-otc-profit/50 bg-otc-profit/5'
      : 'border-border hover:border-foreground/30 hover:bg-foreground/[0.02]',
  ].join(' ');

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10">

        {/* Page header */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Data Management
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Upload CSV File
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a transaction CSV in the OTC Crypto format. Data is stored in your browser session and used to populate the dashboard.
            </p>
          </div>

          {/* Sheet actions — only shown when Google Sheet is configured */}
          {sheetConfigured && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
              >
                <Download size={14} />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                onClick={() => setShowEntry(true)}
                className="flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                <Plus size={14} />
                New Entry
              </button>
            </div>
          )}
        </div>

        {showEntry && <NewEntryForm onClose={() => setShowEntry(false)} />}

        {/* Active file banner */}
        {source === 'uploaded' && fileName && state === 'idle' && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-otc-profit/30 bg-otc-profit/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-otc-profit shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Active file: {fileName}</p>
                <p className="text-[11px] text-muted-foreground">Dashboard is using this uploaded data.</p>
              </div>
            </div>
            <button
              onClick={() => { resetToEmpty(); }}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <RotateCcw size={11} />
              Clear data
            </button>
          </div>
        )}

        {/* Drop zone */}
        {state !== 'parsed' ? (
          <div
            className={dropZoneClass}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={onFileChange}
            />

            {state === 'error' ? (
              <AlertTriangle size={32} className="mb-4 text-otc-loss" />
            ) : state === 'dragging' ? (
              <Upload size={32} className="mb-4 animate-bounce text-foreground" />
            ) : (
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-card">
                <FileText size={24} className="text-muted-foreground" />
              </div>
            )}

            {state === 'error' ? (
              <p className="text-sm font-semibold text-otc-loss">File could not be parsed</p>
            ) : state === 'dragging' ? (
              <p className="text-sm font-semibold text-foreground">Drop to upload</p>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">
                  Drop your CSV here, or <span className="underline underline-offset-2">browse</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Supports .csv files only</p>
              </>
            )}
          </div>
        ) : null}

        {/* Validation messages — only shown in error state (errors only, no warnings here) */}
        {state === 'error' && validation && validation.errors.length > 0 && (
          <div className="mt-5 space-y-2">
            {validation.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg border border-otc-loss/30 bg-otc-loss/10 px-3.5 py-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-otc-loss" />
                <p className="text-xs text-foreground">{e}</p>
              </div>
            ))}
          </div>
        )}

        {/* Parsed state: preview + actions */}
        {state === 'parsed' && validation && (
          <div className="space-y-6">

            {/* 1. Success banner */}
            <div className="flex items-center justify-between rounded-lg border border-otc-profit/30 bg-otc-profit/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={15} className="text-otc-profit shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{parsedFile}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {validation.rowCount} transaction{validation.rowCount !== 1 ? 's' : ''} parsed successfully
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>

            {/* 2. Warnings (below success, not before it) */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-otc-neutral/30 bg-otc-neutral/10 px-3.5 py-3">
                    <Info size={14} className="mt-0.5 shrink-0 text-otc-neutral" />
                    <p className="text-xs text-foreground">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Preview */}
            <div>
              <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Data Preview
              </p>
              <PreviewTable rows={preview} />
            </div>

            {/* Sheet destination indicator */}
            <div className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 ${
              sheetConfigured
                ? 'border-otc-volume/30 bg-otc-volume/10'
                : 'border-border bg-card'
            }`}>
              {sheetConfigured
                ? <CloudUpload size={14} className="shrink-0 text-otc-volume" />
                : <Cloud size={14} className="shrink-0 text-muted-foreground" />
              }
              <p className="text-xs text-foreground">
                {sheetConfigured
                  ? 'This will rewrite your Google Sheet with the new data.'
                  : 'Google Sheet not configured — data will be saved to browser session only.'}
              </p>
            </div>

            {/* Sheet write error */}
            {sheetError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-otc-loss/30 bg-otc-loss/10 px-3.5 py-3">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-otc-loss" />
                <p className="text-xs text-foreground">{sheetError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : sheetConfigured ? 'Save to Sheet & Dashboard' : 'Load into Dashboard'}
                {!submitting && <ChevronRight size={15} />}
              </button>
              <button
                onClick={handleReset}
                disabled={submitting}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Format reference */}
        {state === 'idle' && (
          <div className="mt-8 rounded-xl border border-border bg-card p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Expected Format
            </p>
            <div className="overflow-x-auto">
              <code className="block whitespace-nowrap font-mono text-[11px] text-muted-foreground leading-relaxed">
                Date, Name, Order, Rate, USDT, IDR, Settlement, Profit, NonExpected, Remark<br />
                2026-05-19, MNC, Sell, 17680, 499196, 8825785280, 8820793320, 4991960, 0, Remark text
              </code>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ['Date', 'ISO format YYYY-MM-DD'],
                ['Rate', 'IDR price per USDT'],
                ['USDT', 'Amount of USDT sold'],
                ['IDR', 'Gross IDR (USDT × Rate)'],
                ['Settlement', 'Actual IDR received'],
                ['Profit', 'Profit booked on transaction'],
                ['NonExpected', 'Unexpected deductions'],
                ['Remark', 'Free-text notes'],
              ].map(([col, desc]) => (
                <div key={col} className="flex gap-2 text-[11px]">
                  <span className="font-mono font-semibold text-foreground/80 w-24 shrink-0">{col}</span>
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}
