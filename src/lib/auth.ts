import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Lazy import prisma to avoid database connection during build
const getPrisma = async () => {
  const { prisma } = await import('@/lib/db');
  return prisma;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        try {
          // Only connect to database when actually authorizing
          const prisma = await getPrisma();
          
          const user = await prisma.user.findUnique({
            where: { username: credentials.username }
          });
          
          if (!user || !await bcrypt.compare(credentials.password, user.password)) {
            return null;
          }
          
          // Check if user is approved
          if (user.status !== 'APPROVED') {
            // Return a special error that the frontend can handle
            throw new Error(`ACCOUNT_${user.status}`);
          }
          
          return { 
            id: user.id, 
            username: user.username,
            name: user.name, 
            role: user.role,
            status: user.status
          };
        } catch (error) {
          console.error('Auth error:', error);
          // Re-throw approval status errors so they can be handled by the frontend
          if (error instanceof Error && error.message.startsWith('ACCOUNT_')) {
            throw error;
          }
          return null;
        }
      }
    })
  ],
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build'
};