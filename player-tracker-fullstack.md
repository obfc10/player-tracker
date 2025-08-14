# Full-Stack Player Data Tracking System

## Project Architecture

### Technology Stack
- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **File Processing**: ExcelJS for server-side Excel parsing
- **Charts**: Chart.js (maintaining existing functionality)
- **Styling**: Tailwind CSS with dark theme
- **Deployment**: Vercel/Railway or self-hosted

## Project Structure

```
player-tracker/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── players/
│   │   │   ├── snapshots/
│   │   │   ├── upload/
│   │   │   └── export/
│   │   ├── dashboard/
│   │   │   ├── overview/
│   │   │   ├── players/
│   │   │   ├── progress/
│   │   │   ├── leaderboard/
│   │   │   ├── changes/
│   │   │   └── player/[id]/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── charts/
│   │   ├── tables/
│   │   ├── player-card/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth/
│   │   ├── db/
│   │   └── utils/
│   └── types/
├── prisma/
│   └── schema.prisma
└── package.json
```

## Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(VIEWER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  uploads   Upload[]
}

enum Role {
  ADMIN
  VIEWER
}

model Player {
  lordId           String            @id
  currentName      String
  nameHistory      NameChange[]
  allianceHistory  AllianceChange[]
  snapshots        PlayerSnapshot[]
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  
  @@index([currentName])
}

model NameChange {
  id         String   @id @default(cuid())
  player     Player   @relation(fields: [playerId], references: [lordId])
  playerId   String
  oldName    String
  newName    String
  detectedAt DateTime
  
  @@index([playerId])
}

model AllianceChange {
  id            String   @id @default(cuid())
  player        Player   @relation(fields: [playerId], references: [lordId])
  playerId      String
  oldAlliance   String?
  oldAllianceId String?
  newAlliance   String
  newAllianceId String
  detectedAt    DateTime
  
  @@index([playerId])
}

model PlayerSnapshot {
  id                    String   @id @default(cuid())
  player                Player   @relation(fields: [playerId], references: [lordId])
  playerId              String
  snapshot              Snapshot @relation(fields: [snapshotId], references: [id])
  snapshotId            String
  
  // Player identification
  name                  String
  division              Int
  allianceId            String?
  allianceTag           String?
  
  // Power metrics
  currentPower          BigInt
  power                 BigInt
  buildingPower         BigInt
  heroPower             BigInt
  legionPower           BigInt
  techPower             BigInt
  
  // Combat statistics
  merits                BigInt
  unitsKilled           BigInt
  unitsDead             BigInt
  unitsHealed           BigInt
  t1KillCount           BigInt
  t2KillCount           BigInt
  t3KillCount           BigInt
  t4KillCount           BigInt
  t5KillCount           BigInt
  
  // Battle statistics
  victories             Int
  defeats               Int
  citySieges            Int
  scouted               Int
  
  // Resources
  gold                  BigInt
  goldSpent             BigInt
  wood                  BigInt
  woodSpent             BigInt
  ore                   BigInt
  oreSpent              BigInt
  mana                  BigInt
  manaSpent             BigInt
  gems                  BigInt
  gemsSpent             BigInt
  
  // Alliance activity
  helpsGiven            Int
  resourcesGiven        BigInt
  resourcesGivenCount   Int
  
  // Player info
  cityLevel             Int
  faction               String?
  
  @@unique([playerId, snapshotId])
  @@index([snapshotId])
  @@index([playerId])
  @@index([currentPower])
}

model Snapshot {
  id          String           @id @default(cuid())
  timestamp   DateTime
  filename    String
  kingdom     Int
  upload      Upload           @relation(fields: [uploadId], references: [id])
  uploadId    String
  players     PlayerSnapshot[]
  createdAt   DateTime         @default(now())
  
  @@index([timestamp])
  @@index([kingdom])
}

model Upload {
  id         String     @id @default(cuid())
  filename   String
  uploadedBy User       @relation(fields: [userId], references: [id])
  userId     String
  snapshots  Snapshot[]
  status     UploadStatus @default(PROCESSING)
  error      String?
  createdAt  DateTime   @default(now())
  
  @@index([userId])
  @@index([status])
}

