import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

// Extend Express Request to include admin user information
declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; username: string; sessionId?: string };
    }
  }
}

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'echona_super_secret') as {
      id: string;
      username: string;
      sessionId?: string;
    };

    // Verify session validity against database
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, activeSessionId: true },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Admin account not found' });
    }

    // If activeSessionId is set on admin record, require token sessionId to match
    if (admin.activeSessionId && decoded.sessionId !== admin.activeSessionId) {
      return res.status(401).json({
        code: 'SESSION_SUPERSEDED',
        error: 'You have been logged out because this admin account was logged into from another device.',
      });
    }

    req.admin = { id: admin.id, username: admin.username, sessionId: decoded.sessionId };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
