import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { todos, habits, notes, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { TodosWidget } from '@/components/todos-widget';
import { HabitsWidget } from '@/components/habits-widget';
import { NotesWidget } from '@/components/notes-widget';
import { CalendarWidget } from '@/components/calendar-widget';
import { TrainingWidget } from '@/components/training-widget';
import { fetchTrainingData } from '@/lib/training-peaks';
import { fetchCalendarEvents } from '@/lib/calendar';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/sign-in');

  const userId = session.user.id;
  const firstName = session.user?.name?.split(' ')[0] ?? 'there';
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [[userRecord], userTodos, userHabits, userNotes] = await Promise.all([
    db.select({ tpIcsUrl: users.tpIcsUrl, calIcsUrl: users.calIcsUrl }).from(users).where(eq(users.id, userId)),
    db.select().from(todos).where(eq(todos.userId, userId)),
    db.select().from(habits).where(eq(habits.userId, userId)),
    db.select().from(notes).where(eq(notes.userId, userId)).orderBy(asc(notes.slot)),
  ]);

  const tpIcsUrl = userRecord?.tpIcsUrl ?? null;
  const calIcsUrl = userRecord?.calIcsUrl ?? null;

  const [trainingResult, calendarResult] = await Promise.all([
    tpIcsUrl ? fetchTrainingData(tpIcsUrl) : null,
    calIcsUrl ? fetchCalendarEvents(calIcsUrl) : null,
  ]);

  const trainingFetchError = trainingResult && !trainingResult.ok ? trainingResult.error : null;
  const calendarFetchError = calendarResult && !calendarResult.ok ? calendarResult.error : null;

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

          {/* Column 1: Calendar */}
          <div className="space-y-4">
            <Widget title="Today" badge={calIcsUrl ? undefined : 'not connected'}>
              <CalendarWidget
                calIcsUrl={calIcsUrl}
                events={calendarResult?.ok ? calendarResult.events : []}
                allDay={calendarResult?.ok ? calendarResult.allDay : []}
                fetchError={calendarFetchError}
              />
            </Widget>
          </div>

          {/* Column 2: Todos + Habits + Notes */}
          <div className="space-y-4">
            <Widget title="To-Do">
              <TodosWidget todos={userTodos} />
            </Widget>

            <Widget title="Habits">
              <HabitsWidget habits={userHabits.map(h => ({
                ...h,
                log: (h.log ?? {}) as Record<string, boolean>,
              }))} />
            </Widget>

            <Widget title="Notes">
              <NotesWidget notes={userNotes.map(n => ({ slot: n.slot, content: n.content }))} />
            </Widget>
          </div>

          {/* Column 3: Training Plan */}
          <div>
            <Widget title="Training Plan" badge={tpIcsUrl ? undefined : 'not connected'}>
              <TrainingWidget
                icsUrl={tpIcsUrl}
                today={trainingResult?.ok ? trainingResult.today : []}
                tomorrow={trainingResult?.ok ? trainingResult.tomorrow : []}
                next={trainingResult?.ok ? trainingResult.next : null}
                weekStats={trainingResult?.ok ? trainingResult.weekStats : null}
                races={trainingResult?.ok ? trainingResult.races : []}
                fetchError={trainingFetchError}
              />
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
