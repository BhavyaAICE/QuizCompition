const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function fixPasswords() {
  console.log('Fixing passwords...');
  const participants = await prisma.participant.findMany({
    where: {
      username: {
        startsWith: 'jaipur'
      }
    }
  });

  const hash = await bcrypt.hash('echona2025', 10);

  let updatedCount = 0;
  for (const p of participants) {
    await prisma.participant.update({
      where: { id: p.id },
      data: { 
        passwordHash: hash,
        plainPassword: 'echona2025' // Setting plainPassword as well just in case
      }
    });
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} participants to use password "echona2025"`);
}

fixPasswords().catch(console.error).finally(() => prisma.$disconnect());
