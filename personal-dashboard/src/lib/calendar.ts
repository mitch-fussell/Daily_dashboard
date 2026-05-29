import ICAL from 'ical.js';

export type CalEvent = {
  title: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: 'blue' | 'purple' | 'emerald' | 'rose';
  location: string | null;
};

export type CalendarResult =
  | { ok: true; events: CalEvent[]; allDay: string[] }
  | { ok: false; error: string };

const COLORS: CalEvent['color'][] = ['blue', 'purple', 'emerald', 'rose'];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchCalendarEvents(icsUrl: string): Promise<CalendarResult> {
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

    const todayStr = localDateStr(new Date());
    const events: CalEvent[] = [];
    const allDay: string[] = [];
    let colorIdx = 0;

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      // Expand recurring events — check if today falls within the recurrence
      let startDate: Date;
      let endDate: Date;
      let isAllDay: boolean;

      try {
        if (event.isRecurring()) {
          const iter = event.iterator();
          let next = iter.next();
          let found = false;
          // Walk up to 400 occurrences to find one on today
          for (let i = 0; i < 400 && next; i++) {
            const d = next.toJSDate();
            if (localDateStr(d) === todayStr) {
              startDate = d;
              const dur = event.duration?.toSeconds() ?? 0;
              endDate = new Date(d.getTime() + dur * 1000);
              isAllDay = next.isDate;
              found = true;
              break;
            }
            if (d > new Date(Date.now() + 86_400_000)) break; // past tomorrow — stop
            next = iter.next();
          }
          if (!found) continue;
        } else {
          startDate = event.startDate.toJSDate();
          endDate = event.endDate.toJSDate();
          isAllDay = event.startDate.isDate;
        }
      } catch {
        continue;
      }

      // Filter to today only
      const eventDateStr = localDateStr(startDate!);
      if (eventDateStr !== todayStr) continue;

      const title = event.summary?.trim() || 'Untitled event';
      const location = (event.location ?? '').trim() || null;

      if (isAllDay!) {
        allDay.push(title);
        continue;
      }

      const startH = startDate!.getHours();
      const startM = startDate!.getMinutes();
      let endH = endDate!.getHours();
      let endM = endDate!.getMinutes();

      // Midnight end = effectively end-of-day for multi-day events
      if (endH === 0 && endM === 0) { endH = 23; endM = 59; }

      events.push({
        title,
        startH,
        startM,
        endH,
        endM,
        color: COLORS[colorIdx++ % COLORS.length],
        location,
      });
    }

    // Sort by start time
    events.sort((a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM));

    return { ok: true, events, allDay };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Calendar] fetch error:', msg);
    return { ok: false, error: msg };
  }
}
