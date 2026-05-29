import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/sign-in');

  const firstName = session.user?.name?.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Good morning, {firstName}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">{today}</p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/sign-in' });
            }}
          >
            <button
              type="submit"
              className="text-sm text-zinc-400 hover:text-white transition-colors mt-1"
            >
              Sign out
            </button>
          </form>
        </header>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Column 1: Calendar + Training */}
          <div className="space-y-4">
            <Widget title="Calendar" badge="coming soon">
              <div className="space-y-2">
                {[
                  { time: '9:00 AM', title: 'Stand-up' },
                  { time: '11:30 AM', title: 'Design review' },
                  { time: '3:00 PM', title: '1:1 with manager' },
                ].map((e) => (
                  <div key={e.title} className="flex gap-3 text-sm">
                    <span className="text-zinc-500 w-20 flex-shrink-0">{e.time}</span>
                    <span className="text-zinc-300">{e.title}</span>
                  </div>
                ))}
                <p className="text-xs text-zinc-600 pt-1">
                  Placeholder — Microsoft Calendar connects in Step 14
                </p>
              </div>
            </Widget>

            <Widget title="Training Plan" badge="coming soon">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Today</p>
                  <p className="font-medium text-zinc-100">Easy Run — 45 min</p>
                  <p className="text-zinc-500 text-xs mt-0.5">Zone 2 · ~6 miles</p>
                </div>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Tomorrow</p>
                  <p className="font-medium text-zinc-100">Tempo Intervals</p>
                  <p className="text-zinc-500 text-xs mt-0.5">5 × 1km @ threshold</p>
                </div>
                <p className="text-xs text-zinc-600 pt-1">
                  Placeholder — TrainingPeaks ICS connects in Step 15
                </p>
              </div>
            </Widget>
          </div>

          {/* Column 2: Todos */}
          <div>
            <Widget title="To-Do">
              <ul className="space-y-2">
                {[
                  { text: 'Review pull request #42', done: true, priority: 'high' },
                  { text: 'Book dentist appointment', done: false, priority: 'med' },
                  { text: 'Read chapter 3', done: false, priority: 'low' },
                  { text: 'Grocery run', done: false, priority: 'med' },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2.5 text-sm">
                    <span
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        item.done
                          ? 'bg-indigo-500 border-indigo-500'
                          : 'border-zinc-600'
                      }`}
                    >
                      {item.done && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={item.done ? 'line-through text-zinc-600' : 'text-zinc-300'}>
                      {item.text}
                    </span>
                    <span
                      className={`ml-auto text-xs px-1.5 py-0.5 rounded ${
                        item.priority === 'high'
                          ? 'bg-red-900/50 text-red-400'
                          : item.priority === 'med'
                          ? 'bg-yellow-900/50 text-yellow-400'
                          : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-600 mt-3 border-t border-zinc-800 pt-2">
                Placeholder — Supabase todos connect in Step 11
              </p>
            </Widget>
          </div>

          {/* Column 3: Habits + Notes */}
          <div className="space-y-4">
            <Widget title="Habits">
              <div className="space-y-2">
                {[
                  { name: 'Morning run', done: true },
                  { name: 'Read 30 min', done: false },
                  { name: 'No alcohol', done: true },
                  { name: 'Sleep by 10pm', done: false },
                ].map((h) => (
                  <div key={h.name} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{h.name}</span>
                    <span
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        h.done ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                      }`}
                    >
                      {h.done && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-3 border-t border-zinc-800 pt-2">
                Placeholder — Supabase habits connect in Step 12
              </p>
            </Widget>

            <Widget title="Notes">
              <div className="space-y-2 text-sm text-zinc-400">
                <p className="italic">Click to edit — autosaves every 2 seconds</p>
                <p className="text-zinc-600 text-xs border-t border-zinc-800 pt-2">
                  3 tabs, persisted to Supabase — connects in Step 13
                </p>
              </div>
            </Widget>
          </div>
        </div>
      </div>
    </div>
  );
}

function Widget({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-zinc-100">{title}</h2>
        {badge && (
          <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
