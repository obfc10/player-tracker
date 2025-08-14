// src/app/api/players/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lordId = params.id;

    // Fetch player with all related data
    const player = await prisma.player.findUnique({
      where: { lordId },
      include: {
        nameHistory: {
          orderBy: { detectedAt: 'desc' },
          take: 20
        },
        allianceHistory: {
          orderBy: { detectedAt: 'desc' },
          take: 20
        },
        snapshots: {
          include: {
            snapshot: true
          },
          orderBy: {
            snapshot: { timestamp: 'desc' }
          },
          take: 100 // Get last 100 snapshots for trend analysis
        }
      }
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Calculate statistics
    const latestSnapshot = player.snapshots[0];
    const oldestSnapshot = player.snapshots[player.snapshots.length - 1];
    
    // Calculate growth rates
    const stats = calculatePlayerStats(player.snapshots);
    
    // Prepare chart data
    const chartData = prepareChartData(player.snapshots);

    return NextResponse.json({
      player: {
        lordId: player.lordId,
        currentName: player.currentName,
        nameHistory: player.nameHistory,
        allianceHistory: player.allianceHistory,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt
      },
      latestSnapshot: latestSnapshot ? {
        ...latestSnapshot,
        // Convert string numbers back for display
        currentPower: parseInt(latestSnapshot.currentPower),
        power: parseInt(latestSnapshot.power),
        unitsKilled: parseInt(latestSnapshot.unitsKilled),
        unitsDead: parseInt(latestSnapshot.unitsDead),
        merits: parseInt(latestSnapshot.merits)
      } : null,
      stats,
      chartData,
      snapshotCount: player.snapshots.length
    });

  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch player data' 
    }, { status: 500 });
  }
}

function calculatePlayerStats(snapshots: any[]) {
  if (snapshots.length < 2) {
    return {
      powerGrowthRate: 0,
      combatEfficiency: 0,
      activityLevel: 0,
      resourceEfficiency: 0,
      killDeathRatio: 0,
      totalKills: 0,
      totalDeaths: 0,
      averageDailyGrowth: 0
    };
  }

  const latest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];
  
  const daysDiff = Math.max(1, 
    (new Date(latest.snapshot.timestamp).getTime() - 
     new Date(oldest.snapshot.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  const currentPower = parseInt(latest.currentPower);
  const oldPower = parseInt(oldest.currentPower);
  const powerGrowth = currentPower - oldPower;
  
  const unitsKilled = parseInt(latest.unitsKilled);
  const unitsDead = parseInt(latest.unitsDead);

  return {
    powerGrowthRate: Math.round(powerGrowth / daysDiff),
    combatEfficiency: unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A',
    activityLevel: Math.round(latest.helpsGiven / daysDiff),
    resourceEfficiency: calculateResourceEfficiency(latest),
    killDeathRatio: unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A',
    totalKills: unitsKilled,
    totalDeaths: unitsDead,
    averageDailyGrowth: Math.round(powerGrowth / daysDiff),
    daysTracked: Math.round(daysDiff),
    powerBreakdown: {
      building: parseInt(latest.buildingPower),
      hero: parseInt(latest.heroPower),
      legion: parseInt(latest.legionPower),
      tech: parseInt(latest.techPower)
    },
    killBreakdown: {
      t1: parseInt(latest.t1KillCount),
      t2: parseInt(latest.t2KillCount),
      t3: parseInt(latest.t3KillCount),
      t4: parseInt(latest.t4KillCount),
      t5: parseInt(latest.t5KillCount)
    }
  };
}

function calculateResourceEfficiency(snapshot: any) {
  const totalSpent = 
    parseInt(snapshot.goldSpent) + 
    parseInt(snapshot.woodSpent) + 
    parseInt(snapshot.oreSpent) + 
    parseInt(snapshot.manaSpent) + 
    parseInt(snapshot.gemsSpent);
  
  const totalCurrent = 
    parseInt(snapshot.gold) + 
    parseInt(snapshot.wood) + 
    parseInt(snapshot.ore) + 
    parseInt(snapshot.mana) + 
    parseInt(snapshot.gems);
  
  return totalSpent > 0 ? ((totalCurrent / totalSpent) * 100).toFixed(1) : '0';
}

function prepareChartData(snapshots: any[]) {
  // Prepare data for charts - reverse to show chronological order
  const reversed = [...snapshots].reverse();
  
  return {
    powerTrend: reversed.map(s => ({
      date: new Date(s.snapshot.timestamp).toLocaleDateString(),
      power: parseInt(s.currentPower)
    })),
    combatTrend: reversed.map(s => ({
      date: new Date(s.snapshot.timestamp).toLocaleDateString(),
      kills: parseInt(s.unitsKilled),
      deaths: parseInt(s.unitsDead)
    })),
    resourceTrend: reversed.map(s => ({
      date: new Date(s.snapshot.timestamp).toLocaleDateString(),
      gold: parseInt(s.gold),
      wood: parseInt(s.wood),
      ore: parseInt(s.ore),
      mana: parseInt(s.mana),
      gems: parseInt(s.gems)
    })),
    activityTrend: reversed.map(s => ({
      date: new Date(s.snapshot.timestamp).toLocaleDateString(),
      helps: s.helpsGiven,
      sieges: s.citySieges,
      scouted: s.scouted
    }))
  };
}