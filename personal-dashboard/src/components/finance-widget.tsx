'use client';

import { useState, useTransition } from 'react';
import { importTransactionsCsv, deleteTransaction } from '@/app/actions';

export type TxRow = {
  id: string;
  description: string;
  amount: number; // cents, negative = expense
  category: string | null;
  occurredAt: Date;
  pending: boolean;
};

export type MonthlySummary = {
  month: string; // "May 2026"
  income: number;
  expenses: number;
  byCategory: { category: string; total: number }[];
};

type Props = {
  summary: MonthlySummary;
  recent: TxRow[];
  hasAny: boolean;
};

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Math.abs(cents) / 100
  );
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function catLabel(s: string | null) {
  if (!s) return 'Other';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const BAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-blue-500',
  'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
];

function UploadForm({ inline }: { inline?: boolean }) {
  const [pending, startUpload] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <form
      action={importTransactionsCsv as (formData: FormData) => Promise<void>}
      onSubmit={() => startUpload(() => {})}
      className={inline ? '' : 'space-y-3'}
    >
      <div className="space-y-2">
        {!inline && (
          <p className="text-xs text-zinc-400 leading-relaxed">
            Export from <span className="text-zinc-200">Rocket Money → Settings → Export Data</span>{' '}
            (or any bank CSV). Duplicate rows are skipped automatically on re-import.
          </p>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-3 py-1.5 rounded-lg transition-colors">
            {fileName ?? 'Choose CSV…'}
          </span>
          <input
            type="file"
            name="csv"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>
      {fileName && (
        <button
          type="submit"
          disabled={pending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
      )}
    </form>
  );
}

export function FinanceWidget({ summary, recent, hasAny }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, startDelete] = useTransition();

  const net = summary.income + summary.expenses;
  const totalSpend = Math.abs(summary.expenses);

  if (!hasAny) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Export from <span className="text-zinc-200">Rocket Money → Settings → Export Data</span>{' '}
          (or any bank CSV). Duplicate rows are skipped automatically on re-import.
        </p>
        <UploadForm />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month header */}
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">{summary.month}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
          <p className="text-xs text-zinc-500 mb-0.5">Income</p>
          <p className="text-sm font-semibold text-emerald-400">{fmt(summary.income)}</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
          <p className="text-xs text-zinc-500 mb-0.5">Spent</p>
          <p className="text-sm font-semibold text-rose-400">{fmt(totalSpend)}</p>
        </div>
        <div className="bg-zinc-800/60 rounded-lg px-3 py-2">
          <p className="text-xs text-zinc-500 mb-0.5">Net</p>
          <p className={`text-sm font-semibold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {net >= 0 ? '+' : '−'}{fmt(net)}
          </p>
        </div>
      </div>

      {/* Spending by category */}
      {summary.byCategory.length > 0 && (
        <div className="space-y-2">
          {summary.byCategory.slice(0, 6).map((cat, i) => {
            const pct = totalSpend > 0 ? (Math.abs(cat.total) / totalSpend) * 100 : 0;
            return (
              <div key={cat.category}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-zinc-300 truncate">{catLabel(cat.category)}</span>
                  <span className="text-zinc-400 flex-shrink-0 ml-2">{fmt(cat.total)}</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Recent</p>
          <div
            className="space-y-0.5 max-h-36 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
          >
            {recent.map((tx) => (
              <div key={tx.id} className="group flex items-center gap-2 py-0.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 truncate">{tx.description}</p>
                  <p className="text-xs text-zinc-600">{fmtDate(tx.occurredAt)}{tx.category ? ` · ${catLabel(tx.category)}` : ''}</p>
                </div>
                <span className={`text-xs font-medium flex-shrink-0 ${tx.amount >= 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                  {tx.amount >= 0 ? '+' : '−'}{fmt(tx.amount)}
                </span>
                <button
                  onClick={() => startDelete(async () => { await deleteTransaction(tx.id); })}
                  disabled={deleting}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 text-xs transition-opacity ml-1"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload / footer */}
      {showUpload ? (
        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <UploadForm inline />
          <button onClick={() => setShowUpload(false)} className="text-xs text-zinc-600 hover:text-zinc-400">
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-3 border-t border-zinc-800 pt-2">
          <button
            onClick={() => setShowUpload(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            ↑ Import CSV
          </button>
        </div>
      )}
    </div>
  );
}
