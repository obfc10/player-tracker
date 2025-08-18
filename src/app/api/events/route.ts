import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const whereClause: any = {};
    
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        _count: {
          select: {
            participations: true,
            teams: true
          }
        }
      },
      orderBy: [
        { startDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { name, startDate, endDate, description } = await request.json();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Event name must be at least 2 characters' }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    if (end && end <= start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        description: description || null,
        createdById: session.user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        _count: {
          select: {
            participations: true,
            teams: true
          }
        }
      }
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}