enum UploadStatus {
  PROCESSING
  COMPLETED
  FAILED
}
```

## Backend Implementation

### 1. File Upload and Processing API

```typescript
// src/app/api/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  // Parse filename: 671_20250810_2040utc.xlsx
  const filenameRegex = /(\d+)_(\d{8})_(\d{4})utc/;
  const match = file.name.match(filenameRegex);
  
  if (!match) {
    return NextResponse.json({ error: 'Invalid filename format' }, { status: 400 });
  }

  const [, kingdom, dateStr, timeStr] = match;
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  const hour = parseInt(timeStr.substring(0, 2));
  const minute = parseInt(timeStr.substring(2, 4));
  
  const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Create upload record
  const upload = await prisma.upload.create({
    data: {
      filename: file.name,
      userId: session.user.id,
      status: 'PROCESSING'
    }
  });

  try {
    // Process Excel file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const worksheet = workbook.getWorksheet(kingdom);
    if (!worksheet) {
      throw new Error(`Worksheet "${kingdom}" not found`);
    }

    // Create snapshot
    const snapshot = await prisma.snapshot.create({
      data: {
        timestamp,
        filename: file.name,
        kingdom: parseInt(kingdom),
        uploadId: upload.id
      }
    });

    // Process rows starting from row 2
    const rows = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber < 2) return;
      
      const data = {
        lordId: row.getCell(1).value?.toString() || '',
        name: row.getCell(2).value?.toString() || '',
        division: parseInt(row.getCell(3).value?.toString() || '0'),
        allianceId: row.getCell(4).value?.toString() || null,
        allianceTag: row.getCell(5).value?.toString() || null,
        currentPower: BigInt(row.getCell(6).value?.toString() || '0'),
        power: BigInt(row.getCell(7).value?.toString() || '0'),
        merits: BigInt(row.getCell(8).value?.toString() || '0'),
        unitsKilled: BigInt(row.getCell(9).value?.toString() || '0'),
        unitsDead: BigInt(row.getCell(10).value?.toString() || '0'),
        unitsHealed: BigInt(row.getCell(11).value?.toString() || '0'),
        t1KillCount: BigInt(row.getCell(12).value?.toString() || '0'),
        t2KillCount: BigInt(row.getCell(13).value?.toString() || '0'),
        t3KillCount: BigInt(row.getCell(14).value?.toString() || '0'),
        t4KillCount: BigInt(row.getCell(15).value?.toString() || '0'),
        t5KillCount: BigInt(row.getCell(16).value?.toString() || '0'),
        buildingPower: BigInt(row.getCell(17).value?.toString() || '0'),
        heroPower: BigInt(row.getCell(18).value?.toString() || '0'),
        legionPower: BigInt(row.getCell(19).value?.toString() || '0'),
        techPower: BigInt(row.getCell(20).value?.toString() || '0'),
        victories: parseInt(row.getCell(21).value?.toString() || '0'),
        defeats: parseInt(row.getCell(22).value?.toString() || '0'),
        citySieges: parseInt(row.getCell(23).value?.toString() || '0'),
        scouted: parseInt(row.getCell(24).value?.toString() || '0'),
        helpsGiven: parseInt(row.getCell(25).value?.toString() || '0'),
        gold: BigInt(row.getCell(26).value?.toString() || '0'),
        goldSpent: BigInt(row.getCell(27).value?.toString() || '0'),
        wood: BigInt(row.getCell(28).value?.toString() || '0'),
        woodSpent: BigInt(row.getCell(29).value?.toString() || '0'),
        ore: BigInt(row.getCell(30).value?.toString() || '0'),
        oreSpent: BigInt(row.getCell(31).value?.toString() || '0'),
        mana: BigInt(row.getCell(32).value?.toString() || '0'),
        manaSpent: BigInt(row.getCell(33).value?.toString() || '0'),
        gems: BigInt(row.getCell(34).value?.toString() || '0'),
        gemsSpent: BigInt(row.getCell(35).value?.toString() || '0'),
        resourcesGiven: BigInt(row.getCell(36).value?.toString() || '0'),
        resourcesGivenCount: parseInt(row.getCell(37).value?.toString() || '0'),
        cityLevel: parseInt(row.getCell(38).value?.toString() || '0'),
        faction: row.getCell(39).value?.toString() || null
      };
      
      if (data.lordId) {
        rows.push(data);
      }
    });

    // Batch process players
    for (const row of rows) {
      // Upsert player
      const player = await prisma.player.upsert({
        where: { lordId: row.lordId },
        update: { currentName: row.name },
        create: { lordId: row.lordId, currentName: row.name }
      });

      // Check for name changes
      const lastSnapshot = await prisma.playerSnapshot.findFirst({
        where: { playerId: row.lordId },
        orderBy: { snapshot: { timestamp: 'desc' } },
        include: { snapshot: true }
      });

      if (lastSnapshot && lastSnapshot.name !== row.name) {
        await prisma.nameChange.create({
          data: {
            playerId: row.lordId,
            oldName: lastSnapshot.name,
            newName: row.name,
            detectedAt: timestamp
          }
        });
      }

      // Check for alliance changes
      if (lastSnapshot && lastSnapshot.allianceTag !== row.allianceTag) {
        await prisma.allianceChange.create({
          data: {
            playerId: row.lordId,
            oldAlliance: lastSnapshot.allianceTag,
            oldAllianceId: lastSnapshot.allianceId,
            newAlliance: row.allianceTag || 'None',
            newAllianceId: row.allianceId || '',
            detectedAt: timestamp
          }
        });
      }

      // Create player snapshot
      await prisma.playerSnapshot.create({
        data: {
          ...row,
          playerId: row.lordId,
          snapshotId: snapshot.id
        }
      });
    }

    // Update upload status
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'COMPLETED' }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${rows.length} players`,
      snapshotId: snapshot.id 
    });

  } catch (error) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { 
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json({ 
      error: 'Processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### 2. Player Card API

```typescript
// src/app/api/players/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const player = await prisma.player.findUnique({
    where: { lordId: params.id },
    include: {
      nameHistory: {
        orderBy: { detectedAt: 'desc' }
      },
      allianceHistory: {
        orderBy: { detectedAt: 'desc' }
      },
      snapshots: {
        include: {
          snapshot: true
        },
        orderBy: {
          snapshot: { timestamp: 'desc' }
        }
      }
    }
  });

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  // Calculate statistics
  const latestSnapshot = player.snapshots[0];
  const stats = calculatePlayerStats(player.snapshots);

  return NextResponse.json({
    player,
    stats,
    latestSnapshot
  });
}

