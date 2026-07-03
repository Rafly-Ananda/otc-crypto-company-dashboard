import { NextResponse } from 'next/server';
import { readSheet, rowsToCSV } from '@/lib/sheets';

const missingEnvResponse = () =>
  NextResponse.json(
    { error: 'Google Sheets credentials not configured.' },
    { status: 503 }
  );

/**
 * GET /api/sheet/export
 * Returns the full Google Sheet as a CSV file download.
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

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Sheet is empty.' }, { status: 404 });
    }

    const csv = rowsToCSV(rows);
    const date = new Date().toISOString().split('T')[0];
    const filename = `otc-crypto-${date}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
