'use client';

import { useTransition, useRef, useState } from 'react';
import { addTodo, toggleTodo, updateTodo, deleteTodo } from '@/app/actions';

type Todo = {
  id: string;
  text: string;
  done: boolean;
  priority: string;
  dueAt: Date | null;
  completedAt: Date | null;
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, med: 1, low: 2 };

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function urgencyStyle(dueAt: Date | null) {
  if (!dueAt) return null;
  const days = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0)   return { bar: 'bg-red-500',    badge: 'bg-red-900/60 text-red-300',      label: 'Overdue' };
  if (days < 1)   return { bar: 'bg-red-400',    badge: 'bg-red-900/50 text-red-300',      label: 'Today' };
  if (days < 3)   return { bar: 'bg-orange-400', badge: 'bg-orange-900/50 text-orange-300', label: `${Math.ceil(days)}d` };
  if (days < 7)   return { bar: 'bg-yellow-400', badge: 'bg-yellow-900/50 text-yellow-300', label: `${Math.ceil(days)}d` };
  return           { bar: 'bg-green-500',  badge: 'bg-green-900/40 text-green-400',   label: `${Math.ceil(days)}d` };
}

function formatDueDate(dueAt: Date) {
  return new Date(dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toDateInput(dueAt: Date | null) {
  if (!dueAt) return '';
  return new Date(dueAt).toISOString().slice(0, 10);
}

export function TodosWidget({ todos }: { todos: Todo[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);

  const weekStart = getWeekStart();
  const visible = todos.filter((t) => {
    if (!t.done) return true;
    if (!t.completedAt) return true;
    return new Date(t.completedAt) >= weekStart;
  });
  const sorted = [...visible].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
  });

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    addFormRef.current?.reset();
    startTransition(() => addTodo(formData));
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setEditingId(null);
    startTransition(() => updateTodo(id, formData));
  }

  return (
    <div className={isPending ? 'opacity-70 pointer-events-none' : ''}>
      <ul className="space-y-1.5 mb-4 min-h-[2rem]">
        {sorted.map((todo) => {
          const urgency = urgencyStyle(todo.dueAt);

          if (editingId === todo.id) {
            return (
              <li key={todo.id} className="rounded-lg bg-zinc-800 p-2.5">
                <form onSubmit={(e) => handleEdit(e, todo.id)} className="space-y-2">
                  <input
                    name="text"
                    defaultValue={todo.text}
                    required
                    autoFocus
                    onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                    className="w-full bg-zinc-700 text-zinc-100 text-sm rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex gap-2">
                    <select
                      name="priority"
                      defaultValue={todo.priority}
                      className="bg-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 outline-none flex-1"
                    >
                      <option value="low">low priority</option>
                      <option value="med">med priority</option>
                      <option value="high">high priority</option>
                    </select>
                    <input
                      name="dueAt"
                      type="date"
                      defaultValue={toDateInput(todo.dueAt)}
                      className="bg-zinc-700 text-zinc-300 text-xs rounded-md px-2 py-1.5 outline-none flex-1 [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li key={todo.id} className="flex items-center gap-2 text-sm group rounded-lg overflow-hidden">
              {/* Urgency bar */}
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 transition-colors ${
                todo.done ? 'bg-zinc-700' : (urgency?.bar ?? 'bg-zinc-700')
              }`} />

              {/* Checkbox */}
              <button
                type="button"
                onClick={() => startTransition(() => toggleTodo(todo.id, !todo.done))}
                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  todo.done ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 hover:border-indigo-400'
                }`}
              >
                {todo.done && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Text */}
              <span className={`flex-1 py-1.5 ${todo.done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                {todo.text}
              </span>

              {/* Due date badge */}
              {todo.dueAt && !todo.done && urgency && (
                <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${urgency.badge}`}>
                  {urgency.label === 'Overdue' || urgency.label === 'Today'
                    ? urgency.label
                    : formatDueDate(todo.dueAt)}
                </span>
              )}

              {/* Priority */}
              <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                todo.priority === 'high' ? 'bg-red-900/50 text-red-400'
                : todo.priority === 'med' ? 'bg-yellow-900/50 text-yellow-400'
                : 'bg-zinc-800 text-zinc-500'
              }`}>
                {todo.priority}
              </span>

              {/* Edit */}
              <button
                type="button"
                onClick={() => setEditingId(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all flex-shrink-0"
                title="Edit"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 2.5a1.414 1.414 0 0 1 2 2L5 13H3v-2L11.5 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => startTransition(() => deleteTodo(todo.id))}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all text-lg leading-none w-4 flex-shrink-0"
              >
                ×
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="text-zinc-600 text-sm italic py-1">No active todos — add one below</li>
        )}
      </ul>

      {/* Add form */}
      <form
        ref={addFormRef}
        onSubmit={handleAdd}
        className="border-t border-zinc-800 pt-3 space-y-2"
      >
        <div className="flex gap-2">
          <input
            name="text"
            placeholder="Add a todo..."
            required
            className="flex-1 min-w-0 bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-1.5 placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            name="priority"
            defaultValue="med"
            className="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-2 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="low">low</option>
            <option value="med">med</option>
            <option value="high">high</option>
          </select>
        </div>
        <div className="flex gap-2">
          <input
            name="dueAt"
            type="date"
            className="flex-1 bg-zinc-800 text-zinc-400 text-xs rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 rounded-lg transition-colors flex-shrink-0"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
}
