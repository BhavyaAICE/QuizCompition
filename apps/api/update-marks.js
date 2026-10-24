const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateMarks() {
  console.log('Updating marks for both rounds...');
  
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
    if (round.name.includes('Round 1')) {
      await prisma.round.update({
        where: { id: round.id },
        data: {
          marksPerCorrect: 1,
          marksPerWrong: 0
        }
      });
      console.log('Updated Round 1: +1 for correct, 0 for incorrect');
    } else if (round.name.includes('Round 2')) {
      await prisma.round.update({
        where: { id: round.id },
        data: {
          marksPerCorrect: 1,
          marksPerWrong: 2 // It subtracts this value in the API
        }
      });
      console.log('Updated Round 2: +1 for correct, -2 for incorrect');
    }
  }

  console.log('Successfully updated marking scheme!');
}

updateMarks().catch(console.error).finally(() => prisma.$disconnect());
