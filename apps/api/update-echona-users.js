const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function updateUsers() {
  console.log('Updating participants to Echona 2026 credentials...');
  
  // Find the participants we created earlier (they start with jaipur)
  const participants = await prisma.participant.findMany({
    where: {
      username: {
        startsWith: 'jaipur'
      }
    },
    orderBy: {
      username: 'asc'
    }
  });

  const hash = await bcrypt.hash('echona2026', 10);

  let i = 1;
  let updatedCount = 0;
  for (const p of participants) {
    const newUsername = 'echona' + i;
    
    await prisma.participant.update({
      where: { id: p.id },
      data: { 
        username: newUsername,
        passwordHash: hash,
        plainPassword: 'echona2026',
        name: 'Crew Member ' + i // Updating name to fit the theme
      }
    });
    console.log(`Updated: ${p.username} -> Username: ${newUsername} | Password: echona2026`);
    i++;
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} participants!`);
}

updateUsers().catch(console.error).finally(() => prisma.$disconnect());
