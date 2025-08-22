import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logAuthEvent, logError, logWarn } from './logger';
import { getAuthConfiguration } from '../config';

const authConfig = getAuthConfiguration();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        logAuthEvent('authorize_attempt', undefined, { username: credentials?.username });
        
        if (!credentials?.username || !credentials?.password) {
          logWarn('Auth', 'Missing credentials in authorization attempt');
          return null;
        }
        
        try {
          logAuthEvent('database_connection_attempt');
          
          const user = await prisma.user.findUnique({
            where: { username: credentials.username }
          });
          
          logAuthEvent('user_lookup_result', user?.id, {
            userFound: !!user,
            status: user?.status,
            role: user?.role
          });
          
          if (!user || !await bcrypt.compare(credentials.password, user.password)) {
            logWarn('Auth', 'Invalid credentials - user not found or password mismatch', {
              username: credentials.username,
              userExists: !!user
            });
            return null;
          }
          
          // Check if user is approved
          if (user.status !== 'APPROVED') {
            logWarn('Auth', 'User not approved', {
              userId: user.id,
              status: user.status
            });
            // Return a special error that the frontend can handle
            throw new Error(`ACCOUNT_${user.status}`);
          }
          
          logAuthEvent('authorization_successful', user.id, { username: user.username });
          return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            status: user.status
          };
        } catch (error) {
          logError('Auth', 'Authorization error', error as Error, {
            username: credentials.username
          });
          
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
    maxAge: authConfig.sessionMaxAge
  },
  pages: {
    signIn: '/auth/signin'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        logAuthEvent('jwt_token_created', user.id, { username: user.username });
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        logAuthEvent('session_created', token.id as string, { username: token.username });
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  secret: authConfig.secretKey
};