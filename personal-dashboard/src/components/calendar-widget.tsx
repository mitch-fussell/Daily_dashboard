'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { saveCalendarUrl, disconnectMsCalendar } from '@/app/actions';
import type { CalEvent } from '@/lib/calendar';

const HOUR_PX = 64;
const DAY_START = 6;  // 6 AM
const DAY_END = 22;   // 10 PM

const COLOR: Record<CalEvent['color'], string> = {
  blue:    'bg-blue-900/70 border-blue-500 text-blue-200',
  purple:  'bg-purple-900/70 border-purple-500 text-purple-200',
  emerald: 'bg-emerald-900/70 border-emerald-500 text-emerald-200',
  rose:    'bg-rose-900/70 border-rose-500 text-rose-200',
};

function minutesFromDayStart(h: number, m: number) {
  return (h - DAY_START) * 60 + m;
}

function formatHour(h: number) {
  if (h === 12) return '12 PM';
  if (h > 12) return `${h - 12} PM`;
  return `${h} AM`;
}

function formatTime(h: number, m: number) {
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function IcsUrlForm({ current, onCancel }: { current: string | null; onCancel?: () => void }) {
  return (
    <form action={saveCalendarUrl} className="space-y-2">
      <p className="text-xs text-zinc-400 leading-relaxed">
        In Outlook go to{' '}
        <span className="text-zinc-200">Settings → Calendar → Shared calendars → Publish a calendar</span>
        {' '}and copy the <span className="text-zinc-200">ICS</span> link.
      </p>
      <input
        name="calIcsUrl"
        type="text"
        defaultValue={current ?? ''}
        placeholder="webcal:// or https://..."
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
            <button type="submit" name="calIcsUrl" value=""
              className="text-xs text-red-500 hover:text-red-400 ml-auto transition-colors">
              Disconnect
            </button>
          </>
        )}
      </div>
    </form>
  );
}

function ConnectOptions() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">Connect via Microsoft</p>
        <a href="/api/ms-calendar/connect"
          className="flex items-center gap-2 bg-[#0078d4] hover:bg-[#006cbf] text-white text-xs px-3 py-2 rounded-lg transition-colors w-fit">
          <MsIcon />
          Sign in with Microsoft
        </a>
      </div>
      <div className="border-t border-zinc-800 pt-3 space-y-2">
        <p className="text-xs font-medium text-zinc-400">Or connect via ICS link</p>
        <IcsUrlForm current={null} />
      </div>
    </div>
  );
}

function MsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

type Props = {
  calIcsUrl: string | null;
  events: CalEvent[];
  allDay: string[];
  fetchError: string | null;
  msConnected: boolean;
  msEvents: CalEvent[];
  msAllDay: string[];
  msFetchError: string | null;
};

