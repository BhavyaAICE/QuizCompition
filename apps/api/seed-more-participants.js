const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seedMore() {
  console.log('Seeding participants 11 to 21...');
  
  // Find the quiz
  const quizzes = await prisma.quiz.findMany({
    where: {
      name: 'Jaipur & Bollywood Blast',
    }
  });

  const quiz = quizzes[0];
  if (!quiz) {
    console.error('Quiz not found!');
    return;
  }

  const hash = await bcrypt.hash('echona2026', 10);
  let count = 0;

  for (let i = 11; i <= 21; i++) {
    const newUsername = 'echona' + i;
    
    // Check if user already exists to avoid unique constraint errors
    const existing = await prisma.participant.findUnique({
      where: { username: newUsername }
    });

    if (!existing) {
      await prisma.participant.create({
        data: {
          username: newUsername,
          passwordHash: hash,
          plainPassword: 'echona2026',
          name: 'Crew Member ' + i,
          quizId: quiz.id
        }
      });
      console.log(`Created: Username: ${newUsername} | Name: Crew Member ${i} | Password: echona2026`);
      count++;
    } else {
      console.log(`Skipped: ${newUsername} already exists.`);
    }
  }

  console.log(`Successfully added ${count} new participants!`);
}

seedMore().catch(console.error).finally(() => prisma.$disconnect());
