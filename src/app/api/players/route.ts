import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the latest snapshot to work with current data
    const latestSnapshot = await prisma.snapshot.findFirst({
      orderBy: { timestamp: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json([]);
    }

    // Get all player snapshots from the latest snapshot
    const playerSnapshots = await prisma.playerSnapshot.findMany({
      where: {
        snapshotId: latestSnapshot.id
      },
      include: {
        player: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform to match frontend PlayerData interface
    const transformedPlayers = playerSnapshots.map((snapshot: any) => ({
      lordId: snapshot.playerId,
      name: snapshot.name,
      division: snapshot.division,
      allianceTag: snapshot.allianceTag || '',
      currentPower: snapshot.currentPower,
      power: snapshot.power,
      merits: snapshot.merits,
      unitsKilled: snapshot.unitsKilled,
      unitsDead: snapshot.unitsDead,
      unitsHealed: snapshot.unitsHealed,
      t1KillCount: snapshot.t1KillCount,
      t2KillCount: snapshot.t2KillCount,
      t3KillCount: snapshot.t3KillCount,
      t4KillCount: snapshot.t4KillCount,
      t5KillCount: snapshot.t5KillCount,
      buildingPower: snapshot.buildingPower,
      heroPower: snapshot.heroPower,
      legionPower: snapshot.legionPower,
      techPower: snapshot.techPower,
      victories: snapshot.victories,
      defeats: snapshot.defeats,
      citySieges: snapshot.citySieges,
      scouted: snapshot.scouted,
      helpsGiven: snapshot.helpsGiven,
      gold: snapshot.gold,
      goldSpent: snapshot.goldSpent,
      wood: snapshot.wood,
      woodSpent: snapshot.woodSpent,
      ore: snapshot.ore,
      oreSpent: snapshot.oreSpent,
      mana: snapshot.mana,
      manaSpent: snapshot.manaSpent,
      gems: snapshot.gems,
      gemsSpent: snapshot.gemsSpent,
      resourcesGiven: snapshot.resourcesGiven,
      resourcesGivenCount: snapshot.resourcesGivenCount,
      cityLevel: snapshot.cityLevel,
      faction: snapshot.faction || ''
    }));

    return NextResponse.json(transformedPlayers);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
  }
}