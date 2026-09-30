const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting seed...');
  // Create Quiz
  const quiz = await prisma.quiz.create({
    data: {
      name: 'Jaipur & Bollywood Blast',
      description: 'A fun quiz featuring Jaipur trivia, General Knowledge, and Bollywood madness!',
      status: 'DRAFT',
    }
  });

  console.log('Created Quiz:', quiz.id);

  // Create Participants
  for (let i = 1; i <= 10; i++) {
    const password = 'pass' + i;
    const hash = await bcrypt.hash(password, 10);
    await prisma.participant.create({
      data: {
        username: 'jaipur' + i,
        passwordHash: hash,
        name: 'Player ' + i,
        quizId: quiz.id,
      }
    });
  }
  console.log('Created 10 Participants (jaipur1 to jaipur10, passwords: pass1 to pass10)');

  // Create Round 1
  const r1 = await prisma.round.create({
    data: {
      quizId: quiz.id,
      name: 'Round 1: The Warmup (Jaipur & GK)',
      questionTimer: 30,
      marksPerCorrect: 10,
      marksPerWrong: 0,
    }
  });

  const q1 = [
    { text: "Which fort in Jaipur is known for its artistic Hindu style elements?", options: ["Amber Fort", "Nahargarh Fort", "Jaigarh Fort", "Bhangarh Fort"], correct: 0 },
    { text: "What is the capital city of Rajasthan?", options: ["Udaipur", "Jodhpur", "Jaipur", "Ajmer"], correct: 2 },
    { text: "Who founded the city of Jaipur?", options: ["Maharaja Sawai Jai Singh II", "Maharaja Man Singh", "Maharaja Pratap Singh", "Maharaja Ram Singh"], correct: 0 },
    { text: "Which planet is known as the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], correct: 2 },
    { text: "What is the largest ocean on Earth?", options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"], correct: 3 },
    { text: "Which monument is known as the 'Palace of Winds' in Jaipur?", options: ["City Palace", "Hawa Mahal", "Jal Mahal", "Albert Hall"], correct: 1 },
    { text: "In which year did India gain independence?", options: ["1945", "1947", "1950", "1952"], correct: 1 },
    { text: "Which color represents peace?", options: ["Red", "White", "Blue", "Green"], correct: 1 },
    { text: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2 },
    { text: "What is the traditional sweet of Jaipur famous worldwide?", options: ["Ghevar", "Rasgulla", "Jalebi", "Gulab Jamun"], correct: 0 }
  ];

  for (const q of q1) {
    await prisma.question.create({
      data: {
        roundId: r1.id,
        text: q.text,
        type: 'MULTIPLE_CHOICE',
        options: {
          create: q.options.map((opt, idx) => ({
            text: opt,
            isCorrect: idx === q.correct
          }))
        }
      }
    });
  }
  console.log('Created Round 1 with 10 questions');

  // Create Round 2 (Negative Marking)
  const r2 = await prisma.round.create({
    data: {
      quizId: quiz.id,
      name: 'Round 2: Bollywood & Fun (Negative Marking)',
      questionTimer: 20,
      marksPerCorrect: 15,
      marksPerWrong: -5,
    }
  });

  const q2 = [
    { text: "Who is known as the 'King of Bollywood'?", options: ["Salman Khan", "Shah Rukh Khan", "Aamir Khan", "Amitabh Bachchan"], correct: 1 },
    { text: "Which movie holds the record for the longest-running film in Indian cinema?", options: ["Sholay", "Dilwale Dulhania Le Jayenge", "Lagaan", "Mughal-e-Azam"], correct: 1 },
    { text: "What is the name of Gabbar Singh's den in Sholay?", options: ["Ramgarh", "Sultanpur", "Chambal", "Ramgad"], correct: 0 },
    { text: "Who played the character of 'Circuit' in Munna Bhai M.B.B.S.?", options: ["Arshad Warsi", "Sanjay Dutt", "Boman Irani", "Sunil Shetty"], correct: 0 },
    { text: "Which Bollywood actor is famously called 'Bhaijaan'?", options: ["Shah Rukh Khan", "Ranbir Kapoor", "Salman Khan", "Akshay Kumar"], correct: 2 },
    { text: "If you drop a yellow hat in the Red Sea, what does it become?", options: ["Red", "Wet", "Yellow", "Salty"], correct: 1 },
    { text: "What has keys but can't open locks?", options: ["A map", "A piano", "A computer", "A monkey"], correct: 1 },
    { text: "Which song became a viral internet sensation featuring 'Kolaveri Di'?", options: ["Why This Kolaveri Di", "Rowdy Baby", "Zingaat", "Lungi Dance"], correct: 0 },
    { text: "Who was the director of the movie '3 Idiots'?", options: ["Karan Johar", "Rajkumar Hirani", "Sanjay Leela Bhansali", "Farhan Akhtar"], correct: 1 },
    { text: "What is the national animal of India?", options: ["Lion", "Elephant", "Tiger", "Peacock"], correct: 2 }
  ];

  for (const q of q2) {
    await prisma.question.create({
      data: {
        roundId: r2.id,
        text: q.text,
        type: 'MULTIPLE_CHOICE',
        options: {
          create: q.options.map((opt, idx) => ({
            text: opt,
            isCorrect: idx === q.correct
          }))
        }
      }
    });
  }
  console.log('Created Round 2 with 10 questions and negative marking');

  console.log('DONE!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
