const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDb() {
  console.log('🗑 Clearing database...');
  await prisma.clip.deleteMany({});
  console.log('  ✓ Clips deleted');
  await prisma.room.deleteMany({});
  console.log('  ✓ Rooms deleted');
  await prisma.user.deleteMany({});
  console.log('  ✓ Users deleted');
  console.log('\n✅ Database cleared successfully!');
  await prisma.$disconnect();
}

clearDb().catch(e => { console.error(e); process.exit(1); });
