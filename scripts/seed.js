const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password,
      name: 'Admin',
      role: 'ADMIN',
      status: 'APPROVED'
    },
    create: {
      username: 'admin',
      password,
      name: 'Admin',
      role: 'ADMIN',
      status: 'APPROVED'
    }
  });
  
  console.log('Admin user created/updated: admin / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());