import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middlewares/auth';
import { prisma } from '../db';
import bcrypt from 'bcrypt';

const router = Router();
router.use(requireAdmin);

// ═══════════════════════════════════════════════════════
// QUIZ CRUD
// ═══════════════════════════════════════════════════════

// List all quizzes
router.get('/', async (req: Request, res: Response) => {
  const quizzes = await prisma.quiz.findMany({
    include: { 
      rounds: { orderBy: { createdAt: 'asc' } },
      _count: { select: { participants: true, rounds: true } } 
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(quizzes);
});

// Get a single quiz by ID
router.get('/:id', async (req: Request, res: Response) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: String(req.params.id) },
    include: {
      rounds: { orderBy: { createdAt: 'asc' } },
      _count: { select: { participants: true } },
    },
  });
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  res.json(quiz);
});

// Create a quiz
router.post('/', async (req: Request, res: Response) => {
  const { name, description, eventName, startDate, endDate, maxParticipants, instructions } = req.body;
  const quiz = await prisma.quiz.create({
    data: { name, description, eventName, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null, maxParticipants, instructions },
  });
  res.status(201).json(quiz);
});

// Update a quiz
router.put('/:id', async (req: Request, res: Response) => {
  const { name, description, eventName, status, startDate, endDate, maxParticipants, instructions } = req.body;
  const quiz = await prisma.quiz.update({
    where: { id: String(req.params.id) },
    data: { name, description, eventName, status, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, maxParticipants, instructions },
  });
  res.json(quiz);
});

// Delete a quiz (cascades via Prisma)
router.delete('/:id', async (req: Request, res: Response) => {
  const quizId = String(req.params.id);
  const rounds = await prisma.round.findMany({ where: { quizId }, select: { id: true } });
  const roundIds = rounds.map((r: any) => r.id);

  // Delete in reverse dependency order
  await prisma.answer.deleteMany({ where: { question: { roundId: { in: roundIds } } } });
  await prisma.participantSession.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.score.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.questionOption.deleteMany({ where: { question: { roundId: { in: roundIds } } } });
  await prisma.question.deleteMany({ where: { roundId: { in: roundIds } } });
  await prisma.round.deleteMany({ where: { quizId } });
  await prisma.participant.deleteMany({ where: { quizId } });
  await prisma.quiz.delete({ where: { id: quizId } });

  // Notify participants to log out since quiz is abandoned
  const io = req.app.get('io');
  if (io) {
    io.of('/participant').to(`quiz:${quizId}`).emit('quiz:abandoned');
  }

  res.json({ message: 'Quiz deleted' });
});

// ═══════════════════════════════════════════════════════
// ROUND CRUD
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// ROUND CRUD
// ═══════════════════════════════════════════════════════

