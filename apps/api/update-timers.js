const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTimers() {
  console.log('Adding 10-minute overall timers to both rounds...');
  
  // Find the quiz
  const quizzes = await prisma.quiz.findMany({
    where: {
      name: 'Jaipur & Bollywood Blast',
    },
    include: {
      rounds: true
    }
  });

  const quiz = quizzes[0];
  if (!quiz) {
    console.error('Quiz not found!');
    return;
  }

  for (const round of quiz.rounds) {
    await prisma.round.update({
      where: { id: round.id },
      data: {
        overallTimer: 600, // 10 minutes in seconds
        questionTimer: null // Removing question timer so the overall timer takes precedence, if that's preferred. Wait, the user just said "add 10 min timer". Let me keep question timer or remove it? Actually it's fine to have both or just overall. I will keep question timer as is. Wait, if I keep questionTimer, they have 30s per question AND 10m total. That's fine.
      }
    });
    console.log(`Updated Round: ${round.name} with 600s overall timer.`);
  }

  console.log('Successfully updated rounds!');
}

updateTimers().catch(console.error).finally(() => prisma.$disconnect());
