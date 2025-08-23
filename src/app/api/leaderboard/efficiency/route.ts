import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cacheService, CacheKeys, CacheTags } from '@/services/CacheService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alliance = searchParams.get('alliance') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const seasonMode = searchParams.get('seasonMode') || 'current';
    const seasonId = searchParams.get('seasonId');

    // Get latest snapshot based on season selection
    let snapshotFilter: any = {};
    
    if (seasonMode === 'current' || seasonMode === 'specific') {
      const targetSeasonId = seasonMode === 'specific' && seasonId 
        ? seasonId 
        : (await prisma.season.findFirst({ where: { isActive: true } }))?.id;
      
      if (targetSeasonId) {
        snapshotFilter.seasonId = targetSeasonId;
      }
    }

    const latestSnapshot = await cacheService.cached(
      CacheKeys.LATEST_SNAPSHOT,
      async () => {
        return await prisma.snapshot.findFirst({
          where: snapshotFilter,
          orderBy: { timestamp: 'desc' }
        });
      },
      { ttl: 60000, tags: [CacheTags.SNAPSHOTS] }
    );

    if (!latestSnapshot) {
      return NextResponse.json({
        data: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          limit,
          hasNextPage: false,
          hasPreviousPage: false
        },
        performance: {
          itemCount: 0,
          responseSize: 0,
          optimized: false,
          queryTime: 0
        },
        alliance,
        alliances: [],
        snapshotInfo: null
      });
    }

    // Build where clause for alliance filtering
    const whereClause: any = {
      snapshotId: latestSnapshot.id
    };

    if (alliance !== 'all') {
      if (alliance === 'managed') {
        const managedTags = ['PLAC', 'FLAs', 'Plaf']; // From alliance config
        whereClause.allianceTag = {
          in: managedTags
        };
      } else if (alliance === 'others') {
        const managedTags = ['PLAC', 'FLAs', 'Plaf'];
        whereClause.allianceTag = {
          notIn: managedTags,
          not: null
        };
      } else {
        whereClause.allianceTag = alliance;
      }
    }

    // Create cache key
    const cacheKey = `efficiency_players:${latestSnapshot.id}:${alliance}:${page}:${limit}`;
    
    // Get player data with recent snapshots for trends
    const [players, totalCount] = await cacheService.cached(
      cacheKey,
      async () => {
        const [playersData, total] = await Promise.all([
          prisma.playerSnapshot.findMany({
            where: whereClause,
            include: {
              player: {
                include: {
                  snapshots: {
                    include: { snapshot: true },
                    orderBy: { snapshot: { timestamp: 'desc' } },
                    take: 5 // Get last 5 snapshots for trend calculation
                  }
                }
              }
            },
            skip: (page - 1) * limit,
            take: limit
          }),
          prisma.playerSnapshot.count({ where: whereClause })
        ]);

        return [playersData, total];
      },
      { ttl: 300000, tags: [CacheTags.LEADERBOARD, CacheTags.PLAYERS] }
    );

    // Get all unique alliances for filtering
    const alliances = await cacheService.cached(
      CacheKeys.ALLIANCES(latestSnapshot.id),
      async () => {
        return await prisma.playerSnapshot.findMany({
          where: {
            snapshotId: latestSnapshot.id,
            allianceTag: { not: null }
          },
          select: { allianceTag: true },
          distinct: ['allianceTag'],
          orderBy: { allianceTag: 'asc' }
        });
      },
      { ttl: 600000, tags: [CacheTags.LEADERBOARD] }
    );

    const totalPages = Math.ceil(totalCount / limit);

    // Transform to simpler format for frontend
    const playerData = players.map((snapshot: any) => ({
      lordId: snapshot.playerId,
      name: snapshot.name,
      alliance: snapshot.allianceTag || 'None',
      currentPower: parseInt(snapshot.currentPower || '0'),
      merits: parseInt(snapshot.merits || '0'),
      unitsKilled: parseInt(snapshot.unitsKilled || '0'),
      unitsDead: parseInt(snapshot.unitsDead || '0'),
      victories: snapshot.victories || 0,
      defeats: snapshot.defeats || 0,
      cityLevel: snapshot.cityLevel || 1,
      division: snapshot.division || 1,
      faction: snapshot.faction || 'Unknown',
      // Recent merit history for trend calculation
      meritHistory: snapshot.player?.snapshots?.map((s: any) => ({
        date: s.snapshot.timestamp,
        merits: parseInt(s.merits || '0')
      })) || []
    }));

    const responseData = {
      data: playerData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      performance: {
        itemCount: playerData.length,
        responseSize: JSON.stringify(playerData).length,
        optimized: true,
        queryTime: Date.now()
      },
      alliance,
      alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching efficiency players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch efficiency players' },
      { status: 500 }
    );
  }
}