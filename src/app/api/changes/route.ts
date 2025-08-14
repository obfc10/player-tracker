import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const compareType = searchParams.get('compareType') || 'previous'; // 'previous', 'week', 'custom'
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const metric = searchParams.get('metric') || 'currentPower';
    const limit = parseInt(searchParams.get('limit') || '20');
    const allianceFilter = searchParams.get('alliance') || 'all';

    // Get available snapshots for comparison
    const snapshots = await prisma.snapshot.findMany({
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    if (snapshots.length < 2) {
      return NextResponse.json({
        error: 'Not enough snapshots for comparison',
        gainers: [],
        losers: [],
        snapshots: snapshots.map((s: any) => ({
          id: s.id,
          timestamp: s.timestamp,
          kingdom: s.kingdom,
          filename: s.filename
        }))
      });
    }

    let fromSnapshot, toSnapshot;

    // Determine which snapshots to compare
    switch (compareType) {
      case 'previous':
        toSnapshot = snapshots[0];
        fromSnapshot = snapshots[1];
        break;
      case 'week':
        toSnapshot = snapshots[0];
        // Find snapshot closest to 7 days ago
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        fromSnapshot = snapshots.find((s: any) => new Date(s.timestamp) <= weekAgo) || snapshots[snapshots.length - 1];
        break;
      case 'custom':
        if (!fromDate || !toDate) {
          return NextResponse.json({ error: 'From and to dates required for custom comparison' }, { status: 400 });
        }
        toSnapshot = snapshots.find((s: any) => s.id === toDate) || snapshots[0];
        fromSnapshot = snapshots.find((s: any) => s.id === fromDate) || snapshots[1];
        break;
      default:
        toSnapshot = snapshots[0];
        fromSnapshot = snapshots[1];
    }

    // Build alliance filter if specified
    const allianceWhere = allianceFilter !== 'all' ? { allianceTag: allianceFilter } : {};

    // Get player data from both snapshots
    const [fromPlayers, toPlayers] = await Promise.all([
      prisma.playerSnapshot.findMany({
        where: {
          snapshotId: fromSnapshot.id,
          ...allianceWhere
        },
        include: {
          player: true
        }
      }),
      prisma.playerSnapshot.findMany({
        where: {
          snapshotId: toSnapshot.id,
          ...allianceWhere
        },
        include: {
          player: true
        }
      })
    ]);

    // Create player maps for easier lookup
    const fromPlayerMap = new Map(fromPlayers.map((p: any) => [p.playerId, p]));
    const toPlayerMap = new Map(toPlayers.map((p: any) => [p.playerId, p]));

    // Calculate changes for players present in both snapshots
    const changes: any[] = [];

    toPlayers.forEach((toPlayer: any) => {
      const fromPlayer = fromPlayerMap.get(toPlayer.playerId);
      if (!fromPlayer) return; // Skip new players

      const getMetricValue = (player: any, metric: string) => {
        switch (metric) {
          case 'currentPower':
          case 'power':
          case 'buildingPower':
          case 'heroPower':
          case 'legionPower':
          case 'techPower':
          case 'merits':
          case 'unitsKilled':
          case 'unitsDead':
          case 'unitsHealed':
          case 'gold':
          case 'wood':
          case 'ore':
          case 'mana':
          case 'gems':
            return parseInt(player[metric] || '0');
          case 'cityLevel':
          case 'victories':
          case 'defeats':
          case 'citySieges':
          case 'scouted':
          case 'helpsGiven':
          case 'division':
            return player[metric] || 0;
          case 'killDeathRatio':
            const kills = parseInt(player.unitsKilled || '0');
            const deaths = parseInt(player.unitsDead || '0');
            return deaths > 0 ? kills / deaths : kills > 0 ? 999 : 0;
          case 'winRate':
            const wins = player.victories || 0;
            const losses = player.defeats || 0;
            return (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
          default:
            return 0;
        }
      };

      const fromValue = getMetricValue(fromPlayer, metric);
      const toValue = getMetricValue(toPlayer, metric);
      const change = toValue - fromValue;
      const percentChange = fromValue > 0 ? ((change / fromValue) * 100) : (change > 0 ? 100 : 0);

      if (Math.abs(change) > 0) { // Only include players with actual changes
        changes.push({
          playerId: toPlayer.playerId,
          name: toPlayer.name,
          currentName: toPlayer.player.currentName,
          allianceTag: toPlayer.allianceTag,
          division: toPlayer.division,
          cityLevel: toPlayer.cityLevel,
          fromValue,
          toValue,
          change,
          percentChange: Math.round(percentChange * 100) / 100
        });
      }
    });

    // Sort by absolute change value
    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    // Separate gainers and losers
    const gainers = changes
      .filter(c => c.change > 0)
      .slice(0, limit);

    const losers = changes
      .filter(c => c.change < 0)
      .slice(0, limit);

    // Get available alliances for filtering
    const alliances = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: toSnapshot.id,
        allianceTag: { not: null }
      },
      select: { allianceTag: true },
      distinct: ['allianceTag'],
      orderBy: { allianceTag: 'asc' }
    });

    // Calculate summary statistics
    const totalPlayers = changes.length;
    const playersGained = gainers.length;
    const playersLost = losers.length;
    const avgChange = changes.length > 0 ? 
      changes.reduce((sum, c) => sum + c.change, 0) / changes.length : 0;

    return NextResponse.json({
      gainers,
      losers,
      summary: {
        totalPlayers,
        playersGained,
        playersLost,
        avgChange: Math.round(avgChange * 100) / 100,
        metric,
        compareType,
        fromSnapshot: {
          id: fromSnapshot.id,
          timestamp: fromSnapshot.timestamp,
          kingdom: fromSnapshot.kingdom,
          filename: fromSnapshot.filename
        },
        toSnapshot: {
          id: toSnapshot.id,
          timestamp: toSnapshot.timestamp,
          kingdom: toSnapshot.kingdom,
          filename: toSnapshot.filename
        }
      },
      availableSnapshots: snapshots.map((s: any) => ({
        id: s.id,
        timestamp: s.timestamp,
        kingdom: s.kingdom,
        filename: s.filename
      })),
      alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
      alliance: allianceFilter
    });

  } catch (error) {
    console.error('Error fetching changes data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch changes data' },
      { status: 500 }
    );
  }
}