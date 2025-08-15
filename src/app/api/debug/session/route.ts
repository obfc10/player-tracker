import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    const userByUsername = await prisma.user.findUnique({
      where: { username: session.user.username! }
    });

    return NextResponse.json({
      session: {
        userId: session.user.id,
        username: session.user.username,
        userEmail: session.user.email,
        userRole: session.user.role
      },
      database: {
        userExistsById: !!dbUser,
        userExistsByUsername: !!userByUsername,
        actualUserId: userByUsername?.id,
        actualUsername: userByUsername?.username
      }
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}