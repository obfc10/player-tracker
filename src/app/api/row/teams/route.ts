import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/teams - Get all persistent teams
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const teams = await prisma.persistentTeam.findMany({
      where: { isActive: true },
      include: {
        roster: {
          where: { isActive: true },
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true,
                hasLeftRealm: true
              }
            }
          },
          orderBy: [
            { position: 'asc' }, // Starters first
            { dateJoined: 'asc' }
          ]
        },
        _count: {
          select: {
            roster: {
              where: { isActive: true }
            },
            gameEvents: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Transform data for better frontend consumption
    const transformedTeams = teams.map(team => ({
      ...team,
      starters: team.roster.filter(r => r.position === 'STARTER'),
      substitutes: team.roster.filter(r => r.position === 'SUBSTITUTE'),
      totalPlayers: team._count.roster,
      totalEvents: team._count.gameEvents
    }));

    return NextResponse.json({ teams: transformedTeams });
  } catch (error) {
    console.error('Error fetching persistent teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/row/teams - Create a new persistent team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'EVENT_MANAGER')) {
      return NextResponse.json({ error: 'Admin or Event Manager access required' }, { status: 403 });
    }

    const { name, description, color } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Check if team name already exists
    const existingTeam = await prisma.persistentTeam.findUnique({
      where: { name: name.trim() }
    });

    if (existingTeam) {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 400 });
    }

    const team = await prisma.persistentTeam.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null
      },
      include: {
        roster: {
          include: {
            player: {
              select: {
                lordId: true,
                currentName: true,
                hasLeftRealm: true
              }
            }
          }
        },
        _count: {
          select: {
            roster: true,
            gameEvents: true
          }
        }
      }
    });

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error creating persistent team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}