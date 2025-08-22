const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating test data for leaderboard...');
  
  // Create or get test season
  const season = await prisma.season.upsert({
    where: { name: 'Test Season 2024' },
    update: {
      isActive: true
    },
    create: {
      name: 'Test Season 2024',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      isActive: true
    }
  });
  
  console.log('Created season:', season.name);
  
  // Create a test upload first
  const upload = await prisma.upload.create({
    data: {
      filename: 'test-snapshot.json',
      uploadedBy: {
        connect: { username: 'admin' }
      },
      status: 'COMPLETED',
      rowsProcessed: 10
    }
  });
  
  // Create a test snapshot
  const snapshot = await prisma.snapshot.create({
    data: {
      filename: 'test-snapshot.json',
      timestamp: new Date(),
      kingdom: '671',
      seasonId: season.id,
      uploadId: upload.id
    }
  });
  
  console.log('Created snapshot:', snapshot.filename);
  
  // Create test players with varying data for sorting tests
  const testPlayers = [
    { lordId: 'P001', name: 'AlphaWarrior', power: 95000000, merits: 150000, kills: 25000, deaths: 5000, wins: 800, defeats: 200, level: 30, alliance: 'PLAC' },
    { lordId: 'P002', name: 'BetaKnight', power: 85000000, merits: 120000, kills: 20000, deaths: 8000, wins: 600, defeats: 400, level: 28, alliance: 'PLAC' },
    { lordId: 'P003', name: 'GammaRanger', power: 75000000, merits: 180000, kills: 30000, deaths: 3000, wins: 900, defeats: 100, level: 29, alliance: 'FLAs' },
    { lordId: 'P004', name: 'DeltaMage', power: 65000000, merits: 90000, kills: 15000, deaths: 10000, wins: 400, defeats: 600, level: 26, alliance: 'FLAs' },
    { lordId: 'P005', name: 'EpsilonRogue', power: 55000000, merits: 200000, kills: 35000, deaths: 2000, wins: 950, defeats: 50, level: 27, alliance: 'Plaf' },
    { lordId: 'P006', name: 'ZetaPaladin', power: 45000000, merits: 60000, kills: 10000, deaths: 12000, wins: 300, defeats: 700, level: 25, alliance: 'Plaf' },
    { lordId: 'P007', name: 'EtaAssassin', power: 100000000, merits: 80000, kills: 18000, deaths: 7000, wins: 500, defeats: 500, level: 31, alliance: 'TEST' },
    { lordId: 'P008', name: 'ThetaGuardian', power: 35000000, merits: 250000, kills: 40000, deaths: 1000, wins: 980, defeats: 20, level: 24, alliance: 'TEST' },
    { lordId: 'P009', name: 'IotaBerserker', power: 25000000, merits: 40000, kills: 8000, deaths: 15000, wins: 200, defeats: 800, level: 23, alliance: null },
    { lordId: 'P010', name: 'KappaMonk', power: 15000000, merits: 300000, kills: 45000, deaths: 500, wins: 990, defeats: 10, level: 22, alliance: null }
  ];
  
  // Create players and their snapshots
  for (const playerData of testPlayers) {
    // Create or update player
    const player = await prisma.player.upsert({
      where: { lordId: playerData.lordId },
      update: {
        currentName: playerData.name,
        lastSeenAt: new Date()
      },
      create: {
        lordId: playerData.lordId,
        currentName: playerData.name,
        lastSeenAt: new Date()
      }
    });
    
    // Create player snapshot
    await prisma.playerSnapshot.create({
      data: {
        playerId: player.lordId,
        snapshotId: snapshot.id,
        name: playerData.name,
        allianceTag: playerData.alliance,
        currentPower: playerData.power.toString(),
        power: playerData.power.toString(),
        merits: playerData.merits.toString(),
        unitsKilled: playerData.kills.toString(),
        unitsDead: playerData.deaths.toString(),
        victories: playerData.wins,
        defeats: playerData.defeats,
        cityLevel: playerData.level,
        division: Math.floor(Math.random() * 5) + 1,
        faction: ['Human', 'Elf', 'Orc', 'Undead'][Math.floor(Math.random() * 4)],
        buildingPower: Math.floor(playerData.power * 0.3).toString(),
        heroPower: Math.floor(playerData.power * 0.2).toString(),
        legionPower: Math.floor(playerData.power * 0.4).toString(),
        techPower: Math.floor(playerData.power * 0.1).toString(),
        unitsHealed: Math.floor(Math.random() * 50000).toString(),
        helpsGiven: Math.floor(Math.random() * 1000),
        citySieges: Math.floor(Math.random() * 100),
        scouted: Math.floor(Math.random() * 500),
        gold: Math.floor(Math.random() * 1000000).toString(),
        wood: Math.floor(Math.random() * 1000000).toString(),
        ore: Math.floor(Math.random() * 1000000).toString(),
        mana: Math.floor(Math.random() * 1000000).toString(),
        gems: Math.floor(Math.random() * 10000).toString(),
        t1KillCount: Math.floor(playerData.kills * 0.1).toString(),
        t2KillCount: Math.floor(playerData.kills * 0.2).toString(),
        t3KillCount: Math.floor(playerData.kills * 0.3).toString(),
        t4KillCount: Math.floor(playerData.kills * 0.25).toString(),
        t5KillCount: Math.floor(playerData.kills * 0.15).toString(),
        resourcesGiven: Math.floor(Math.random() * 10000000).toString(),
        resourcesGivenCount: Math.floor(Math.random() * 1000),
        goldSpent: Math.floor(Math.random() * 500000).toString(),
        woodSpent: Math.floor(Math.random() * 500000).toString(),
        oreSpent: Math.floor(Math.random() * 500000).toString(),
        manaSpent: Math.floor(Math.random() * 500000).toString(),
        gemsSpent: Math.floor(Math.random() * 5000).toString()
      }
    });
    
    console.log(`Created player: ${playerData.name} (Power: ${(playerData.power/1000000).toFixed(1)}M, Merits: ${(playerData.merits/1000).toFixed(0)}K)`);
  }
  
  console.log('\nTest data created successfully!');
  console.log('You can now test the leaderboard sorting functionality.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());