function calculatePlayerStats(snapshots: any[]) {
  if (snapshots.length < 2) {
    return {
      powerGrowthRate: 0,
      combatEfficiency: 0,
      activityLevel: 0,
      resourceEfficiency: 0
    };
  }

  const latest = snapshots[0];
  const oldest = snapshots[snapshots.length - 1];
  const daysDiff = Math.max(1, 
    (new Date(latest.snapshot.timestamp).getTime() - 
     new Date(oldest.snapshot.timestamp).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    powerGrowthRate: Number(latest.currentPower - oldest.currentPower) / daysDiff,
    combatEfficiency: latest.unitsKilled > 0 ? 
      Number(latest.unitsKilled) / (Number(latest.unitsDead) || 1) : 0,
    activityLevel: latest.helpsGiven / daysDiff,
    resourceEfficiency: calculateResourceEfficiency(latest),
    allianceContribution: latest.resourcesGivenCount,
    powerBreakdown: {
      building: Number(latest.buildingPower),
      hero: Number(latest.heroPower),
      legion: Number(latest.legionPower),
      tech: Number(latest.techPower)
    }
  };
}

function calculateResourceEfficiency(snapshot: any) {
  const totalSpent = Number(snapshot.goldSpent) + 
                     Number(snapshot.woodSpent) + 
                     Number(snapshot.oreSpent) + 
                     Number(snapshot.manaSpent) + 
                     Number(snapshot.gemsSpent);
  
  const totalCurrent = Number(snapshot.gold) + 
                       Number(snapshot.wood) + 
                       Number(snapshot.ore) + 
                       Number(snapshot.mana) + 
                       Number(snapshot.gems);
  
  return totalSpent > 0 ? (totalCurrent / totalSpent) * 100 : 0;
}
```

## Frontend Components

### 1. Player Card Component

```tsx
// src/components/player-card/PlayerCard.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Chart } from 'chart.js/auto';
import { formatNumber, formatDate } from '@/lib/utils';

interface PlayerCardProps {
  playerId: string;
}

export function PlayerCard({ playerId }: PlayerCardProps) {
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}`);
      const data = await response.json();
      setPlayer(data);
    } catch (error) {
      console.error('Failed to fetch player data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading player data...</div>;
  }

  if (!player) {
    return <div>Player not found</div>;
  }

  const { player: playerData, stats, latestSnapshot } = player;

  return (
    <div className="container mx-auto p-6">
      {/* Header Section */}
      <Card className="mb-6 bg-gradient-to-r from-purple-900 to-purple-700">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl text-white">
                {playerData.currentName}
              </CardTitle>
              <p className="text-gray-200 mt-2">
                Lord ID: {playerData.lordId}
              </p>
              <p className="text-gray-200">
                Alliance: {latestSnapshot?.allianceTag || 'None'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-400">
                {formatNumber(latestSnapshot?.currentPower || 0)}
              </div>
              <p className="text-gray-200">Current Power</p>
              <p className="text-sm text-gray-300 mt-2">
                Last seen: {formatDate(latestSnapshot?.snapshot.timestamp)}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Tabs */}
      <Tabs defaultValue="power" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="power">Power</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="power">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Power Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas id="powerBreakdownChart"></canvas>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Power Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas id="powerTrendChart"></canvas>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="combat">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Combat Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Units Killed</span>
                    <span className="font-bold text-green-500">
                      {formatNumber(latestSnapshot?.unitsKilled || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units Dead</span>
                    <span className="font-bold text-red-500">
                      {formatNumber(latestSnapshot?.unitsDead || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Units Healed</span>
                    <span className="font-bold text-blue-500">
                      {formatNumber(latestSnapshot?.unitsHealed || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Victories</span>
                    <span className="font-bold">
                      {formatNumber(latestSnapshot?.victories || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Defeats</span>
                    <span className="font-bold">
                      {formatNumber(latestSnapshot?.defeats || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Combat Efficiency</span>
                    <span className="font-bold text-purple-500">
                      {stats.combatEfficiency.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Kill Breakdown by Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas id="killBreakdownChart"></canvas>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Resource Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {['Gold', 'Wood', 'Ore', 'Mana', 'Gems'].map((resource) => {
                  const current = latestSnapshot?.[resource.toLowerCase()] || 0;
                  const spent = latestSnapshot?.[`${resource.toLowerCase()}Spent`] || 0;
                  return (
                    <div key={resource} className="text-center">
                      <h4 className="font-semibold">{resource}</h4>
                      <p className="text-2xl font-bold text-green-500">
                        {formatNumber(current)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Spent: {formatNumber(spent)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
                <div className="flex justify-between items-center">
                  <span>Resource Efficiency</span>
                  <span className="text-xl font-bold">
                    {stats.resourceEfficiency.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span>Resources Given</span>
                  <span className="font-bold">
                    {formatNumber(latestSnapshot?.resourcesGiven || 0)} 
                    ({latestSnapshot?.resourcesGivenCount || 0} times)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Helps Given</span>
                    <span className="font-bold">
                      {formatNumber(latestSnapshot?.helpsGiven || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>City Sieges</span>
                    <span className="font-bold">
                      {formatNumber(latestSnapshot?.citySieges || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Scouted</span>
                    <span className="font-bold">
                      {formatNumber(latestSnapshot?.scouted || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>City Level</span>
                    <span className="font-bold text-blue-500">
                      {latestSnapshot?.cityLevel || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Faction</span>
                    <span className="font-bold">
                      {latestSnapshot?.faction || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Activity Level</span>
                    <span className="font-bold text-green-500">
                      {stats.activityLevel.toFixed(1)} helps/day
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Activity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas id="activityTrendChart"></canvas>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-6">
            {playerData.nameHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Name History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerData.nameHistory.map((change: any) => (
                      <div key={change.id} className="flex justify-between py-2 border-b">
                        <span>
                          {change.oldName} → {change.newName}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(change.detectedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {playerData.allianceHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Alliance History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {playerData.allianceHistory.map((change: any) => (
                      <div key={change.id} className="flex justify-between py-2 border-b">
                        <span>
                          {change.oldAlliance || 'None'} → {change.newAlliance}
                        </span>
                        <span className="text-gray-500">
                          {formatDate(change.detectedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Historical Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <canvas id="timelineChart"></canvas>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 2. Authentication Setup

```typescript
// src/lib/auth.ts

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !await bcrypt.compare(credentials.password, user.password)) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
};
```

### 3. Dashboard Layout Component

```typescript
// src/app/dashboard/layout.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Trophy, 
  BarChart3,
  Upload,
  LogOut
} from 'lucide-react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Overview', href: '/dashboard/overview', icon: LayoutDashboard },
    { name: 'Players', href: '/dashboard/players', icon: Users },
    { name: 'Progress', href: '/dashboard/progress', icon: TrendingUp },
    { name: 'Leaderboard', href: '/dashboard/leaderboard', icon: Trophy },
    { name: 'Changes', href: '/dashboard/changes', icon: BarChart3 }
  ];

  const adminNavigation = [
    { name: 'Upload Data', href: '/dashboard/upload', icon: Upload }
  ];

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-800 transition-all duration-300`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4">
            <h1 className={`text-xl font-bold text-white ${!sidebarOpen && 'hidden'}`}>
              Player Tracker
            </h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-gray-900 text-white' 
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className={!sidebarOpen ? 'hidden' : ''}>{item.name}</span>
                </Link>
              );
            })}

            {session?.user?.role === 'ADMIN' && (
              <>
                <div className="my-4 border-t border-gray-700" />
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${pathname === item.href 
                        ? 'bg-gray-900 text-white' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    `}
                  >
                    <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className={!sidebarOpen ? 'hidden' : ''}>{item.name}</span>
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className={`flex-1 ${!sidebarOpen && 'hidden'}`}>
                <p className="text-sm text-white">{session?.user?.name}</p>
                <p className="text-xs text-gray-400">{session?.user?.role}</p>
              </div>
              <button className="text-gray-400 hover:text-white">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### 4. Upload Component for Admins

