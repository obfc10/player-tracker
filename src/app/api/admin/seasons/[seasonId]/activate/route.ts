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

    // Deactivate all seasons first
    await prisma.season.updateMany({
      data: { isActive: false }
    });

    // Activate the selected season
    const season = await prisma.season.update({
      where: { id: seasonId },
      data: { isActive: true }
    });

    return NextResponse.json({ 
      success: true, 
      season,
      message: 'Season activated successfully'
    });
  } catch (error) {
    console.error('Error activating season:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}