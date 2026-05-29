'use client';

import { useTransition, useRef, useState } from 'react';
import { addHabit, updateHabit, toggleHabit, deleteHabit } from '@/app/actions';

type Habit = {
  id: string;
  name: string;
  log: Record<string, boolean>;
};

// Always use UTC dates so client + server stay in sync
function utcDay(daysAgo = 0): string {
  const ms = Date.now() - daysAgo * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function getStreakInfo(log: Record<string, boolean>) {
  const todayStr = utcDay(0);
  const todayDone = log[todayStr] === true;
  const yesterdayDone = log[utcDay(1)] === true;

  // Alive = today done, OR today not done yet but yesterday was (still have today to check)
  const alive = todayDone || yesterdayDone;

  // Count consecutive done days walking backwards
  let streak = 0;
  let offset = todayDone ? 0 : 1; // start from today if done, yesterday if not
  while (log[utcDay(offset)] === true) {
    streak++;
    offset++;
  }

  const hasHistory = Object.values(log).some(Boolean);
  return { streak, alive, todayDone, hasHistory };
}

function getPrevStreak(log: Record<string, boolean>): number {
  // Find length of the streak that ended before the current gap (for Recover prompt)
  let offset = 2; // yesterday not done (break point), so look from 2 days ago
  while (offset < 30) {
    if (log[utcDay(offset)] === true) {
      let len = 0;
      while (log[utcDay(offset)] === true) { len++; offset++; }
      return len;
    }
    offset++;
  }
  return 0;
}

const DAY_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function RecoverPanel({ habit, onClose, startTransition }: {
  habit: Habit;
  onClose: () => void;
  startTransition: (fn: () => void) => void;
}) {
  // Last 7 days (1–7 days ago, not today — today is the main checkbox)
  const days = Array.from({ length: 7 }, (_, i) => {
    const key = utcDay(i + 1);
    const d = new Date(key + 'T12:00:00Z');
    return { key, label: DAY_LABEL[d.getUTCDay()], date: d.getUTCDate(), done: habit.log[key] === true };
  });

  return (
    <div className="mt-2 ml-7 p-2 bg-zinc-800/60 rounded-lg">
      <p className="text-xs text-zinc-500 mb-2">Toggle days you completed:</p>
      <div className="flex gap-1 flex-wrap">
        {days.map(({ key, label, date, done }) => (
          <button
            key={key}
            type="button"
            onClick={() => startTransition(() => toggleHabit(habit.id, key, !done))}
            className={`flex flex-col items-center text-xs rounded-md px-2 py-1.5 transition-colors min-w-[36px] ${
              done
                ? 'bg-emerald-700/80 text-emerald-200'
                : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
            }`}
          >
            <span className="font-medium">{label}</span>
            <span className="opacity-70">{date}</span>
            <span className="mt-0.5">{done ? '✓' : '–'}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Done recovering
      </button>
    </div>
  );
}

export function HabitsWidget({ habits }: { habits: Habit[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [recoveringId, setRecoveringId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addFormRef.current?.reset();
    startTransition(() => addHabit(formData));
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditName(habit.name);
    setRecoveringId(null);
  }

  function handleSaveEdit(id: string) {
    setEditingId(null);
    startTransition(() => updateHabit(id, editName));
  }

  return (
    <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
      <div className="space-y-1 mb-4 min-h-[2rem]">
        {habits.map((habit) => {
          const { streak, alive, todayDone, hasHistory } = getStreakInfo(habit.log);
          const prevStreak = !alive && hasHistory ? getPrevStreak(habit.log) : 0;
          const isEditing = editingId === habit.id;
          const isRecovering = recoveringId === habit.id;

          return (
            <div key={habit.id}>
              {isEditing ? (
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-2 py-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(habit.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="flex-1 bg-zinc-700 text-zinc-100 text-sm rounded-md px-2.5 py-1 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(habit.id)}
                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-md transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 px-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-sm group">
                  {/* Today checkbox */}
                  <button
                    type="button"
                    onClick={() => startTransition(() => toggleHabit(habit.id, utcDay(0), !todayDone))}
                    className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      todayDone
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-zinc-600 hover:border-emerald-400'
                    }`}
                  >
                    {todayDone && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  {/* Name */}
                  <span className="flex-1 text-zinc-300">{habit.name}</span>

                  {/* Streak display */}
                  {alive ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 flex-shrink-0">
                      <span>🔥</span>
                      <span>{streak}</span>
                    </span>
                  ) : hasHistory ? (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-zinc-500">↺ 0</span>
                      <button
                        type="button"
                        onClick={() => setRecoveringId(isRecovering ? null : habit.id)}
                        className="text-xs text-amber-500 hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded bg-amber-900/30 hover:bg-amber-900/50"
                        title={prevStreak > 0 ? `Last streak: ${prevStreak} days` : 'Recover streak'}
                      >
                        Recover{prevStreak > 0 ? ` (was ${prevStreak})` : ''}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-600 flex-shrink-0">—</span>
                  )}

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => startEdit(habit)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all flex-shrink-0"
                    title="Edit name"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => startTransition(() => deleteHabit(habit.id))}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-lg leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Recovery panel */}
              {isRecovering && !isEditing && (
                <RecoverPanel
                  habit={habit}
                  onClose={() => setRecoveringId(null)}
                  startTransition={startTransition}
                />
              )}
            </div>
          );
        })}
        {habits.length === 0 && (
          <p className="text-zinc-600 text-sm italic py-1">No habits yet — add one below</p>
        )}
      </div>

      <form
        ref={addFormRef}
        onSubmit={handleAdd}
        className="flex gap-2 border-t border-zinc-800 pt-3"
      >
        <input
          name="name"
          placeholder="New habit..."
          required
          className="flex-1 min-w-0 bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-1.5 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-sm px-3 rounded-lg transition-colors flex-shrink-0"
        >
          Add
        </button>
      </form>
    </div>
  );
}
