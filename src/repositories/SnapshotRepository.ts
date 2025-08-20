import { prisma } from '@/lib/db';
import { Snapshot, SnapshotWithMetadata } from '@/types/snapshot';
import { PlayerSnapshot, ExcelPlayerData } from '@/types/player';
import { DatabaseError } from '@/types/api';

export class SnapshotRepository {
  async create(data: Omit<Snapshot, 'id' | 'createdAt'>): Promise<Snapshot> {
    try {
      return await prisma.snapshot.create({
        data
      });
    } catch (error) {
      throw new DatabaseError(`Failed to create snapshot`, error);
    }
  }

  async findLatest(seasonFilter?: { seasonId?: string }): Promise<Snapshot | null> {
    try {
      return await prisma.snapshot.findFirst({
        where: seasonFilter,
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to find latest snapshot`, error);
    }
  }

  async findById(id: string): Promise<SnapshotWithMetadata | null> {
    try {
      return await prisma.snapshot.findUnique({
        where: { id },
        include: {
          season: {
            select: { id: true, name: true, isActive: true }
          },
          upload: {
            select: {
              id: true,
              status: true,
              uploadedBy: {
                select: { username: true, name: true }
              }
            }
          },
          _count: {
            select: { players: true }
          }
        }
      }) as SnapshotWithMetadata | null;
    } catch (error) {
      throw new DatabaseError(`Failed to find snapshot by id: ${id}`, error);
    }
  }

  async createPlayerSnapshots(snapshotId: string, playersData: ExcelPlayerData[]): Promise<void> {
    const BATCH_SIZE = 20;
    
    try {
      for (let i = 0; i < playersData.length; i += BATCH_SIZE) {
        const batch = playersData.slice(i, i + BATCH_SIZE);
        
        await prisma.$transaction(async (tx) => {
          for (const data of batch) {
            const { lordId, ...snapshotData } = data;
            await tx.playerSnapshot.create({
              data: {
                playerId: lordId,
                snapshotId,
                ...snapshotData
              }
            });
          }
        }, {
          maxWait: 10000,
          timeout: 30000,
        });
      }
    } catch (error) {
      throw new DatabaseError(`Failed to create player snapshots`, error);
    }
  }

  async getPlayerSnapshots(snapshotId: string): Promise<PlayerSnapshot[]> {
    try {
      return await prisma.playerSnapshot.findMany({
        where: { snapshotId },
        include: { player: true }
      });
    } catch (error) {
      throw new DatabaseError(`Failed to get player snapshots for snapshot: ${snapshotId}`, error);
    }
  }

  async getPlayerSnapshotsFiltered(
    snapshotId: string, 
    filters: {
      includeLeftRealm?: boolean;
      allianceFilter?: string;
      managedTags?: string[];
    } = {}
  ): Promise<PlayerSnapshot[]> {
    try {
      const whereClause: any = { snapshotId };

      // Alliance filtering
      if (filters.allianceFilter && filters.allianceFilter !== 'all') {
        if (filters.allianceFilter === 'managed' && filters.managedTags) {
          whereClause.allianceTag = { in: filters.managedTags };
        } else if (filters.allianceFilter === 'others' && filters.managedTags) {
          whereClause.allianceTag = {
            notIn: filters.managedTags,
            not: null
          };
        } else {
          whereClause.allianceTag = filters.allianceFilter;
        }
      }

      const snapshots = await prisma.playerSnapshot.findMany({
        where: whereClause,
        include: { player: true }
      });

      // Filter out left realm players if needed
      if (!filters.includeLeftRealm) {
        return snapshots.filter(snapshot => !snapshot.player.hasLeftRealm);
      }

      return snapshots;
    } catch (error) {
      throw new DatabaseError(`Failed to get filtered player snapshots`, error);
    }
  }

  async getAllUniqueAlliances(snapshotId: string): Promise<string[]> {
    try {
      const alliances = await prisma.playerSnapshot.findMany({
        where: {
          snapshotId,
          allianceTag: { not: null }
        },
        select: { allianceTag: true },
        distinct: ['allianceTag'],
        orderBy: { allianceTag: 'asc' }
      });

      return alliances.map(a => a.allianceTag!).filter(Boolean);
    } catch (error) {
      throw new DatabaseError(`Failed to get unique alliances`, error);
    }
  }
}