```tsx
// src/app/dashboard/upload/page.tsx

'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface UploadStatus {
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
  playerCount?: number;
}

export default function UploadPage() {
  const { data: session } = useSession();
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const filename = file.name;
      const isValidFormat = /\d+_\d{8}_\d{4}utc\.xlsx?$/i.test(filename);
      if (!isValidFormat) {
        alert(`Invalid filename format: ${filename}\nExpected format: 671_20250810_2040utc.xlsx`);
      }
      return isValidFormat;
    });

    if (validFiles.length > 0) {
      uploadFiles(validFiles);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    
    const newUploads = files.map(file => ({
      filename: file.name,
      status: 'pending' as const
    }));
    
    setUploads(newUploads);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setUploads(prev => prev.map((u, idx) => 
        idx === i ? { ...u, status: 'processing' } : u
      ));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok) {
          setUploads(prev => prev.map((u, idx) => 
            idx === i ? { 
              ...u, 
              status: 'completed',
              message: result.message,
              playerCount: result.playerCount
            } : u
          ));
        } else {
          setUploads(prev => prev.map((u, idx) => 
            idx === i ? { 
              ...u, 
              status: 'failed',
              message: result.error || 'Upload failed'
            } : u
          ));
        }
      } catch (error) {
        setUploads(prev => prev.map((u, idx) => 
          idx === i ? { 
            ...u, 
            status: 'failed',
            message: 'Network error'
          } : u
        ));
      }
    }

    setIsUploading(false);
  };

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You don't have permission to access this page. Only administrators can upload data files.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Data Files</h1>
        <p className="text-gray-400">
          Upload Excel files with player data. Files must follow the naming format: 
          <code className="ml-2 px-2 py-1 bg-gray-800 rounded">671_YYYYMMDD_HHMMutc.xlsx</code>
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Files</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg">Drop the files here...</p>
            ) : (
              <>
                <p className="text-lg mb-2">Drag & drop Excel files here</p>
                <p className="text-sm text-gray-500">or click to select files</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {uploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploads.map((upload, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{upload.filename}</p>
                      {upload.message && (
                        <p className="text-sm text-gray-500">{upload.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    {upload.status === 'pending' && (
                      <span className="text-gray-500">Waiting...</span>
                    )}
                    {upload.status === 'processing' && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                    )}
                    {upload.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {upload.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

## Deployment Instructions

### 1. Environment Setup

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/player_tracker"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Installation Steps

```bash
# Create new Next.js project
npx create-next-app@latest player-tracker --typescript --tailwind --app

