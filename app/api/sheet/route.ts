import { NextResponse } from 'next/server';
import { readSheet, writeSheet, rowsToCSV, csvToRows } from '@/lib/sheets';

const missingEnvResponse = () =>
  NextResponse.json(
    { error: 'Google Sheets credentials not configured. Add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID, and GOOGLE_SHEET_TAB to your environment variables.' },
    { status: 503 }
  );

/**
 * GET /api/sheet
 * Reads the current Google Sheet and returns it as a CSV string.
 */
export async function GET() {
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY ||
    !process.env.GOOGLE_SHEET_ID
  ) {
    return missingEnvResponse();
  }

  try {
    const rows = await readSheet();
    const csv  = rowsToCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/sheet
 * Body: { csv: string }
 * Completely rewrites the Google Sheet with the provided CSV data.
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
    const body = await req.json();
    const csv: string = body?.csv;

    if (typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ error: 'Request body must include a non-empty "csv" string.' }, { status: 400 });
    }

    const rows = csvToRows(csv);
    await writeSheet(rows);

    return NextResponse.json({ ok: true, rowsWritten: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
