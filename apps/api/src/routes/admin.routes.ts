import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middlewares/auth';
import { prisma } from '../db';

const router = Router();

// Protect all routes in this router with requireAdmin
router.use(requireAdmin);

// Dashboard Overview (Phase 20)
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const totalQuizzes = await prisma.quiz.count();
    const totalParticipants = await prisma.participant.count();
    
    // For now, return basic stats
    res.json({
      message: 'Welcome to the Echona Command Center',
      admin: req.admin,
      stats: {
        totalQuizzes,
        totalParticipants
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Phase 4: Quiz Management (Placeholder for now)
router.get('/quizzes', async (req: Request, res: Response) => {
  const quizzes = await prisma.quiz.findMany();
  res.json(quizzes);
});

export default router;
