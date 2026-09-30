const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.participant.findMany();
  console.log(users.map(u => ({ username: u.username, name: u.name })));
}

main().finally(() => prisma.$disconnect());
