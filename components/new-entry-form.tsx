'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/components/data-provider';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const FIELD_CLS =
  'w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-otc-neutral/60 transition-colors';

const AUTO_FIELD_CLS =
  'w-full rounded-lg border border-otc-profit/30 bg-otc-profit/5 px-3 py-2 text-sm text-otc-profit font-mono placeholder:text-muted-foreground focus:outline-none cursor-default select-none';

const LABEL_CLS = 'text-[10px] font-bold uppercase tracking-widest text-muted-foreground';

export function NewEntryForm({ onClose }: Props) {
  const { refetch } = useData();

  const [date, setDate]           = useState(today());
  const [name, setName]           = useState('');
  const [order, setOrder]         = useState('Sell');
  const [rate, setRate]           = useState('');
  const [usdt, setUsdt]           = useState('');
  const [settlement, setSettlement] = useState('');
  const [nonExpected, setNonExpected] = useState('0');
  const [remark, setRemark]       = useState('');

  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Auto-computed fields
  const idr = useMemo(() => {
    const r = parseFloat(rate);
    const u = parseFloat(usdt);
    if (!isNaN(r) && !isNaN(u)) return r * u;
    return null;
  }, [rate, usdt]);

  const profit = useMemo(() => {
    if (idr === null) return null;
    const s = parseFloat(settlement);
    if (!isNaN(s)) return idr - s;
    return null;
  }, [idr, settlement]);

  const fmt = (n: number | null) =>
    n === null ? '' : n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  async function handleSave() {
    setError(null);
    if (!date || !name.trim() || !rate || !usdt) {
      setError('Date, Counterparty, Rate, and USDT Amount are required.');
      return;
    }
    if (idr === null) {
      setError('Rate and USDT Amount must be valid numbers.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date,
        name: name.trim(),
        order,
        rate: parseFloat(rate),
        usdt: parseFloat(usdt),
        idr,
        settlement: parseFloat(settlement) || 0,
        profit: profit ?? 0,
        nonExpected: parseFloat(nonExpected) || 0,
        remark: remark.trim(),
      };

      const res = await fetch('/api/sheet/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save entry.');
      }

      refetch();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-7xl rounded-2xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="block h-5 w-1 rounded-full bg-otc-neutral" />
            <h2 className="text-base font-bold text-foreground">New entry</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">

          {/* Row 1: DATE · COUNTERPARTY · ORDER TYPE · RATE · USDT AMOUNT · IDR AMOUNT */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Date</label>
              <input
                type="date"
                className={FIELD_CLS}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Counterparty</label>
              <input
                type="text"
                className={FIELD_CLS}
                placeholder="e.g. MNC"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Order Type</label>
              <select
                className={FIELD_CLS}
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              >
                <option value="Sell">Sell</option>
                <option value="Buy">Buy</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Rate (USDT/IDR)</label>
              <input
                type="number"
                className={FIELD_CLS}
                placeholder="17670"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>USDT Amount</label>
              <input
                type="number"
                className={FIELD_CLS}
                placeholder="500000"
                value={usdt}
                onChange={(e) => setUsdt(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>
                IDR Amount{' '}
                <span className="text-otc-neutral normal-case tracking-normal">(AUTO)</span>
              </label>
              <div className={AUTO_FIELD_CLS}>
                {idr !== null ? fmt(idr) : 'auto = Rate \u00d7 USDT'}
              </div>
            </div>

          </div>

          {/* Row 2: SETTLEMENT · PROFIT · NON-EXPECTED */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Settlement Amount</label>
              <input
                type="number"
                className={FIELD_CLS}
                placeholder="Amount paid to Si..."
                value={settlement}
                onChange={(e) => setSettlement(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>
                Profit (IDR){' '}
                <span className="text-otc-neutral normal-case tracking-normal">(AUTO)</span>
              </label>
              <div className={AUTO_FIELD_CLS}>
                {profit !== null ? fmt(profit) : 'auto = IDR \u2212 Settlement'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS}>Non-Expected Cost (IDR)</label>
              <input
                type="number"
                className={FIELD_CLS}
                placeholder="0"
                value={nonExpected}
                onChange={(e) => setNonExpected(e.target.value)}
              />
            </div>

          </div>

          {/* Row 3: REMARK */}
          <div className="flex flex-col gap-1.5">
            <label className={LABEL_CLS}>Remark / Notes</label>
            <textarea
              className={`${FIELD_CLS} min-h-[90px] resize-y`}
              placeholder="Describe deductions, deliverables, notes..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="rounded-lg border border-otc-loss/30 bg-otc-loss/10 px-3 py-2 text-xs text-otc-loss">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-6 py-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="cursor-pointer rounded-xl bg-foreground px-6 py-2.5 text-sm font-semibold text-background shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save entry'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-border px-6 py-2.5 text-sm font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
