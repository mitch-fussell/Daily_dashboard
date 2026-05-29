import ICAL from 'ical.js';

export type WorkoutType = 'Run' | 'Bike' | 'Swim' | 'Strength' | 'Rest' | 'Other';

export type Workout = {
  title: string;
  type: WorkoutType;
  durationSecs: number;
  description: string;
  isRest: boolean;
  isRace: boolean;  // A/B/C priority race events — shown separately, not as workouts
};

export type UpcomingWorkout = {
  workout: Workout;
  date: string;
  daysAway: number;
};

export type UpcomingRace = {
  title: string;
  date: string;
  daysAway: number;
  priority: string; // 'A', 'B', 'C', or ''
};

export type WeekStats = {
  Run: number;
  Bike: number;
  Swim: number;
  Strength: number;
  Other: number;
  total: number;
};

function detectType(summary: string): WorkoutType {
  if (/run|jog|marathon|5k|10k|half/i.test(summary)) return 'Run';
  if (/bike|cycl|ride|power/i.test(summary)) return 'Bike';
  if (/swim|pool|open water/i.test(summary)) return 'Swim';
  if (/strength|lift|weight|gym/i.test(summary)) return 'Strength';
  if (/rest|off|recov/i.test(summary)) return 'Rest';
  return 'Other';
}

function cleanDescription(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 400);
}

// TrainingPeaks puts "Actual Time: H:MM" in the description for completed workouts
function parseActualTime(description: string): number {
  const match = description.match(/Actual Time:\s*(\d+):(\d+)/i);
  if (!match) return 0;
  return (parseInt(match[1]) * 60 + parseInt(match[2])) * 60; // → seconds
}

function parseDuration(event: InstanceType<typeof ICAL.Event>): number {
  try {
    const dur = event.duration;
    if (dur) return dur.toSeconds();
  } catch { /* no DURATION property */ }
  try {
    const ms = event.endDate.toJSDate().getTime() - event.startDate.toJSDate().getTime();
    return Math.max(0, ms / 1000);
  } catch { return 0; }
}

function toUtcDateStr(jsDate: Date): string {
  return jsDate.toISOString().slice(0, 10);
}

// Monday–Sunday week containing today (UTC)
function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.now() - diff * 86_400_000);
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  return { start: toUtcDateStr(monday), end: toUtcDateStr(sunday) };
}

// TrainingPeaks race priority: "A: Race Name", "B: Race Name", "C: Race Name"
function getRacePriority(summary: string): string | null {
  const m = summary.match(/^([A-D]):\s/i);
  return m ? m[1].toUpperCase() : null;
}

function parseWorkout(vevent: InstanceType<typeof ICAL.Component>): Workout {
  const event = new ICAL.Event(vevent);
  const title = event.summary?.trim() || 'Untitled workout';
  const type = detectType(title);
  const description = cleanDescription(event.description ?? '');
  const actualSecs = parseActualTime(description);
  const durationSecs = actualSecs > 0 ? actualSecs : parseDuration(event);
  const isRest = type === 'Rest' || /rest|off/i.test(title);
  const isRace = getRacePriority(title) !== null;
  return { title, type, durationSecs, description, isRest, isRace };
}

export type TrainingResult =
  | { ok: true; today: Workout | null; tomorrow: Workout | null; next: UpcomingWorkout | null; weekStats: WeekStats; races: UpcomingRace[] }
  | { ok: false; error: string };

export async function fetchTrainingData(icsUrl: string): Promise<TrainingResult> {
  try {
    const url = icsUrl.replace(/^webcal:\/\//i, 'https://');
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PersonalDashboard/1.0)' },
      cache: 'no-store',
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };

    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return { ok: false, error: 'Response is not a valid ICS file' };
    }

    const jcal = ICAL.parse(text);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    const todayStr = toUtcDateStr(new Date());
    const tomorrowStr = toUtcDateStr(new Date(Date.now() + 86_400_000));
    const { start: weekStart, end: weekEnd } = getWeekRange();

    let today: Workout | null = null;
    let tomorrow: Workout | null = null;
    const upcomingWorkouts: { date: string; workout: Workout }[] = [];
    const upcomingRaces: UpcomingRace[] = [];
    const weekStats: WeekStats = { Run: 0, Bike: 0, Swim: 0, Strength: 0, Other: 0, total: 0 };

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);
      const startStr = toUtcDateStr(event.startDate.toJSDate());
      const workout = parseWorkout(vevent);

      // Separate race events from workouts
      if (workout.isRace) {
        if (startStr >= todayStr) {
          upcomingRaces.push({
            title: workout.title.replace(/^[A-D]:\s*/i, '').trim(),
            date: startStr,
            daysAway: Math.round((new Date(startStr + 'T12:00:00Z').getTime() - Date.now()) / 86_400_000),
            priority: getRacePriority(workout.title) ?? '',
          });
        }
        continue; // don't process races as workouts
      }

      if (startStr === todayStr) today = workout;
      else if (startStr === tomorrowStr) tomorrow = workout;
      else if (startStr > tomorrowStr) upcomingWorkouts.push({ date: startStr, workout });

      // Week stats — includes today, tomorrow, and all days this week
      if (startStr >= weekStart && startStr <= weekEnd && !workout.isRest && workout.durationSecs > 0) {
        const key = workout.type === 'Run' ? 'Run'
          : workout.type === 'Bike' ? 'Bike'
          : workout.type === 'Swim' ? 'Swim'
          : workout.type === 'Strength' ? 'Strength'
          : 'Other';
        weekStats[key] += workout.durationSecs;
        weekStats.total += workout.durationSecs;
      }
    }

    upcomingWorkouts.sort((a, b) => a.date.localeCompare(b.date));
    upcomingRaces.sort((a, b) => a.date.localeCompare(b.date));

    const nextEntry = upcomingWorkouts.find(u => !u.workout.isRest) ?? upcomingWorkouts[0] ?? null;
    const next: UpcomingWorkout | null = nextEntry
      ? {
          workout: nextEntry.workout,
          date: nextEntry.date,
          daysAway: Math.round((new Date(nextEntry.date + 'T12:00:00Z').getTime() - Date.now()) / 86_400_000),
        }
      : null;

    // Only show races within the next 90 days
    const races = upcomingRaces.filter(r => r.daysAway <= 90).slice(0, 3);

    return { ok: true, today, tomorrow, next, weekStats, races };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[TrainingPeaks] fetch error:', msg);
    return { ok: false, error: msg };
  }
}

export function formatDuration(secs: number): string {
  if (secs <= 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

export const WORKOUT_ICON: Record<WorkoutType, string> = {
  Run: '🏃',
  Bike: '🚴',
  Swim: '🏊',
  Strength: '🏋️',
  Rest: '😴',
  Other: '⚡',
};
