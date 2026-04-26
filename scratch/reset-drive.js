const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  const result = await prisma.user.updateMany({
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null
    }
  });
  console.log(`Successfully reset ${result.count} users' drive connections.`);
}

reset()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
