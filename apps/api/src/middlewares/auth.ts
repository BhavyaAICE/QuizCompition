import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include admin user information
declare global {
  namespace Express {
    interface Request {
      admin?: { id: string; username: string };
    }
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'echona_super_secret') as { id: string; username: string };
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
