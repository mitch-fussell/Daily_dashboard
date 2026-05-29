import crypto from 'crypto';

export type ParsedTransaction = {
  description: string;
  amount: number; // cents, negative = expense, positive = income
  category: string | null;
  occurredAt: Date;
  importKey: string;
};

// Parse a single CSV line respecting quoted fields
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function dedupeKey(date: string, description: string, amount: string): string {
  return crypto.createHash('sha1').update(`${date}|${description}|${amount}`).digest('hex');
}

// Detect and map column indices from the header row.
// Supports: Rocket Money, Chase, Bank of America, Capital One, generic.
function mapColumns(headers: string[]): {
  date: number; description: number; amount: number;
  credit?: number; debit?: number; category?: number;
} | null {
  const h = headers.map((s) => s.toLowerCase().replace(/[^a-z]/g, ''));

  const find = (...names: string[]) => names.map((n) => h.indexOf(n)).find((i) => i >= 0) ?? -1;

  const date = find('date', 'transactiondate', 'posteddate');
  const description = find('description', 'name', 'payee', 'merchant', 'memo');
  const amount = find('amount');
  const credit = find('credit', 'creditamount', 'deposits');
  const debit = find('debit', 'debitamount', 'withdrawals');
  const category = find('category', 'merchantcategory');

  if (date < 0 || description < 0) return null;
  if (amount < 0 && credit < 0 && debit < 0) return null;

  return { date, description, amount, credit, debit, category: category >= 0 ? category : undefined };
}

export function parseCsv(text: string): { rows: ParsedTransaction[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const headers = parseLine(lines[0]);
  const cols = mapColumns(headers);
  if (!cols) return { rows: [], skipped: lines.length - 1 };

  const rows: ParsedTransaction[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length < 2) { skipped++; continue; }

    const rawDate = fields[cols.date] ?? '';
    const rawDesc = fields[cols.description] ?? '';

    // Parse amount: use single amount column or credit/debit pair
    let cents: number;
    if (cols.amount >= 0) {
      const raw = (fields[cols.amount] ?? '').replace(/[$,\s]/g, '');
      const val = parseFloat(raw);
      if (isNaN(val)) { skipped++; continue; }
      // Rocket Money: negative = expense. Some banks: positive = debit.
      // We store negative = expense, positive = income — keep sign as-is.
      cents = Math.round(val * 100);
    } else {
      const creditRaw = (fields[cols.credit!] ?? '').replace(/[$,\s]/g, '');
      const debitRaw = (fields[cols.debit!] ?? '').replace(/[$,\s]/g, '');
      const credit = parseFloat(creditRaw) || 0;
      const debit = parseFloat(debitRaw) || 0;
      cents = Math.round((credit - debit) * 100); // income positive, expense negative
    }

    const date = new Date(rawDate);
    if (isNaN(date.getTime())) { skipped++; continue; }

    rows.push({
      description: rawDesc,
      amount: cents,
      category: cols.category !== undefined ? (fields[cols.category] ?? null) : null,
      occurredAt: date,
      importKey: dedupeKey(rawDate, rawDesc, String(cents)),
    });
  }

  return { rows, skipped };
}
