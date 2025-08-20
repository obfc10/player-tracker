import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { eventId } = await params;

    const teams = await prisma.eventTeam.findMany({
      where: {
        eventId
      },
      include: {
        participations: {
          where: {
            leftAt: null // Only active participants
          },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true
              }
            }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        },
        _count: {
          select: {
            participations: {
              where: {
                leftAt: null // Only count active participants
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching event teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { eventId } = await params;
    const { name, color, description } = await request.json();

    if (!name || name.length < 1) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Validate event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if team name already exists for this event
    const existingTeam = await prisma.eventTeam.findUnique({
      where: {
        eventId_name: {
          eventId,
          name
        }
      }
    });

    if (existingTeam) {
      return NextResponse.json({ error: 'Team name already exists for this event' }, { status: 400 });
    }

    const team = await prisma.eventTeam.create({
      data: {
        eventId,
        name,
        color: color || null,
        description: description || null
      },
      include: {
        participations: {
          where: {
            leftAt: null
          },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true
              }
            }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        },
        _count: {
          select: {
            participations: {
              where: {
                leftAt: null
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}