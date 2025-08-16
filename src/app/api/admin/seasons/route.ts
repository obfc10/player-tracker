import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const seasons = await prisma.season.findMany({
      include: {
        _count: {
          select: { snapshots: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    const seasonsWithCount = seasons.map(season => ({
      id: season.id,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
      description: season.description,
      snapshotCount: season._count.snapshots,
      createdAt: season.createdAt
    }));

    return NextResponse.json({ seasons: seasonsWithCount });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name, startDate, endDate, description } = await request.json();

    if (!name || !startDate) {
      return NextResponse.json({ error: 'Season name and start date are required' }, { status: 400 });
    }

    // Check if season name already exists
    const existingSeason = await prisma.season.findUnique({
      where: { name }
    });

    if (existingSeason) {
      return NextResponse.json({ error: 'Season name already exists' }, { status: 400 });
    }

    const season = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        description: description || null,
        isActive: false // Don't auto-activate, let admin manually activate
      }
    });

    return NextResponse.json({ 
      success: true, 
      season,
      message: 'Season created successfully'
    });
  } catch (error) {
    console.error('Error creating season:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}