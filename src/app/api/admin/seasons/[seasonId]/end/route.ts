import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { seasonId } = params;

    // End the season by setting end date to now and deactivating
    const season = await prisma.season.update({
      where: { id: seasonId },
      data: { 
        endDate: new Date(),
        isActive: false
      }
    });

    return NextResponse.json({ 
      success: true, 
      season,
      message: 'Season ended successfully'
    });
  } catch (error) {
    console.error('Error ending season:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}