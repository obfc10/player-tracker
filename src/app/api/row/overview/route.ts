import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'EVENT_MANAGER', 'VIEWER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get overview statistics
    const [
      activeEvents,
      totalParticipants,
      recentEvents,
      winStats
    ] = await Promise.all([
      // Active events count
      prisma.gameEvent.count({
        where: {
          status: 'ACTIVE'
        }
      }),

      // Total participants across all events
      prisma.playerEventRole.groupBy({
        by: ['playerId'],
        _count: {
          playerId: true
        }
      }),

      // Recent finalized events for win rate calculation
      prisma.gameEvent.findMany({
        where: {
          status: 'FINALIZED',
          outcome: {
            not: null
          }
        },
        orderBy: {
          eventDate: 'desc'
        },
        take: 50
      }),

      // Win statistics
      prisma.gameEvent.findMany({
        where: {
          status: 'FINALIZED',
          outcome: {
            not: null
          }
        },
        include: {
          teams: true
        }
      })
    ]);

    // Calculate unique participants
    const uniqueParticipants = totalParticipants.length;

    // Calculate wins (events where our teams won)
    // For now, we'll count events where outcome exists as total events
    const totalEvents = recentEvents.length;
    const wins = recentEvents.filter(event => 
      event.outcome && event.outcome !== 'Draw'
    ).length;

    // Calculate win rate
    const winRate = totalEvents > 0 ? Math.round((wins / totalEvents) * 100) : 0;

    // Get current events for display
    const currentEvents = await prisma.gameEvent.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'SCORING']
        }
      },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            playerRoles: true
          }
        }
      },
      orderBy: {
        eventDate: 'desc'
      },
      take: 5
    });

    // Get recent event history
    const eventHistory = await prisma.gameEvent.findMany({
      where: {
        status: 'FINALIZED'
      },
      include: {
        teams: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            playerRoles: true
          }
        }
      },
      orderBy: {
        eventDate: 'desc'
      },
      take: 10
    });

    // Get top performers from recent events
    const topPerformers = await prisma.playerEventRole.findMany({
      where: {
        gameEvent: {
          status: 'FINALIZED',
          eventDate: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      include: {
        player: {
          select: {
            lordId: true,
            currentName: true
          }
        },
        gameEvent: {
          select: {
            name: true,
            eventDate: true
          }
        },
        role: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        totalPoints: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      stats: {
        activeEvents,
        totalParticipants: uniqueParticipants,
        wins,
        winRate
      },
      currentEvents,
      eventHistory,
      topPerformers
    });

  } catch (error) {
    console.error('Error fetching ROW overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
}