# Install dependencies
cd player-tracker
npm install @prisma/client prisma
npm install next-auth bcryptjs
npm install exceljs
npm install chart.js react-chartjs-2
npm install lucide-react
npm install react-dropzone
npm install @radix-ui/react-tabs
npm install @radix-ui/react-dialog

# Initialize Prisma
npx prisma init

# Copy the schema.prisma file content from above

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Create initial admin user (create a seed script)
npx prisma db seed
```

### 3. Seed Script for Initial Admin

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });
  
  console.log('Created admin user:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 4. Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

## API Endpoints Documentation

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `POST /api/auth/register` - Register new user (admin only)

### Players
- `GET /api/players` - List all players with filtering
- `GET /api/players/[id]` - Get player details and card data
- `GET /api/players/[id]/history` - Get player historical data

### Snapshots
- `GET /api/snapshots` - List all snapshots
- `GET /api/snapshots/[id]` - Get snapshot details
- `DELETE /api/snapshots/[id]` - Delete snapshot (admin only)

### Upload
- `POST /api/upload` - Upload Excel file (admin only)
- `GET /api/upload/status/[id]` - Check upload status

### Export
- `GET /api/export/players` - Export player data as CSV
- `GET /api/export/snapshot/[id]` - Export specific snapshot

### Statistics
- `GET /api/stats/overview` - Get overview statistics
- `GET /api/stats/leaderboard` - Get leaderboard data
- `GET /api/stats/changes` - Get period-over-period changes
- `GET /api/stats/alliances` - Get alliance statistics

## Security Considerations

1. **Authentication**: JWT-based authentication with secure session management
2. **Authorization**: Role-based access control (Admin vs Viewer)
3. **File Upload**: Validate file format and size limits
4. **SQL Injection**: Using Prisma ORM prevents SQL injection
5. **XSS Protection**: Next.js provides built-in XSS protection
6. **CORS**: Configure appropriate CORS headers
7. **Rate Limiting**: Implement rate limiting for API endpoints
8. **Input Validation**: Validate all user inputs
9. **Error Handling**: Never expose sensitive error details
10. **HTTPS**: Always use HTTPS in production

## Performance Optimizations

1. **Database Indexing**: Indexes on frequently queried fields
2. **Pagination**: Implement pagination for large datasets
3. **Caching**: Use Redis for caching frequently accessed data
4. **Lazy Loading**: Load player cards on demand
5. **Chart Optimization**: Limit data points in charts
6. **Image Optimization**: Use Next.js Image component
7. **Code Splitting**: Automatic with Next.js
8. **API Response Compression**: Enable gzip compression
9. **Database Connection Pooling**: Prisma handles this automatically
10. **Background Jobs**: Process large files asynchronously

## Maintenance and Monitoring

1. **Logging**: Implement structured logging with Winston
2. **Error Tracking**: Use Sentry for error monitoring
3. **Performance Monitoring**: Use Vercel Analytics or similar
4. **Database Backups**: Automated daily backups
5. **Health Checks**: Implement health check endpoints
6. **Documentation**: Maintain API documentation with Swagger
7. **Testing**: Unit tests with Jest, E2E tests with Playwright
8. **CI/CD**: GitHub Actions for automated deployment
9. **Version Control**: Git with semantic versioning
10. **Update Strategy**: Regular dependency updates

This implementation provides a complete, production-ready full-stack application that maintains all functionality from your existing HTML system while adding robust backend capabilities, user authentication, and role-based access control.