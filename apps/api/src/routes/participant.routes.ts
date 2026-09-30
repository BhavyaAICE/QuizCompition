import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'echona_super_secret';

// Middleware to verify participant token
const requireParticipant = (req: Request, res: Response, next: Function) => {
  const token = req.cookies?.participant_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; quizId: string };
    (req as any).participant = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ═══════════════════════════════════════════════════════
// PARTICIPANT AUTH
// ═══════════════════════════════════════════════════════

router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const participant = await prisma.participant.findUnique({
    where: { username },
    include: { quiz: true },
  });

  if (!participant) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, participant.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (participant.status === 'ELIMINATED') {
    return res.status(403).json({ error: 'You have been eliminated from this quiz' });
  }

  const token = jwt.sign(
    { id: participant.id, username: participant.username, quizId: participant.quizId },
    JWT_SECRET,
    { expiresIn: '6h' }
  );

  res.cookie('participant_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 6 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Login successful',
    token,
    participant: {
      id: participant.id,
      username: participant.username,
      name: participant.name,
      status: participant.status,
      quiz: participant.quiz.name,
    },
  });
});

router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('participant_token');
  res.json({ message: 'Logged out' });
});

// ═══════════════════════════════════════════════════════
// GET CURRENT STATUS / PROFILE
// ═══════════════════════════════════════════════════════

router.get('/me', requireParticipant, async (req: Request, res: Response) => {
  const p = (req as any).participant;
  const participant = await prisma.participant.findUnique({
    where: { id: p.id },
    include: {
      quiz: true,
      scores: { include: { round: { select: { id: true, name: true } } } },
    },
  });

  if (!participant) return res.status(404).json({ error: 'Participant not found' });

  res.json({
    id: participant.id,
    username: participant.username,
    name: participant.name,
    college: participant.college,
    status: participant.status,
    quiz: participant.quiz.name,
    scores: participant.scores,
  });
});

// ═══════════════════════════════════════════════════════
// GET ACTIVE ROUND (what the participant should be doing right now)
// ═══════════════════════════════════════════════════════

router.get('/active-round', requireParticipant, async (req: Request, res: Response) => {
  const p = (req as any).participant;

  // Check if participant is still active
  const participant = await prisma.participant.findUnique({ where: { id: p.id } });
  if (!participant || participant.status === 'ELIMINATED') {
    return res.status(403).json({ error: 'You have been eliminated', status: 'ELIMINATED' });
  }

  // Find the active round for this participant's branch
  const activeRound = await prisma.round.findFirst({
    where: {
      quizId: p.quizId,
      status: 'ACTIVE',
    },
    include: {
      _count: { select: { questions: true } },
    },
  });

  if (!activeRound) {
    return res.json({ status: 'WAITING', message: 'No active round. Please wait for the admin to start the next round.' });
  }

  // Check if participant already has a session for this round
  let session = await prisma.participantSession.findFirst({
    where: { participantId: p.id, roundId: activeRound.id },
  });

  // If no session, create one (participant just joined this round)
  if (!session) {
    session = await prisma.participantSession.create({
      data: {
        participantId: p.id,
        roundId: activeRound.id,
      },
    });
  }

  // Check if already submitted
  if (session.status === 'SUBMITTED') {
    return res.json({ status: 'SUBMITTED', message: 'You have already submitted this round. Waiting for results.' });
  }

  // If session was marked disconnected by socket disconnect, mark it active again
  if (session.status === 'DISCONNECTED') {
    session = await prisma.participantSession.update({
      where: { id: session.id },
      data: { status: 'ACTIVE', lastActiveAt: new Date() },
    });
  }

  res.json({
    status: 'ACTIVE',
    round: {
      id: activeRound.id,
      name: activeRound.name,
      description: activeRound.description,
      questionTimer: activeRound.questionTimer,
      overallTimer: activeRound.overallTimer,
      totalQuestions: activeRound._count.questions,
      allowQuestionNav: activeRound.allowQuestionNav,
      allowPrevQuestion: activeRound.allowPrevQuestion,
    },
    session: {
      id: session.id,
      startTime: session.startTime,
    },
  });
});

// ═══════════════════════════════════════════════════════
// GET QUESTIONS FOR ACTIVE ROUND
// ═══════════════════════════════════════════════════════

