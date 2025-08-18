import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/game-events - Get all game events
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventType = searchParams.get('eventType');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (eventType) where.eventType = eventType;

    const gameEvents = await prisma.gameEvent.findMany({
      where,
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        playerRoles: {
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true
              }
            },
            role: {
              select: {
                name: true,
                color: true
              }
            }
          }
        },
        createdBy: {
          select: {
            username: true,
            name: true
          }
        },
        _count: {
          select: {
            playerRoles: true
          }
        }
      },
      orderBy: { eventDate: 'desc' },
      take: limit
    });

    return NextResponse.json({ gameEvents });
  } catch (error) {
    console.error('Error fetching game events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/row/game-events - Create a new game event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { 
      name, 
      description, 
      eventDate, 
      eventType = 'ROW', 
      maxTeams = 3, 
      teamIds = [] 
    } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Event name is required' }, { status: 400 });
    }

    if (!eventDate) {
      return NextResponse.json({ error: 'Event date is required' }, { status: 400 });
    }

    // Validate team count
    if (teamIds.length > maxTeams) {
      return NextResponse.json({ 
        error: `Cannot assign more than ${maxTeams} teams to this event` 
      }, { status: 400 });
    }

    // Validate teams exist
    if (teamIds.length > 0) {
      const teams = await prisma.persistentTeam.findMany({
        where: {
          id: { in: teamIds },
          isActive: true
        }
      });

      if (teams.length !== teamIds.length) {
        return NextResponse.json({ error: 'One or more teams not found' }, { status: 404 });
      }
    }

    const gameEvent = await prisma.gameEvent.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        eventDate: new Date(eventDate),
        eventType,
        maxTeams,
        createdById: session.user.id,
        teams: {
          connect: teamIds.map((id: string) => ({ id }))
        }
      },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: {
                roster: {
                  where: { isActive: true }
                }
              }
            }
          }
        },
        createdBy: {
          select: {
            username: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ gameEvent });
  } catch (error) {
    console.error('Error creating game event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}