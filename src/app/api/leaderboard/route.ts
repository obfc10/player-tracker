import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getManagedAllianceTags } from '@/lib/alliance-config';
import { cacheService, CacheKeys, CacheTags } from '@/services/CacheService';
import { createOptimizedResponse, optimizeForLargeDataset, ResponseTimer, checkConditionalRequest, createNotModifiedResponse } from '@/lib/response-optimization';

// Force dynamic rendering
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const timer = new ResponseTimer();
  
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'currentPower';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
    
    // Debug logging
    console.log('Leaderboard API - Sort request:', { sortBy, order });
    const alliance = searchParams.get('alliance') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const seasonMode = searchParams.get('seasonMode') || 'current';
    const seasonId = searchParams.get('seasonId');

    // Determine which snapshots to query based on season selection
    let snapshotFilter: any = {};
    
    if (seasonMode === 'current' || seasonMode === 'specific') {
      // Get snapshots from specific season
      const targetSeasonId = seasonMode === 'specific' && seasonId 
        ? seasonId 
        : (await prisma.season.findFirst({ where: { isActive: true } }))?.id;
      
      if (targetSeasonId) {
        snapshotFilter.seasonId = targetSeasonId;
      }
    }
    // For 'all-time' mode, we don't add any season filter

    // Get the latest snapshot within the selected season/scope
    const latestSnapshot = await cacheService.cached(
      CacheKeys.LATEST_SNAPSHOT,
      async () => {
        return await prisma.snapshot.findFirst({
          where: snapshotFilter,
          orderBy: { timestamp: 'desc' }
        });
      },
      { ttl: 60000, tags: [CacheTags.SNAPSHOTS] } // Cache for 1 minute
    );

    if (!latestSnapshot) {
      return NextResponse.json({
        players: [],
        totalPlayers: 0,
        currentPage: 1,
        totalPages: 0,
        alliances: []
      });
    }

    // Build the where clause for alliance filtering
    const whereClause: any = {
      snapshotId: latestSnapshot.id
    };

    if (alliance !== 'all') {
      if (alliance === 'managed') {
        // Filter for managed alliances (PLAC, FLAs, Plaf)
        const managedTags = getManagedAllianceTags();
        whereClause.allianceTag = {
          in: managedTags
        };
      } else if (alliance === 'others') {
        // Filter for non-managed alliances
        const managedTags = getManagedAllianceTags();
        whereClause.allianceTag = {
          notIn: managedTags,
          not: null
        };
      } else {
        // Filter for specific alliance
        whereClause.allianceTag = alliance;
      }
    }

    // Define if field needs numeric sorting (stored as String but should sort numerically)
    const isNumericStringField = (field: string): boolean => {
      // Add all fields that are stored as strings but should be sorted numerically
      return ['currentPower', 'power', 'merits', 'unitsKilled', 'unitsDead', 'unitsHealed',
              'buildingPower', 'heroPower', 'legionPower', 'techPower', 'gold', 'wood',
              'ore', 'mana', 'gems'].includes(field);
    };

    // Define if field needs calculated sorting (merit efficiency, K/D ratio, win rate)
    const isCalculatedField = (field: string): boolean => {
      return ['meritEfficiency', 'killDeathRatio', 'winRate'].includes(field);
    };

    // For numeric fields stored as strings, we need to use raw queries for proper sorting
    let useRawQuery = false;
    let useCalculatedSort = false;
    let orderBy: any = {};
    
    if (isNumericStringField(sortBy)) {
      // Mark that we need to use raw query for proper numeric sorting
      useRawQuery = true;
    } else if (isCalculatedField(sortBy)) {
      // Mark that we need calculated sorting
      useCalculatedSort = true;
    } else {
      // Handle non-numeric fields with direct database sorting
      switch (sortBy) {
        case 'name':
          orderBy['name'] = order;
          break;
        case 'cityLevel':
          orderBy['cityLevel'] = order;
          break;
        case 'victories':
          orderBy['victories'] = order;
          break;
        case 'defeats':
          orderBy['defeats'] = order;
          break;
        case 'citySieges':
          orderBy['citySieges'] = order;
          break;
        case 'scouted':
          orderBy['scouted'] = order;
          break;
        case 'helpsGiven':
          orderBy['helpsGiven'] = order;
          break;
        case 'division':
          orderBy['division'] = order;
          break;
        default:
          // Default to currentPower for unknown fields - also needs raw query
          console.log(`Unknown sort field: ${sortBy}, defaulting to currentPower`);
          useRawQuery = true;
      }
    }

    // Create cache key for this specific query
    const cacheKey = CacheKeys.LEADERBOARD(latestSnapshot.id, alliance, sortBy, page, limit);
    
    // Fetch players with database-level sorting and pagination - MAJOR PERFORMANCE IMPROVEMENT
    const [players, totalPlayers] = await cacheService.cached(
      cacheKey,
      async () => {
        if (useCalculatedSort) {
          // For calculated fields like merit efficiency, we need to fetch all data and sort in memory
          const [allPlayersData, totalCount] = await Promise.all([
            prisma.playerSnapshot.findMany({
              where: whereClause,
              include: {
                player: {
                  select: {
                    currentName: true,
                    hasLeftRealm: true,
                    lastSeenAt: true,
                    leftRealmAt: true
                  }
                }
              }
            }),
            prisma.playerSnapshot.count({
              where: whereClause
            })
          ]);

          // Calculate metrics and sort
          const playersWithMetrics = allPlayersData.map(player => {
            const unitsKilled = parseInt(player.unitsKilled || '0');
            const unitsDead = parseInt(player.unitsDead || '0');
            const victories = player.victories || 0;
            const defeats = player.defeats || 0;
            const currentPower = parseInt(player.currentPower || '0');
            const merits = parseInt(player.merits || '0');
            
            return {
              ...player,
              meritEfficiency: currentPower > 0
                ? (merits / (currentPower / 1000000))
                : 0,
              killDeathRatioNum: unitsDead > 0 ? (unitsKilled / unitsDead) : 0,
              winRateNum: (victories + defeats) > 0
                ? (victories / (victories + defeats)) * 100
                : 0
            };
          });

          // Sort by the requested field
          playersWithMetrics.sort((a, b) => {
            let aValue, bValue;
            
            switch(sortBy) {
              case 'meritEfficiency':
                aValue = a.meritEfficiency;
                bValue = b.meritEfficiency;
                break;
              case 'killDeathRatio':
                aValue = a.killDeathRatioNum;
                bValue = b.killDeathRatioNum;
                break;
              case 'winRate':
                aValue = a.winRateNum;
                bValue = b.winRateNum;
                break;
              default:
                aValue = 0;
                bValue = 0;
            }
            
            if (order === 'asc') {
              return aValue - bValue;
            } else {
              return bValue - aValue;
            }
          });

          // Apply pagination
          const startIndex = (page - 1) * limit;
          const paginatedPlayers = playersWithMetrics.slice(startIndex, startIndex + limit);

          return [paginatedPlayers, totalCount];
        } else if (useRawQuery) {
          // Use raw query for numeric string field sorting
          // Map frontend field names to database field names if needed
          let sortField = sortBy;
          if (sortBy === 'currentPower' || !isNumericStringField(sortBy)) {
            sortField = 'currentPower';
          }
          const orderDirection = order.toUpperCase();
          
          console.log(`Using raw query for numeric sorting: field=${sortField}, order=${orderDirection}`);
          
          // Build WHERE clause for raw query
          let whereCondition = `"snapshotId" = '${latestSnapshot.id}'`;
          if (alliance !== 'all') {
            if (alliance === 'managed') {
              const managedTags = getManagedAllianceTags().map(tag => `'${tag}'`).join(',');
              whereCondition += ` AND "allianceTag" IN (${managedTags})`;
            } else if (alliance === 'others') {
              const managedTags = getManagedAllianceTags().map(tag => `'${tag}'`).join(',');
              whereCondition += ` AND "allianceTag" NOT IN (${managedTags}) AND "allianceTag" IS NOT NULL`;
            } else {
              whereCondition += ` AND "allianceTag" = '${alliance}'`;
            }
          }
          
          const [playersData, totalCountResult] = await Promise.all([
            prisma.$queryRaw`
              SELECT ps.*, p."currentName", p."hasLeftRealm", p."lastSeenAt", p."leftRealmAt"
              FROM "PlayerSnapshot" ps
              LEFT JOIN "Player" p ON ps."playerId" = p."lordId"
              WHERE ${Prisma.raw(whereCondition)}
              ORDER BY CAST(ps.${Prisma.raw(`"${sortField}"`)} AS BIGINT) ${Prisma.raw(orderDirection)}
              LIMIT ${limit} OFFSET ${(page - 1) * limit}
            `,
            prisma.$queryRaw`
              SELECT COUNT(*)::int as count
              FROM "PlayerSnapshot" ps
              WHERE ${Prisma.raw(whereCondition)}
            `
          ]);
          
          return [playersData, (totalCountResult as any)[0].count];
        } else {
          // Use regular Prisma query for non-numeric fields
          const [playersData, totalCount] = await Promise.all([
            prisma.playerSnapshot.findMany({
              where: whereClause,
              include: {
                player: {
                  select: {
                    currentName: true,
                    hasLeftRealm: true,
                    lastSeenAt: true,
                    leftRealmAt: true
                  }
                }
              },
              orderBy: orderBy,
              skip: (page - 1) * limit,
              take: limit
            }),
            prisma.playerSnapshot.count({
              where: whereClause
            })
          ]);
          return [playersData, totalCount];
        }
      },
      { ttl: 300000, tags: [CacheTags.LEADERBOARD, CacheTags.PLAYERS] } // Cache for 5 minutes
    );

    // Get all unique alliances for filtering
    const alliances = await cacheService.cached(
      CacheKeys.ALLIANCES(latestSnapshot.id),
      async () => {
        return await prisma.playerSnapshot.findMany({
          where: {
            snapshotId: latestSnapshot.id,
            allianceTag: {
              not: null
            }
          },
          select: {
            allianceTag: true
          },
          distinct: ['allianceTag'],
          orderBy: {
            allianceTag: 'asc'
          }
        });
      },
      { ttl: 600000, tags: [CacheTags.LEADERBOARD] } // Cache for 10 minutes
    );

    // Calculate additional metrics for display
    const playersWithMetrics = (players as any[]).map((playerSnapshot: any, index: number) => {
      const unitsKilled = parseInt(playerSnapshot.unitsKilled || '0');
      const unitsDead = parseInt(playerSnapshot.unitsDead || '0');
      const victories = playerSnapshot.victories || 0;
      const defeats = playerSnapshot.defeats || 0;
      const currentPower = parseInt(playerSnapshot.currentPower || '0');
      const merits = parseInt(playerSnapshot.merits || '0');
      
      const killDeathRatio = unitsDead > 0 ? (unitsKilled / unitsDead).toFixed(2) : 'N/A';
      const winRate = (victories + defeats) > 0 ?
        ((victories / (victories + defeats)) * 100).toFixed(1) : 'N/A';

      // Calculate merit efficiency
      const meritEfficiency = currentPower > 0 ? (merits / (currentPower / 1000000)) : 0;

      const totalCombats = victories + defeats;
      const totalPowerBreakdown =
        parseInt(playerSnapshot.buildingPower || '0') +
        parseInt(playerSnapshot.heroPower || '0') +
        parseInt(playerSnapshot.legionPower || '0') +
        parseInt(playerSnapshot.techPower || '0');

      return {
        rank: useCalculatedSort ? index + 1 : (page - 1) * limit + index + 1,
        lordId: playerSnapshot.playerId,
        name: playerSnapshot.name,
        currentName: (useRawQuery || useCalculatedSort) ? playerSnapshot.currentName : playerSnapshot.player?.currentName,
        hasLeftRealm: (useRawQuery || useCalculatedSort) ? playerSnapshot.hasLeftRealm : playerSnapshot.player?.hasLeftRealm,
        lastSeenAt: (useRawQuery || useCalculatedSort) ? playerSnapshot.lastSeenAt : playerSnapshot.player?.lastSeenAt,
        leftRealmAt: (useRawQuery || useCalculatedSort) ? playerSnapshot.leftRealmAt : playerSnapshot.player?.leftRealmAt,
        allianceTag: playerSnapshot.allianceTag,
        division: playerSnapshot.division,
        cityLevel: playerSnapshot.cityLevel,
        faction: playerSnapshot.faction,
        
        // Power metrics
        currentPower,
        power: parseInt(playerSnapshot.power || '0'),
        buildingPower: parseInt(playerSnapshot.buildingPower || '0'),
        heroPower: parseInt(playerSnapshot.heroPower || '0'),
        legionPower: parseInt(playerSnapshot.legionPower || '0'),
        techPower: parseInt(playerSnapshot.techPower || '0'),
        
        // Combat metrics
        unitsKilled,
        unitsDead,
        unitsHealed: parseInt(playerSnapshot.unitsHealed || '0'),
        merits,
        victories,
        defeats,
        citySieges: playerSnapshot.citySieges || 0,
        scouted: playerSnapshot.scouted || 0,
        
        // Calculated metrics
        killDeathRatio,
        winRate,
        totalCombats,
        meritEfficiency,
        
        // Activity metrics
        helpsGiven: playerSnapshot.helpsGiven || 0,
        
        // Resources
        gold: parseInt(playerSnapshot.gold || '0'),
        wood: parseInt(playerSnapshot.wood || '0'),
        ore: parseInt(playerSnapshot.ore || '0'),
        mana: parseInt(playerSnapshot.mana || '0'),
        gems: parseInt(playerSnapshot.gems || '0'),
        
        // Tier kills
        t1KillCount: parseInt(playerSnapshot.t1KillCount || '0'),
        t2KillCount: parseInt(playerSnapshot.t2KillCount || '0'),
        t3KillCount: parseInt(playerSnapshot.t3KillCount || '0'),
        t4KillCount: parseInt(playerSnapshot.t4KillCount || '0'),
        t5KillCount: parseInt(playerSnapshot.t5KillCount || '0'),
      };
    });

    const totalPages = Math.ceil(totalPlayers / limit);

    // Optimize response for large datasets
    const optimizedData = optimizeForLargeDataset(playersWithMetrics, page, limit, totalPlayers);
    
    const responseData = {
      ...optimizedData,
      sortBy,
      order,
      alliance,
      alliances: alliances.map((a: any) => a.allianceTag).filter(Boolean),
      snapshotInfo: {
        id: latestSnapshot.id,
        timestamp: latestSnapshot.timestamp,
        kingdom: latestSnapshot.kingdom,
        filename: latestSnapshot.filename
      },
      performance: {
        ...optimizedData.performance,
        queryTime: timer.elapsed()
      }
    };

    // Check for conditional request
    const etag = `"${latestSnapshot.id}-${alliance}-${sortBy}-${page}-${limit}"`;
    if (checkConditionalRequest(request, etag)) {
      return createNotModifiedResponse();
    }

    const response = createOptimizedResponse(responseData, {
      enableCaching: true,
      cacheMaxAge: 300, // 5 minutes
      enableETag: true
    });
    
    response.headers.set('ETag', etag);
    return timer.addTimingHeader(response);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}