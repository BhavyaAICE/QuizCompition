const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('Finding empty quizzes...');
  const quizzes = await prisma.quiz.findMany({
    where: {
      name: 'Jaipur & Bollywood Blast',
    },
    include: {
      rounds: true
    }
  });

  let deletedCount = 0;
  for (const q of quizzes) {
    if (q.rounds.length === 0) {
      await prisma.quiz.delete({
        where: { id: q.id }
      });
      console.log('Deleted empty quiz:', q.id);
      deletedCount++;
    }
  }

  console.log(`Cleanup complete. Deleted ${deletedCount} empty quizzes.`);
}

cleanup().catch(console.error).finally(() => prisma.$disconnect());
