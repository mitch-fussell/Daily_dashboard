import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { db } from '@/db';
import { users } from '@/db/schema';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
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
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
