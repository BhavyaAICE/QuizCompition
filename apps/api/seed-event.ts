import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log("Creating quiz and round...");
  
  const quiz = await prisma.quiz.create({
    data: {
      name: "Pirate Expedition Trial",
      description: "A quick 3-minute challenge",
      eventName: "Echona Voyage Phase 3",
      status: "ACTIVE"
    }
  });

  const round = await prisma.round.create({
    data: {
      name: "Stage 1",
      quizId: quiz.id,
      overallTimer: 180, // 3 minutes
      status: "ACTIVE", 
      allowQuestionNav: true
    }
  });

  console.log("Creating question...");
  await prisma.question.create({
    data: {
      text: "Which of these legendary pirate ships was captained by Blackbeard?",
      roundId: round.id,
      marks: 10,
      options: {
        create: [
          { text: "Queen Anne's Revenge", isCorrect: true },
          { text: "The Black Pearl", isCorrect: false },
          { text: "The Jolly Roger", isCorrect: false },
          { text: "The Flying Dutchman", isCorrect: false }
        ]
      }
    }
  });

  console.log("Creating participant...");
  const passwordHash = await bcrypt.hash('password123', 10);

  const participant = await prisma.participant.create({
    data: {
      username: "captain1",
      plainPassword: "password123",
      passwordHash,
      name: "Captain Jack",
      quizId: quiz.id
    }
  });

  console.log("\n==================================");
  console.log("SUCCESS! Seeding finished!");
  console.log("Participant Username :", participant.username);
  console.log("Participant Password :", participant.plainPassword);
  console.log("Time Limit           : 3 minutes");
  console.log("==================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