export function CalendarWidget({
  calIcsUrl,
  events,
  allDay,
  fetchError,
  msConnected,
  msEvents,
  msAllDay,
  msFetchError,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  const [editingIcs, setEditingIcs] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();

  const totalHours = DAY_END - DAY_START;
  const totalPx = totalHours * HOUR_PX;
  const hours = Array.from({ length: totalHours }, (_, i) => DAY_START + i);

  // Merge ICS and MS events, sorted by start time
  const allEvents = [...events, ...msEvents].sort(
    (a, b) => a.startH * 60 + a.startM - (b.startH * 60 + b.startM)
  );
  const allDayEvents = [...allDay, ...msAllDay];

  useEffect(() => {
    function update() {
      const now = new Date();
      setNowMinutes(minutesFromDayStart(now.getHours(), now.getMinutes()));
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (nowMinutes !== null && scrollRef.current) {
      const scrollTo = (nowMinutes / 60) * HOUR_PX - 80;
      scrollRef.current.scrollTop = Math.max(0, scrollTo);
    }
  }, [nowMinutes]);

  // Nothing connected — show setup options
  if (!calIcsUrl && !msConnected) return <ConnectOptions />;

  // ICS error (shown when editing ICS)
  if (editingIcs) {
    return <IcsUrlForm current={calIcsUrl} onCancel={() => setEditingIcs(false)} />;
  }

  return (
    <div className="space-y-2">
      {/* Error banners */}
      {fetchError && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
          ICS error: {fetchError}
        </div>
      )}
      {msFetchError && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-2 py-1">
          Microsoft: {msFetchError}{' '}
          <a href="/api/ms-calendar/connect" className="underline hover:text-red-300">Reconnect</a>
        </div>
      )}

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {allDayEvents.map((title, i) => (
            <span key={i} className="text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full truncate max-w-full">
              {title}
            </span>
          ))}
        </div>
      )}

      {/* Hour grid */}
      <div
        ref={scrollRef}
        className="overflow-y-auto max-h-72 relative pr-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
      >
        <div className="relative" style={{ height: totalPx }}>

          {/* Hour rows */}
          {hours.map((h) => (
            <div key={h} className="absolute left-0 right-0 flex items-start"
              style={{ top: (h - DAY_START) * HOUR_PX }}>
              <span className="text-zinc-600 text-xs w-14 flex-shrink-0 -mt-2 select-none">
                {formatHour(h)}
              </span>
              <div className="flex-1 border-t border-zinc-800" />
            </div>
          ))}

          {/* Half-hour guides */}
          {hours.map((h) => (
            <div key={`${h}-half`}
              className="absolute left-14 right-0 border-t border-zinc-800/40 border-dashed"
              style={{ top: (h - DAY_START) * HOUR_PX + HOUR_PX / 2 }} />
          ))}

          {/* Events */}
          {allEvents.length === 0 && (
            <div className="absolute left-14 right-0 top-4">
              <p className="text-xs text-zinc-600 italic">No events today</p>
            </div>
          )}
          {allEvents.map((ev, i) => {
            const topMins = minutesFromDayStart(ev.startH, ev.startM);
            const heightMins = (ev.endH - ev.startH) * 60 + (ev.endM - ev.startM);
            const top = (topMins / 60) * HOUR_PX;
            const height = Math.max((heightMins / 60) * HOUR_PX, 20);
            return (
              <div key={i}
                className={`absolute left-16 right-1 rounded border-l-2 px-2 py-0.5 ${COLOR[ev.color]}`}
                style={{ top, height }}
                title={ev.location ? `${ev.title} — ${ev.location}` : ev.title}
              >
                <p className="text-xs font-medium leading-tight truncate">{ev.title}</p>
                {height > 28 && (
                  <p className="text-xs opacity-70 leading-tight">
                    {formatTime(ev.startH, ev.startM)}–{formatTime(ev.endH, ev.endM)}
                  </p>
                )}
                {height > 46 && ev.location && (
                  <p className="text-xs opacity-50 leading-tight truncate">{ev.location}</p>
                )}
              </div>
            );
          })}

          {/* Current time line */}
          {nowMinutes !== null && nowMinutes >= 0 && nowMinutes <= totalHours * 60 && (
            <div className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
              style={{ top: (nowMinutes / 60) * HOUR_PX }}>
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-12" />
              <div className="flex-1 border-t border-red-500" />
            </div>
          )}
        </div>
      </div>

      {/* Footer controls */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-zinc-800 pt-2">
        <button type="button"
          onClick={() => startRefresh(() => { router.refresh(); })}
          disabled={isRefreshing}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40">
          {isRefreshing ? '↻ Refreshing…' : '↻ Refresh'}
        </button>

        {calIcsUrl && (
          <button type="button" onClick={() => setEditingIcs(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ⚙ ICS URL
          </button>
        )}

        {msConnected ? (
          <button type="button"
            disabled={isDisconnecting}
            onClick={() => startDisconnect(async () => { await disconnectMsCalendar(); })}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors ml-auto disabled:opacity-40">
            {isDisconnecting ? 'Disconnecting…' : '× Microsoft'}
          </button>
        ) : (
          <a href="/api/ms-calendar/connect"
            className="text-xs text-zinc-500 hover:text-[#0078d4] transition-colors ml-auto">
            + Connect Microsoft
          </a>
        )}
      </div>
    </div>
  );
}
