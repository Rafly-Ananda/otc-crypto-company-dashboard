import { google } from 'googleapis';

/**
 * Build an authenticated Google Sheets client using a service account.
 * Credentials are read from environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL
 *   GOOGLE_PRIVATE_KEY          (the -----BEGIN PRIVATE KEY----- block)
 *   GOOGLE_SHEET_ID
 *   GOOGLE_SHEET_TAB            (tab/sheet name, e.g. "Sheet1")
 */
function getClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error(
      'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables.'
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

function getSheetCoords() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tab     = process.env.GOOGLE_SHEET_TAB ?? 'Sheet1';
  if (!sheetId) {
    throw new Error('Missing GOOGLE_SHEET_ID environment variable.');
  }
  return { sheetId, tab };
}

/**
 * Read all rows from the configured sheet.
 * Returns rows as string[][] (first row is the header).
 */
export async function readSheet(): Promise<string[][]> {
  const sheets = getClient();
  const { sheetId, tab } = getSheetCoords();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: tab,
  });

  return (res.data.values ?? []) as string[][];
}

/**
 * Completely rewrite the sheet with new rows.
 * `rows` must include the header row as rows[0].
 * Uses values.clear then values.update to ensure no stale data remains.
 */
export async function writeSheet(rows: string[][]): Promise<void> {
  const sheets = getClient();
  const { sheetId, tab } = getSheetCoords();

  // Clear the entire sheet first
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: tab,
  });

  if (rows.length === 0) return;

  // Write new data
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tab}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rows },
  });
}

/**
 * Convert raw sheet rows (string[][]) to CSV string.
 * Values that contain commas are quoted.
 */
export function rowsToCSV(rows: string[][]): string {
  return rows
    .map(row =>
      row.map(cell => {
        const s = String(cell ?? '');
        return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    )
    .join('\n');
}

/**
 * Convert a CSV string to sheet rows (string[][]).
 * Preserves the exact column order of the CSV.
 */
export function csvToRows(csv: string): string[][] {
  return csv
    .trim()
    .split('\n')
    .map(line => line.split(',').map(c => c.trim()));
}
