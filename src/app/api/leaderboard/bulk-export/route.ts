import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerIds, format = 'detailed', includeHistory = false } = body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json({ error: 'Player IDs are required' }, { status: 400 });
    }

    // Get latest snapshot
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({ error: 'No snapshots available' }, { status: 404 });
    }

    // Get player data
    const playerSnapshots = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id,
        playerId: { in: playerIds }
      },
      include: {
        player: includeHistory ? {
          include: {
            snapshots: {
              include: { snapshot: true },
              orderBy: { snapshot: { timestamp: 'desc' } },
              take: 10
            }
          }
        } : true
      }
    });

    // Format data based on requested format
    const formatPlayerData = (snapshot: any) => {
      const power = parseInt(snapshot.currentPower || '0');
      const merits = parseInt(snapshot.merits || '0');
      const unitsKilled = parseInt(snapshot.unitsKilled || '0');
      const unitsDead = parseInt(snapshot.unitsDead || '0');
      const victories = snapshot.victories || 0;
      const defeats = snapshot.defeats || 0;

      const meritEfficiency = power > 0 ? (merits / power) * 100 : 0;
      const killDeathRatio = unitsDead > 0 ? (unitsKilled / unitsDead) : 0;
      const winRate = (victories + defeats) > 0 ? (victories / (victories + defeats)) * 100 : 0;

      const baseData = {
        playerId: snapshot.playerId,
        name: snapshot.name,
        alliance: snapshot.allianceTag || 'None',
        power,
        merits,
        meritEfficiency: Number(meritEfficiency.toFixed(2)),
        level: snapshot.cityLevel,
        division: snapshot.division,
        faction: snapshot.faction
      };

      if (format === 'detailed') {
        return {
          ...baseData,
          unitsKilled,
          unitsDead,
          killDeathRatio: Number(killDeathRatio.toFixed(2)),
          victories,
          defeats,
          winRate: Number(winRate.toFixed(1)),
          helpsGiven: snapshot.helpsGiven || 0,
          citySieges: snapshot.citySieges || 0,
          scouted: snapshot.scouted || 0,
          buildingPower: parseInt(snapshot.buildingPower || '0'),
          heroPower: parseInt(snapshot.heroPower || '0'),
          legionPower: parseInt(snapshot.legionPower || '0'),
          techPower: parseInt(snapshot.techPower || '0'),
          // Resources
          gold: parseInt(snapshot.gold || '0'),
          wood: parseInt(snapshot.wood || '0'),
          ore: parseInt(snapshot.ore || '0'),
          mana: parseInt(snapshot.mana || '0'),
          gems: parseInt(snapshot.gems || '0')
        };
      }

      return baseData;
    };

    const exportData = playerSnapshots.map(snapshot => {
      const formattedData = formatPlayerData(snapshot);
      
      if (includeHistory && (snapshot.player as any)?.snapshots) {
        const history = (snapshot.player as any).snapshots.slice(1, 6).map((histSnapshot: any) => ({
          date: histSnapshot.snapshot.timestamp,
          power: parseInt(histSnapshot.currentPower || '0'),
          merits: parseInt(histSnapshot.merits || '0'),
          unitsKilled: parseInt(histSnapshot.unitsKilled || '0')
        }));
        
        return {
          ...formattedData,
          history
        };
      }
      
      return formattedData;
    });

    // Generate summary statistics
    const summary = {
      totalPlayers: exportData.length,
      totalPower: exportData.reduce((sum, p) => sum + p.power, 0),
      totalMerits: exportData.reduce((sum, p) => sum + p.merits, 0),
      averageEfficiency: exportData.length > 0 
        ? exportData.reduce((sum, p) => sum + p.meritEfficiency, 0) / exportData.length
        : 0,
      topEfficiencyPlayer: exportData.reduce((top, current) => 
        current.meritEfficiency > (top?.meritEfficiency || 0) ? current : top, 
        null as any
      ),
      exportedAt: new Date().toISOString(),
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom
      }
    };

    return NextResponse.json({
      data: exportData,
      summary,
      metadata: {
        format,
        includeHistory,
        requestedPlayers: playerIds.length,
        foundPlayers: exportData.length
      }
    });

  } catch (error) {
    console.error('Error processing bulk export:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk export' },
      { status: 500 }
    );
  }
}