router.get('/rounds/:roundId/questions', requireParticipant, async (req: Request, res: Response) => {
  const p = (req as any).participant;

  // Verify the round is active and belongs to participant's branch
  const round = await prisma.round.findFirst({
    where: { id: String(req.params.roundId), quizId: p.quizId, status: 'ACTIVE' },
  });

  if (!round) return res.status(403).json({ error: 'Round not available' });

  // Verify participant has an active session
  const session = await prisma.participantSession.findFirst({
    where: { participantId: p.id, roundId: round.id, status: 'ACTIVE' },
  });
  if (!session) return res.status(403).json({ error: 'No active session for this round' });

  let questions = await prisma.question.findMany({
    where: { roundId: round.id },
    include: {
      options: { select: { id: true, text: true } }, // Don't send isCorrect!
    },
    orderBy: { createdAt: 'asc' },
  });

  // Randomize questions if configured
  if (round.randomizeQuestions) {
    questions = questions.sort(() => Math.random() - 0.5);
  }

  // Randomize options if configured
  if (round.randomizeOptions) {
    questions = questions.map((q: any) => ({
      ...q,
      options: q.options.sort(() => Math.random() - 0.5),
    }));
  }

  // Get already submitted answers for this round
  const existingAnswers = await prisma.answer.findMany({
    where: { participantId: p.id, questionId: { in: questions.map((q: any) => q.id) } },
    select: { questionId: true, selectedOptionId: true },
  });

  const answersMap: Record<string, string | null> = {};
  existingAnswers.forEach((a: any) => { answersMap[a.questionId] = a.selectedOptionId; });

  res.json({
    questions: questions.map((q: any) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      options: q.options,
      selectedOptionId: answersMap[q.id] || null,
    })),
  });
});

// ═══════════════════════════════════════════════════════
// SUBMIT ANSWER (single question)
// ═══════════════════════════════════════════════════════

router.post('/answer', requireParticipant, async (req: Request, res: Response) => {
  const p = (req as any).participant;
  const { questionId, selectedOptionId } = req.body;

  // Verify participant is active
  const participant = await prisma.participant.findUnique({ where: { id: p.id } });
  if (!participant || participant.status === 'ELIMINATED') {
    return res.status(403).json({ error: 'Eliminated' });
  }

  // Verify the question exists and round is active
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { round: true, options: true },
  });

  if (!question || question.round.status !== 'ACTIVE' || question.round.quizId !== p.quizId) {
    return res.status(403).json({ error: 'Question not available' });
  }

  // Check if session is active
  const session = await prisma.participantSession.findFirst({
    where: { participantId: p.id, roundId: question.roundId, status: 'ACTIVE' },
  });
  if (!session) return res.status(403).json({ error: 'No active session' });

  // Find correct option
  const correctOption = question.options.find((o: any) => o.isCorrect);
  const isCorrect = selectedOptionId === correctOption?.id;
  const marksAwarded = isCorrect
    ? (question.marks || question.round.marksPerCorrect || 1)
    : -(question.negativeMarks || question.round.marksPerWrong || 0);

  // Upsert: If already answered, update; otherwise create
  const existingAnswer = await prisma.answer.findFirst({
    where: { participantId: p.id, questionId },
  });

  if (existingAnswer) {
    await prisma.answer.update({
      where: { id: existingAnswer.id },
      data: { selectedOptionId, isCorrect, marksAwarded, submittedAt: new Date() },
    });
  } else {
    await prisma.answer.create({
      data: {
        participantId: p.id,
        questionId,
        selectedOptionId,
        isCorrect,
        marksAwarded,
      },
    });
  }

  res.json({ message: 'Answer saved', isCorrect });
});

// ═══════════════════════════════════════════════════════
// SUBMIT ROUND (finalize all answers)
// ═══════════════════════════════════════════════════════

router.post('/rounds/:roundId/submit', requireParticipant, async (req: Request, res: Response) => {
  const p = (req as any).participant;

  // Mark session as submitted
  const session = await prisma.participantSession.findFirst({
    where: { participantId: p.id, roundId: String(req.params.roundId), status: 'ACTIVE' },
  });

  if (!session) return res.status(403).json({ error: 'No active session to submit' });

  await prisma.participantSession.update({
    where: { id: session.id },
    data: { status: 'SUBMITTED', endTime: new Date() },
  });

  // Calculate total score for this round
  const answers = await prisma.answer.findMany({
    where: { participantId: p.id, question: { roundId: String(req.params.roundId) } },
  });

  const totalScore = answers.reduce((sum: number, a: any) => sum + a.marksAwarded, 0);

  // Upsert score record
  const existingScore = await prisma.score.findFirst({
    where: { participantId: p.id, roundId: String(req.params.roundId) },
  });

  if (existingScore) {
    await prisma.score.update({
      where: { id: existingScore.id },
      data: { totalScore },
    });
  } else {
    await prisma.score.create({
      data: {
        participantId: p.id,
        roundId: String(req.params.roundId),
        totalScore,
      },
    });
  }

  res.json({ message: 'Round submitted', totalScore });
});

export default router;
