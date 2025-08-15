const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  
  await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      password,
      name: 'Admin',
      role: 'ADMIN'
    }
  });
  
  console.log('Admin user created: admin / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());