import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  msAccessToken: text('ms_access_token'),
  msRefreshToken: text('ms_refresh_token'),
  msTokenExpiresAt: timestamp('ms_token_expires_at'),
  tpIcsUrl: text('tp_ics_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const todos = pgTable('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  text: text('text').notNull(),
  done: boolean('done').default(false).notNull(),
  priority: text('priority').notNull(), // 'low' | 'med' | 'high'
  dueAt: timestamp('due_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const habits = pgTable('habits', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  log: jsonb('log').$type<Record<string, boolean>>().default({}).notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  description: text('description').notNull(),
  amount: integer('amount').notNull(), // cents, signed
  category: text('category'),
  occurredAt: timestamp('occurred_at').notNull(),
});

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  slot: integer('slot').notNull(), // 0, 1, 2 for the three tabs
  content: text('content').default('').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
