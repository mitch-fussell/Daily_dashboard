import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { CalEvent } from './calendar';

type UserTokens = {
  msAccessToken: string | null;
  msRefreshToken: string | null;
  msTokenExpiresAt: Date | null;
};

type GraphEvent = {
  subject: string;
  isAllDay: boolean;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName?: string };
};

const COLORS: CalEvent['color'][] = ['blue', 'purple', 'emerald', 'rose'];

async function getAccessToken(userId: string, tokens: UserTokens): Promise<string | null> {
  if (!tokens.msAccessToken) return null;

  // Still valid with 5-minute buffer
  if (tokens.msTokenExpiresAt && tokens.msTokenExpiresAt.getTime() > Date.now() + 300_000) {
    return tokens.msAccessToken;
  }

  if (!tokens.msRefreshToken) return null;

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: tokens.msRefreshToken,
      scope: 'Calendars.Read offline_access',
    }),
  });

  if (!res.ok) {
    console.error('[MS Calendar] token refresh failed:', res.status);
    return null;
  }

  const data = await res.json() as { access_token: string; refresh_token?: string; expires_in: number };

  await db.update(users)
    .set({
      msAccessToken: data.access_token,
      msRefreshToken: data.refresh_token ?? tokens.msRefreshToken,
      msTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    })
    .where(eq(users.id, userId));

  return data.access_token;
}

export type MsCalendarResult =
  | { ok: true; events: CalEvent[]; allDay: string[] }
  | { ok: false; error: string };

export async function fetchMsCalendarEvents(userId: string, tokens: UserTokens): Promise<MsCalendarResult> {
  const accessToken = await getAccessToken(userId, tokens);
  if (!accessToken) return { ok: false, error: 'Not authorized — please reconnect Microsoft Calendar' };

  // Query today in UTC (server runs UTC; consistent with ICS parsing)
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  const params = new URLSearchParams({
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    $select: 'subject,isAllDay,start,end,location',
    $orderby: 'start/dateTime',
    $top: '50',
  });

  const res = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'outlook.timezone="UTC"',
    },
    cache: 'no-store',
  });

  if (res.status === 401) {
    // Token rejected — clear it so the widget shows the reconnect prompt
    await db.update(users)
      .set({ msAccessToken: null, msRefreshToken: null, msTokenExpiresAt: null })
      .where(eq(users.id, userId));
    return { ok: false, error: 'Microsoft session expired — please reconnect' };
  }

  if (!res.ok) {
    return { ok: false, error: `Microsoft Graph error ${res.status}` };
  }

  const data = await res.json() as { value: GraphEvent[] };
  const events: CalEvent[] = [];
  const allDay: string[] = [];
  let colorIdx = 0;

  for (const item of data.value) {
    const title = item.subject?.trim() || 'Untitled';

    if (item.isAllDay) {
      allDay.push(title);
      continue;
    }

    // Times come back in UTC (Prefer header set above)
    const s = new Date(item.start.dateTime + (item.start.dateTime.endsWith('Z') ? '' : 'Z'));
    const e = new Date(item.end.dateTime + (item.end.dateTime.endsWith('Z') ? '' : 'Z'));

    events.push({
      title,
      startH: s.getUTCHours(),
      startM: s.getUTCMinutes(),
      endH: e.getUTCHours(),
      endM: e.getUTCMinutes(),
      color: COLORS[colorIdx++ % COLORS.length],
      location: item.location?.displayName?.trim() || null,
    });
  }

  return { ok: true, events, allDay };
}