router.get('/:quizId/rounds', async (req: Request, res: Response) => {
  const rounds = await prisma.round.findMany({
    where: { quizId: String(req.params.quizId) },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(rounds);
});

router.post('/:quizId/rounds', async (req: Request, res: Response) => {
  const {
    name, description, questionTimer, overallTimer, marksPerCorrect, marksPerWrong,
    maxQuestions, randomizeQuestions, randomizeOptions, allowQuestionNav, allowPrevQuestion,
  } = req.body;

  const round = await prisma.round.create({
    data: {
      name, description, quizId: String(req.params.quizId),
      questionTimer, overallTimer, marksPerCorrect, marksPerWrong, maxQuestions,
      randomizeQuestions, randomizeOptions, allowQuestionNav, allowPrevQuestion,
    },
  });
  res.status(201).json(round);
});

router.put('/rounds/:id', async (req: Request, res: Response) => {
  const {
    name, description, status, questionTimer, overallTimer, marksPerCorrect, marksPerWrong,
    maxQuestions, randomizeQuestions, randomizeOptions, allowQuestionNav, allowPrevQuestion,
    scheduledStartTime,
  } = req.body;

  const round = await prisma.round.update({
    where: { id: String(req.params.id) },
    data: {
      name, description, status, questionTimer, overallTimer, marksPerCorrect, marksPerWrong,
      maxQuestions, randomizeQuestions, randomizeOptions, allowQuestionNav, allowPrevQuestion,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : undefined,
    },
  });
  res.json(round);
});

router.delete('/rounds/:id', async (req: Request, res: Response) => {
  await prisma.answer.deleteMany({ where: { question: { roundId: String(req.params.roundId) } } });
  await prisma.participantSession.deleteMany({ where: { roundId: String(req.params.roundId) } });
  await prisma.score.deleteMany({ where: { roundId: String(req.params.roundId) } });
  await prisma.questionOption.deleteMany({ where: { question: { roundId: String(req.params.roundId) } } });
  await prisma.question.deleteMany({ where: { roundId: String(req.params.roundId) } });
  await prisma.round.delete({ where: { id: String(req.params.id) } });
  res.json({ message: 'Round deleted' });
});

// ═══════════════════════════════════════════════════════
// QUESTION CRUD
// ═══════════════════════════════════════════════════════

router.get('/rounds/:roundId/questions', async (req: Request, res: Response) => {
  const questions = await prisma.question.findMany({
    where: { roundId: String(req.params.roundId) },
    include: { options: true },
    orderBy: { createdAt: 'asc' },
  });
  res.json(questions);
});

router.post('/rounds/:roundId/questions', async (req: Request, res: Response) => {
  const { text, type, marks, negativeMarks, explanation, options } = req.body;

  const question = await prisma.question.create({
    data: {
      text, type: type || 'MCQ', marks, negativeMarks, explanation,
      roundId: String(req.params.roundId),
      options: {
        create: (options || []).map((opt: { text: string; isCorrect: boolean }) => ({
          text: opt.text,
          isCorrect: opt.isCorrect || false,
        })),
      },
    },
    include: { options: true },
  });
  res.status(201).json(question);
});

// Bulk import questions (for Excel import support)
router.post('/rounds/:roundId/questions/bulk', async (req: Request, res: Response) => {
  const { questions } = req.body; // Array of { text, type, marks, negativeMarks, explanation, options: [{text, isCorrect}] }

  const created = [];
  for (const q of questions) {
    const question = await prisma.question.create({
      data: {
        text: q.text,
        type: q.type || 'MCQ',
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        explanation: q.explanation,
        roundId: String(req.params.roundId),
        options: {
          create: (q.options || []).map((opt: { text: string; isCorrect: boolean }) => ({
            text: opt.text,
            isCorrect: opt.isCorrect || false,
          })),
        },
      },
      include: { options: true },
    });
    created.push(question);
  }

  res.status(201).json({ message: `${created.length} questions imported`, questions: created });
});

router.put('/questions/:id', async (req: Request, res: Response) => {
  const { text, type, marks, negativeMarks, explanation, options } = req.body;

  // Update question text/metadata
  const question = await prisma.question.update({
    where: { id: String(req.params.id) },
    data: { text, type, marks, negativeMarks, explanation },
  });

  // If options are provided, replace them entirely
  if (options) {
    await prisma.questionOption.deleteMany({ where: { questionId: String(req.params.questionId) } });
    await prisma.questionOption.createMany({
      data: options.map((opt: { text: string; isCorrect: boolean }) => ({
        text: opt.text,
        isCorrect: opt.isCorrect || false,
        questionId: String(req.params.questionId),
      })),
    });
  }

  const updated = await prisma.question.findUnique({
    where: { id: String(req.params.id) },
    include: { options: true },
  });
  res.json(updated);
});

router.delete('/questions/:id', async (req: Request, res: Response) => {
  await prisma.answer.deleteMany({ where: { questionId: String(req.params.questionId) } });
  await prisma.questionOption.deleteMany({ where: { questionId: String(req.params.questionId) } });
  await prisma.question.delete({ where: { id: String(req.params.id) } });
  res.json({ message: 'Question deleted' });
});

// ═══════════════════════════════════════════════════════
// PARTICIPANT MANAGEMENT
// ═══════════════════════════════════════════════════════

router.get('/:quizId/participants', async (req: Request, res: Response) => {
  // Use raw SQL to bypass Prisma Client cache just in case the client wasn't regenerated properly
  const participants = await prisma.$queryRaw`SELECT * FROM "Participant" WHERE "quizId" = ${String(req.params.quizId)} ORDER BY "createdAt" ASC`;
  res.json(participants);
});

// Single participant creation
router.post('/:quizId/participants', async (req: Request, res: Response) => {
  const { username, password, name, college, email, phone } = req.body;

  const passwordHash = await bcrypt.hash(password || 'echona2025', 10);
  const participant = await prisma.participant.create({
    data: {
      username, passwordHash, plainPassword: password || 'echona2025', name, college, email, phone,
      quizId: String(req.params.quizId),
    },
  });
  res.status(201).json(participant);
});

// Bulk import participants (for Excel import)
router.post('/:quizId/participants/bulk', async (req: Request, res: Response) => {
  const { participants } = req.body; // Array of { username, password, name, college, email, phone }

  const created = [];
  for (const p of participants) {
    const passwordHash = await bcrypt.hash(p.password || 'echona2025', 10);
    try {
      const participant = await prisma.participant.create({
        data: {
          username: p.username,
          passwordHash,
          plainPassword: p.password || 'echona2025',
          name: p.name,
          college: p.college,
          email: p.email,
          phone: p.phone,
          quizId: String(req.params.quizId),
        },
      });
      created.push({ success: true, username: p.username, id: participant.id });
    } catch (err: any) {
      created.push({ success: false, username: p.username, error: err.message });
    }
  }

  res.status(201).json({ total: participants.length, created: created.filter(c => c.success).length, results: created });
});

// Update participant status (eliminate, qualify, etc.)
router.put('/participants/:id', async (req: Request, res: Response) => {
  const { status, name, college, email, phone } = req.body;
  const participant = await prisma.participant.update({
    where: { id: String(req.params.id) },
    data: { status, name, college, email, phone },
  });
  res.json(participant);
});

router.delete('/participants/:id', async (req: Request, res: Response) => {
  await prisma.answer.deleteMany({ where: { participantId: String(req.params.participantId) } });
  await prisma.score.deleteMany({ where: { participantId: String(req.params.participantId) } });
  await prisma.participantSession.deleteMany({ where: { participantId: String(req.params.participantId) } });
  await prisma.participant.delete({ where: { id: String(req.params.id) } });
  res.json({ message: 'Participant deleted' });
});

// ═══════════════════════════════════════════════════════
// SCOREBOARD & RESULTS
// ═══════════════════════════════════════════════════════

router.get('/rounds/:roundId/scoreboard', async (req: Request, res: Response) => {
  const scores = await prisma.score.findMany({
    where: { roundId: String(req.params.roundId) },
    include: { participant: { select: { id: true, username: true, name: true, college: true, status: true } } },
    orderBy: { totalScore: 'desc' },
  });
  res.json(scores);
});

// Manually set qualification status for a participant in a round
router.put('/scores/:scoreId', async (req: Request, res: Response) => {
  const { qualificationStatus } = req.body;
  const score = await prisma.score.update({
    where: { id: String(req.params.scoreId) },
    data: { qualificationStatus },
  });
  res.json(score);
});

// Bulk qualify/eliminate based on top N or cutoff score
router.post('/rounds/:roundId/evaluate', async (req: Request, res: Response) => {
  const { topN, cutoffScore } = req.body;

  const scores = await prisma.score.findMany({
    where: { roundId: String(req.params.roundId) },
    orderBy: { totalScore: 'desc' },
  });

  let qualified = 0;
  let eliminated = 0;

  for (let i = 0; i < scores.length; i++) {
    let status = 'ELIMINATED';
    if (topN && i < topN) {
      status = 'QUALIFIED';
    } else if (cutoffScore !== undefined && scores[i].totalScore >= cutoffScore) {
      status = 'QUALIFIED';
    }

    await prisma.score.update({
      where: { id: scores[i].id },
      data: { qualificationStatus: status },
    });

    // Also update participant status
    await prisma.participant.update({
      where: { id: scores[i].participantId },
      data: { status: status === 'QUALIFIED' ? 'QUALIFIED' : 'ELIMINATED' },
    });

    if (status === 'QUALIFIED') qualified++;
    else eliminated++;
  }

  // Notify participants to refresh their screens
  const io = req.app.get('io');
  if (io) {
    const round = await prisma.round.findUnique({ where: { id: String(req.params.roundId) } });
    if (round) {
      io.of('/participant').to(`quiz:${round.quizId}`).emit('round:ended', { roundId: round.id });
    }
  }

  res.json({ message: 'Evaluation complete', qualified, eliminated });
});

export default router;
