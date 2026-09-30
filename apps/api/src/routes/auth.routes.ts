import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'echona_super_secret';

// Admin Login Route
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const admin = await prisma.admin.findUnique({
    where: { username },
  });

  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '12h' } // Automatic session expiration
  );

  // Set HTTP-only cookie for secure session handling
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 12 * 60 * 60 * 1000 // 12 hours
  });

  res.json({ message: 'Login successful', token });
});

// Admin Logout Route
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('admin_token');
  res.json({ message: 'Logged out successfully' });
});

// Temporary Setup Route: Create initial admin (Should be disabled in production)
router.post('/setup', async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  
  const existingAdmin = await prisma.admin.findFirst();
  if (existingAdmin && process.env.NODE_ENV === 'production') {
     return res.status(403).json({ error: 'Admin already exists. Setup disabled.' });
  }

  const passwordHash = await bcrypt.hash(password || 'echonasecret', 10);

  const admin = await prisma.admin.create({
    data: {
      username: username || 'admin',
      email: email || 'admin@echona.com',
      passwordHash,
    }
  });

  res.status(201).json({ message: 'Admin created', username: admin.username });
});

export default router;
