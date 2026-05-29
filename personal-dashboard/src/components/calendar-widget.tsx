'use client';

import { useEffect, useRef, useState } from 'react';

const HOUR_PX = 64; // pixels per hour
const DAY_START = 6; // 6 AM
const DAY_END = 22;  // 10 PM

type CalEvent = {
  title: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: 'blue' | 'purple' | 'emerald' | 'rose';
};

// Placeholder events — replaced by real data in Step 14
const PLACEHOLDER_EVENTS: CalEvent[] = [
  { title: 'Morning run', startH: 6, startM: 30, endH: 7, endM: 15, color: 'emerald' },
  { title: 'Stand-up', startH: 9, startM: 0, endH: 9, endM: 30, color: 'blue' },
  { title: 'Design review', startH: 11, startM: 30, endH: 12, endM: 30, color: 'purple' },
  { title: '1:1 with manager', startH: 15, startM: 0, endH: 15, endM: 45, color: 'blue' },
];

const COLOR: Record<CalEvent['color'], string> = {
  blue: 'bg-blue-900/70 border-blue-500 text-blue-200',
  purple: 'bg-purple-900/70 border-purple-500 text-purple-200',
  emerald: 'bg-emerald-900/70 border-emerald-500 text-emerald-200',
  rose: 'bg-rose-900/70 border-rose-500 text-rose-200',
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

export function CalendarWidget({ events = PLACEHOLDER_EVENTS }: { events?: CalEvent[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  const totalHours = DAY_END - DAY_START;
  const totalPx = totalHours * HOUR_PX;

  // Set current time and scroll to it
  useEffect(() => {
    function update() {
      const now = new Date();
      const mins = minutesFromDayStart(now.getHours(), now.getMinutes());
      setNowMinutes(mins);
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

  const hours = Array.from({ length: totalHours }, (_, i) => DAY_START + i);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto max-h-72 relative pr-1"
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
    >
      <div className="relative" style={{ height: totalPx }}>

        {/* Hour rows */}
        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-start"
            style={{ top: (h - DAY_START) * HOUR_PX }}
          >
            <span className="text-zinc-600 text-xs w-14 flex-shrink-0 -mt-2 select-none">
              {formatHour(h)}
            </span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>
        ))}

        {/* Half-hour guides */}
        {hours.map((h) => (
          <div
            key={`${h}-half`}
            className="absolute left-14 right-0 border-t border-zinc-800/40 border-dashed"
            style={{ top: (h - DAY_START) * HOUR_PX + HOUR_PX / 2 }}
          />
        ))}

        {/* Events */}
        {events.map((ev, i) => {
          const topMins = minutesFromDayStart(ev.startH, ev.startM);
          const heightMins = (ev.endH - ev.startH) * 60 + (ev.endM - ev.startM);
          const top = (topMins / 60) * HOUR_PX;
          const height = Math.max((heightMins / 60) * HOUR_PX, 20);
          return (
            <div
              key={i}
              className={`absolute left-16 right-1 rounded border-l-2 px-2 py-0.5 ${COLOR[ev.color]}`}
              style={{ top, height }}
            >
              <p className="text-xs font-medium leading-tight truncate">{ev.title}</p>
              {height > 30 && (
                <p className="text-xs opacity-70 leading-tight">
                  {formatTime(ev.startH, ev.startM)}–{formatTime(ev.endH, ev.endM)}
                </p>
              )}
            </div>
          );
        })}

        {/* Current time line */}
        {nowMinutes !== null && nowMinutes >= 0 && nowMinutes <= totalHours * 60 && (
          <div
            className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
            style={{ top: (nowMinutes / 60) * HOUR_PX }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 ml-12" />
            <div className="flex-1 border-t border-red-500" />
          </div>
        )}
      </div>
    </div>
  );
}
