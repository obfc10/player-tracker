import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seasons = await prisma.season.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true
      },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}