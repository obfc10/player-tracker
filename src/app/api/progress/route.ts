import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerIds = searchParams.get('players')?.split(',') || [];
    const timeRange = searchParams.get('timeRange') || '30'; // days
    const limit = parseInt(searchParams.get('limit') || '50');

    if (playerIds.length === 0) {
      return NextResponse.json({ error: 'No players specified' }, { status: 400 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    // Get player progress data
    const progressData = await Promise.all(
      playerIds.map(async (playerId) => {
        // Get player info
        const player = await prisma.player.findUnique({
          where: { lordId: playerId },
          include: {
            snapshots: {
              include: {
                snapshot: true
              },
              where: {
                snapshot: {
                  timestamp: {
                    gte: startDate,
                    lte: endDate
                  }
                }
              },
              orderBy: {
                snapshot: { timestamp: 'asc' }
              },
              take: limit
            }
          }
        });

        if (!player) {
          return null;
        }

        // Calculate progress metrics
        const snapshots = player.snapshots;
        if (snapshots.length < 2) {
          return {
            player: {
              lordId: player.lordId,
              currentName: player.currentName
            },
            snapshots: [],
            metrics: null
          };
        }

        const firstSnapshot = snapshots[0];
        const lastSnapshot = snapshots[snapshots.length - 1];
        
        // Calculate growth metrics
        const powerGrowth = parseInt(lastSnapshot.currentPower) - parseInt(firstSnapshot.currentPower);
        const killsGrowth = parseInt(lastSnapshot.unitsKilled) - parseInt(firstSnapshot.unitsKilled);
        const deathsGrowth = parseInt(lastSnapshot.unitsDead) - parseInt(firstSnapshot.unitsDead);
        const meritsGrowth = parseInt(lastSnapshot.merits) - parseInt(firstSnapshot.merits);

        const timeSpan = (new Date(lastSnapshot.snapshot.timestamp).getTime() - 
                         new Date(firstSnapshot.snapshot.timestamp).getTime()) / (1000 * 60 * 60 * 24);

        const metrics = {
          powerGrowth,
          killsGrowth,
          deathsGrowth,
          meritsGrowth,
          averageDailyPowerGrowth: timeSpan > 0 ? Math.round(powerGrowth / timeSpan) : 0,
          killDeathRatio: parseInt(lastSnapshot.unitsDead) > 0 ? 
            (parseInt(lastSnapshot.unitsKilled) / parseInt(lastSnapshot.unitsDead)).toFixed(2) : 'N/A',
          totalDays: Math.round(timeSpan),
          currentPower: parseInt(lastSnapshot.currentPower),
          currentKills: parseInt(lastSnapshot.unitsKilled),
          currentDeaths: parseInt(lastSnapshot.unitsDead),
          currentMerits: parseInt(lastSnapshot.merits)
        };

        return {
          player: {
            lordId: player.lordId,
            currentName: player.currentName
          },
          snapshots: snapshots.map(s => ({
            timestamp: s.snapshot.timestamp,
            currentPower: parseInt(s.currentPower),
            unitsKilled: parseInt(s.unitsKilled),
            unitsDead: parseInt(s.unitsDead),
            merits: parseInt(s.merits),
            allianceTag: s.allianceTag,
            cityLevel: s.cityLevel,
            victories: s.victories,
            defeats: s.defeats
          })),
          metrics
        };
      })
    );

    // Filter out null results (players not found)
    const validData = progressData.filter(data => data !== null);

    return NextResponse.json({
      timeRange: parseInt(timeRange),
      players: validData
    });

  } catch (error) {
    console.error('Error fetching progress data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress data' },
      { status: 500 }
    );
  }
}