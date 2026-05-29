import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const useSecureCookies = process.env.AUTH_URL?.startsWith('https://');

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  cookies: {
    pkceCodeVerifier: {
      name: 'authjs.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies ?? false,
      },
    },
    state: {
      name: 'authjs.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies ?? false,
      },
    },
  },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
      checks: ['state'],
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await db
        .insert(users)
        .values({
          id: user.id!,
          email: user.email,
          name: user.name ?? null,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { name: user.name ?? null },
        });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Use the DB's actual user id — the OAuth provider id (numeric GitHub id)
        // may differ from the uuid already in the database.
        const [dbUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, user.email));
        token.id = dbUser?.id ?? user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
