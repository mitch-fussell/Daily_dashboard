import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import crypto from 'crypto';

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL('/sign-in', process.env.AUTH_URL!));
  }

  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.AUTH_URL}/api/ms-calendar/callback`,
    scope: 'Mail.Read offline_access',
    state,
    response_mode: 'query',
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;

  const isSecure = process.env.AUTH_URL?.startsWith('https://') ?? false;
  const headers = new Headers({ Location: authUrl });
  headers.append(
    'Set-Cookie',
    `ms_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${isSecure ? '; Secure' : ''}`,
  );

  return new Response(null, { status: 302, headers });
}
