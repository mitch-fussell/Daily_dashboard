'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { todos, habits, notes, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  return session.user.id;
}

// ── Todos ────────────────────────────────────────────────────────────────────

export async function addTodo(formData: FormData) {
  const userId = await getUserId();
  const text = (formData.get('text') as string)?.trim();
  const priority = (formData.get('priority') as string) ?? 'med';
  const dueDateStr = formData.get('dueAt') as string | null;
  if (!text) return;

  // Store as UTC noon to avoid timezone day-shift issues
  const dueAt = dueDateStr ? new Date(`${dueDateStr}T12:00:00Z`) : null;

  await db.insert(todos).values({
    id: crypto.randomUUID(),
    userId,
    text,
    priority,
    done: false,
    dueAt,
  });
  revalidatePath('/');
}

export async function toggleTodo(id: string, done: boolean) {
  const userId = await getUserId();
  await db.update(todos)
    .set({ done, completedAt: done ? new Date() : null })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  revalidatePath('/');
}

export async function updateTodo(id: string, formData: FormData) {
  const userId = await getUserId();
  const text = (formData.get('text') as string)?.trim();
  const priority = formData.get('priority') as string;
  const dueDateStr = formData.get('dueAt') as string | null;
  if (!text) return;

  const dueAt = dueDateStr ? new Date(`${dueDateStr}T12:00:00Z`) : null;

  await db.update(todos)
    .set({ text, priority, dueAt })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  revalidatePath('/');
}

export async function deleteTodo(id: string) {
  const userId = await getUserId();
  await db.delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)));
  revalidatePath('/');
}

// ── Habits ───────────────────────────────────────────────────────────────────

export async function updateHabit(id: string, name: string) {
  const userId = await getUserId();
  if (!name.trim()) return;
  await db.update(habits)
    .set({ name: name.trim() })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
  revalidatePath('/');
}

export async function addHabit(formData: FormData) {
  const userId = await getUserId();
  const name = (formData.get('name') as string)?.trim();
  if (!name) return;

  await db.insert(habits).values({
    id: crypto.randomUUID(),
    userId,
    name,
    log: {},
  });
  revalidatePath('/');
}

export async function toggleHabit(id: string, date: string, done: boolean) {
  const userId = await getUserId();
  const [habit] = await db.select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
  if (!habit) return;

  await db.update(habits)
    .set({ log: { ...habit.log, [date]: done } })
    .where(eq(habits.id, id));
  revalidatePath('/');
}

export async function deleteHabit(id: string) {
  const userId = await getUserId();
  await db.delete(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)));
  revalidatePath('/');
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function normalizeIcsUrl(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().replace(/^webcal:\/\//i, 'https://');
}

export async function saveCalendarUrls(formData: FormData) {
  const userId = await getUserId();
  await db.update(users)
    .set({
      calIcsUrl: normalizeIcsUrl(formData.get('calIcsUrl') as string),
      calIcsUrl2: normalizeIcsUrl(formData.get('calIcsUrl2') as string),
    })
    .where(eq(users.id, userId));
  revalidatePath('/');
  redirect('/');
}

// ── TrainingPeaks ─────────────────────────────────────────────────────────────

export async function saveTrainingPeaksUrl(formData: FormData) {
  const userId = await getUserId();
  const raw = (formData.get('icsUrl') as string)?.trim();
  const url = raw ? raw.replace(/^webcal:\/\//i, 'https://') : null;
  await db.update(users)
    .set({ tpIcsUrl: url || null })
    .where(eq(users.id, userId));
  revalidatePath('/');
}

// ── Notes ────────────────────────────────────────────────────────────────────

export async function saveNote(slot: number, content: string) {
  const userId = await getUserId();
  const [existing] = await db.select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.slot, slot)));

  if (existing) {
    await db.update(notes)
      .set({ content, updatedAt: new Date() })
      .where(eq(notes.id, existing.id));
  } else {
    await db.insert(notes).values({
      id: crypto.randomUUID(),
      userId,
      slot,
      content,
      updatedAt: new Date(),
    });
  }
  // No revalidatePath — autosave runs silently without re-rendering the page
}
