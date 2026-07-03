import { NextResponse } from 'next/server';
import { readSheet, writeSheet } from '@/lib/sheets';

const missingEnvResponse = () =>
  NextResponse.json(
    { error: 'Google Sheets credentials not configured.' },
    { status: 503 }
  );

export interface EntryPayload {
  date: string;        // YYYY-MM-DD
  name: string;
  order: string;       // e.g. "Sell"
  rate: number;
  usdt: number;
  idr: number;         // auto = rate * usdt
  settlement: number;
  profit: number;      // auto = idr - settlement
  nonExpected: number;
  remark: string;
}

/**
 * POST /api/sheet/entry
 * Appends a new transaction row to the Google Sheet,
 * then re-sorts all data rows by date ascending (keeps header in place).
 */
export async function POST(req: Request) {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY ||
    !process.env.GOOGLE_SHEET_ID
  ) {
    return missingEnvResponse();
  }

  try {
    const body: EntryPayload = await req.json();

    const { date, name, order, rate, usdt, idr, settlement, profit, nonExpected, remark } = body;

    if (!date || !name || !order || rate == null || usdt == null) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const newRow: string[] = [
      date,
      name,
      order,
      String(rate),
      String(usdt),
      String(idr),
      String(settlement),
      String(profit),
      String(nonExpected),
      remark ?? '',
    ];

    // Read existing sheet
    const rows = await readSheet();

    if (rows.length === 0) {
      // No header exists yet — write header + new row
      const header = ['date', 'name', 'order', 'rate', 'usdt', 'idr', 'settlement', 'profit', 'nonExpected', 'remark'];
      await writeSheet([header, newRow]);
      return NextResponse.json({ ok: true });
    }

    const header = rows[0];
    const dataRows = rows.slice(1);

    // Append the new row
    dataRows.push(newRow);

    // Sort data rows by date ascending (column 0)
    dataRows.sort((a, b) => {
      const da = a[0] ?? '';
      const db = b[0] ?? '';
      return da.localeCompare(db);
    });

    await writeSheet([header, ...dataRows]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
