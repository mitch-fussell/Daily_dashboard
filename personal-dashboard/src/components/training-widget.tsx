'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveTrainingPeaksUrl } from '@/app/actions';
import { type Workout, type UpcomingWorkout, type UpcomingRace, type WeekStats, formatDuration, WORKOUT_ICON } from '@/lib/training-peaks';

type Props = {
  icsUrl: string | null;
  today: Workout | null;
  tomorrow: Workout | null;
  next: UpcomingWorkout | null;
  weekStats: WeekStats | null;
  races: UpcomingRace[];
  fetchError: string | null;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function WorkoutBlock({ label, workout }: { label: string; workout: Workout | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!workout) {
    return (
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm text-zinc-600 italic">No workout scheduled</p>
      </div>
    );
  }
  if (workout.isRest) {
    return (
      <div>
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-sm font-medium text-zinc-400">😴 Rest day</p>
      </div>
    );
  }

  const duration = formatDuration(workout.durationSecs);
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span>{WORKOUT_ICON[workout.type]}</span>
        <span className="font-semibold text-zinc-100 text-sm leading-snug">{workout.title}</span>
      </div>
      {duration !== '—' && <p className="text-xs text-zinc-400 mt-0.5 ml-6">{duration}</p>}
      {workout.description && (
        <>
          <p className={`text-xs text-zinc-500 mt-1.5 ml-6 leading-relaxed whitespace-pre-line ${expanded ? '' : 'line-clamp-2'}`}>
            {workout.description}
          </p>
          {workout.description.length > 120 && (
            <button type="button" onClick={() => setExpanded(!expanded)}
              className="text-xs text-zinc-600 hover:text-zinc-400 mt-0.5 ml-6 transition-colors">
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

const STAT_ROWS: { key: keyof Omit<WeekStats, 'total'>; label: string; icon: string }[] = [
  { key: 'Run',      label: 'Running', icon: '🏃' },
  { key: 'Bike',     label: 'Biking',  icon: '🚴' },
  { key: 'Swim',     label: 'Swimming',icon: '🏊' },
  { key: 'Strength', label: 'Gym',     icon: '🏋️' },
  { key: 'Other',    label: 'Other',   icon: '⚡' },
];

function WeekStatsBlock({ stats }: { stats: WeekStats }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">This Week</p>
      <div className="space-y-1">
        {STAT_ROWS.map(({ key, label, icon }) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <span className="text-base leading-none">{icon}</span>
              <span className="text-xs">{label}</span>
            </span>
            <span className={stats[key] > 0 ? 'text-zinc-200 text-xs font-medium' : 'text-zinc-600 text-xs'}>
              {formatDuration(stats[key])}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-zinc-700">
          <span className="text-xs text-zinc-400 font-medium">Total</span>
          <span className={`text-xs font-semibold ${stats.total > 0 ? 'text-zinc-100' : 'text-zinc-600'}`}>
            {formatDuration(stats.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function UrlForm({ current, onCancel }: { current: string | null; onCancel?: () => void }) {
  return (
    <form action={saveTrainingPeaksUrl} className="space-y-2">
      <p className="text-xs text-zinc-400 leading-relaxed">
        In TrainingPeaks go to{' '}
        <span className="text-zinc-200">Settings → My Account → Personal Calendar Feed</span>{' '}
        and copy the iCalendar URL.
      </p>
      <input
        name="icsUrl"
        type="text"
        defaultValue={current ?? ''}
        placeholder="webcal:// or https://www.trainingpeaks.com/ical/..."
        className="w-full bg-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex gap-2 items-center">
        <button type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
          {current ? 'Update' : 'Connect'}
        </button>
        {current && onCancel && (
          <>
            <button type="button" onClick={onCancel}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors">
              Cancel
            </button>
            <button type="submit" name="icsUrl" value=""
              className="text-xs text-red-500 hover:text-red-400 ml-auto transition-colors">
              Disconnect
            </button>
          </>
        )}
      </div>
    </form>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  A: 'text-red-400 bg-red-900/40',
  B: 'text-orange-400 bg-orange-900/40',
  C: 'text-yellow-400 bg-yellow-900/40',
};

export function TrainingWidget({ icsUrl, today, tomorrow, next, weekStats, races, fetchError }: Props) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const router = useRouter();

  function handleRefresh() {
    startRefresh(() => { router.refresh(); });
  }

  if (!icsUrl) return <UrlForm current={null} />;

  if (fetchError) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-red-400 font-medium">Could not load calendar</p>
        <p className="text-xs text-zinc-500 font-mono bg-zinc-800 px-2 py-1 rounded">{fetchError}</p>
        <UrlForm current={icsUrl} onCancel={() => setEditingUrl(false)} />
      </div>
    );
  }

  if (editingUrl) {
    return <UrlForm current={icsUrl} onCancel={() => setEditingUrl(false)} />;
  }

  const nothingScheduledSoon = !today && !tomorrow;

  return (
    <div className="space-y-4">
      <WorkoutBlock label="Today" workout={today} />

      {tomorrow && (
        <>
          <div className="border-t border-zinc-800" />
          <WorkoutBlock label="Tomorrow" workout={tomorrow} />
        </>
      )}

      {nothingScheduledSoon && next && (
        <>
          <div className="border-t border-zinc-800" />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
              Next —{' '}
              {new Date(next.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span className="ml-1 text-zinc-600 normal-case">({next.daysAway}d away)</span>
            </p>
            <div className="flex items-baseline gap-2">
              <span>{WORKOUT_ICON[next.workout.type]}</span>
              <span className="font-semibold text-zinc-100 text-sm">{next.workout.title}</span>
            </div>
            {next.workout.durationSecs > 0 && (
              <p className="text-xs text-zinc-400 mt-0.5 ml-6">{formatDuration(next.workout.durationSecs)}</p>
            )}
          </div>
        </>
      )}

      {races.length > 0 && (
        <>
          <div className="border-t border-zinc-800" />
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Upcoming Races</p>
            <div className="space-y-1.5">
              {races.map((race) => (
                <div key={race.date + race.title} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLOR[race.priority] ?? 'text-zinc-400 bg-zinc-800'}`}>
                    {race.priority || '—'}
                  </span>
                  <span className="text-zinc-300 flex-1 truncate">{race.title}</span>
                  <span className="text-zinc-500 flex-shrink-0">
                    {new Date(race.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span className="text-zinc-600 ml-1">({race.daysAway}d)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {weekStats && (
        <>
          <div className="border-t border-zinc-800" />
          <WeekStatsBlock stats={weekStats} />
        </>
      )}

      <div className="flex gap-3 border-t border-zinc-800 pt-2">
        <button type="button" onClick={handleRefresh} disabled={isRefreshing}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40">
          {isRefreshing ? '↻ Refreshing…' : '↻ Refresh'}
        </button>
        <button type="button" onClick={() => setEditingUrl(true)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-auto">
          ⚙ Update URL
        </button>
      </div>
    </div>
  );
}
