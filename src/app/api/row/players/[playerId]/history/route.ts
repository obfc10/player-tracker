import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/row/players/[playerId]/history - Get player's event history and analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { playerId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { lordId: playerId },
      select: {
        lordId: true,
        currentName: true,
        hasLeftRealm: true,
        lastSeenAt: true
      }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get player's event history
    const eventHistory = await prisma.playerEventRole.findMany({
      where: { playerId },
      include: {
        gameEvent: {
          select: {
            id: true,
            name: true,
            eventDate: true,
            status: true,
            outcome: true,
            eventType: true,
            teams: {
              select: {
                name: true,
                color: true
              }
            }
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
        gameEvent: {
          eventDate: 'desc'
        }
      },
      take: limit
    });

    // Calculate analytics
    const totalEvents = eventHistory.length;
    const finalizedEvents = eventHistory.filter(e => e.gameEvent.status === 'FINALIZED');
    
    const analytics = {
      totalEvents,
      finalizedEvents: finalizedEvents.length,
      totalPoints: finalizedEvents.reduce((sum, e) => sum + e.totalPoints, 0),
      totalKillPoints: finalizedEvents.reduce((sum, e) => sum + e.killPoints, 0),
      totalGarrisonPoints: finalizedEvents.reduce((sum, e) => sum + e.garrisonPoints, 0),
      totalSeedPoints: finalizedEvents.reduce((sum, e) => sum + e.seedPoints, 0),
      averagePoints: finalizedEvents.length > 0 ? 
        finalizedEvents.reduce((sum, e) => sum + e.totalPoints, 0) / finalizedEvents.length : 0,
      averageKillPoints: finalizedEvents.length > 0 ? 
        finalizedEvents.reduce((sum, e) => sum + e.killPoints, 0) / finalizedEvents.length : 0,
      bestPerformance: finalizedEvents.length > 0 ? 
        Math.max(...finalizedEvents.map(e => e.totalPoints).filter(p => typeof p === 'number')) : 0,
      bestKillPoints: finalizedEvents.length > 0 ? 
        Math.max(...finalizedEvents.map(e => e.killPoints).filter(p => typeof p === 'number')) : 0,
      mvpVotes: finalizedEvents.reduce((sum, e) => sum + (e.mvpVotes || 0), 0)
    };

    // Role performance breakdown
    const roleStats = finalizedEvents.reduce((acc: any, event) => {
      const roleName = event.role.name;
      if (!acc[roleName]) {
        acc[roleName] = {
          events: 0,
          totalPoints: 0,
          totalKillPoints: 0,
          averagePoints: 0,
          averageKillPoints: 0
        };
      }
      acc[roleName].events++;
      acc[roleName].totalPoints += event.totalPoints;
      acc[roleName].totalKillPoints += event.killPoints;
      acc[roleName].averagePoints = acc[roleName].totalPoints / acc[roleName].events;
      acc[roleName].averageKillPoints = acc[roleName].totalKillPoints / acc[roleName].events;
      return acc;
    }, {});

    // Recent form (last 5 events)
    const recentForm = finalizedEvents.slice(0, 5).map(event => ({
      eventId: event.gameEvent.id,
      eventName: event.gameEvent.name,
      eventDate: event.gameEvent.eventDate,
      totalPoints: event.totalPoints,
      killPoints: event.killPoints,
      outcome: event.gameEvent.outcome,
      role: event.role.name
    }));

    // Performance trend (last 10 events for chart data)
    const performanceTrend = finalizedEvents.slice(0, 10).reverse().map(event => ({
      eventDate: event.gameEvent.eventDate,
      totalPoints: event.totalPoints,
      killPoints: event.killPoints,
      garrisonPoints: event.garrisonPoints,
      seedPoints: event.seedPoints
    }));

    // Win rate calculation (based on event outcomes)
    const eventsWithOutcome = finalizedEvents.filter(e => e.gameEvent.outcome);
    const wins = eventsWithOutcome.filter(e => {
      // This is a simplified win calculation - you might want to make this more sophisticated
      // based on your specific game rules
      return e.gameEvent.outcome && e.gameEvent.outcome.toLowerCase().includes('win');
    });
    const winRate = eventsWithOutcome.length > 0 ? (wins.length / eventsWithOutcome.length) * 100 : 0;

    return NextResponse.json({
      player,
      eventHistory,
      analytics: {
        ...analytics,
        winRate: Math.round(winRate * 100) / 100
      },
      roleStats,
      recentForm,
      performanceTrend
    });
  } catch (error) {
    console.error('Error fetching player event history:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}