import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL('/sign-in', process.env.AUTH_URL!));
  }

  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const storedState = request.cookies.get('ms_oauth_state')?.value;

  const clearState = `ms_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

  if (error) {
    const headers = new Headers({ Location: `${process.env.AUTH_URL}/?ms_error=${encodeURIComponent(error)}` });
    headers.append('Set-Cookie', clearState);
    return new Response(null, { status: 302, headers });
  }

  if (!code || !state || state !== storedState) {
    const headers = new Headers({ Location: `${process.env.AUTH_URL}/?ms_error=invalid_state` });
    headers.append('Set-Cookie', clearState);
    return new Response(null, { status: 302, headers });
  }

  const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.AUTH_URL}/api/ms-calendar/callback`,
      scope: 'Mail.Read offline_access',
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error('[MS Calendar] token exchange failed:', body);
    const headers = new Headers({ Location: `${process.env.AUTH_URL}/?ms_error=token_exchange_failed` });
    headers.append('Set-Cookie', clearState);
    return new Response(null, { status: 302, headers });
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  await db.update(users)
    .set({
      msAccessToken: tokens.access_token,
      msRefreshToken: tokens.refresh_token ?? null,
      msTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    })
    .where(eq(users.id, session.user.id));

  const headers = new Headers({ Location: process.env.AUTH_URL! });
  headers.append('Set-Cookie', clearState);
  return new Response(null, { status: 302, headers });
}
