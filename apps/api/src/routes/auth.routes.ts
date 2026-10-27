import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

  // Generate unique session ID for single-active-session enforcement
  const sessionId = crypto.randomUUID();

  // Store new activeSessionId in database
  await prisma.admin.update({
    where: { id: admin.id },
    data: { activeSessionId: sessionId },
  });

  // Real-time kickout: disconnect previous admin session(s)
  const io = req.app.get('io');
  if (io) {
    try {
      const adminNs = io.of('/admin');
      adminNs.emit('admin:force_logout', {
        message: 'You have been logged out because this admin account was logged into from another device.',
        newSessionId: sessionId,
      });
      // Terminate any currently open socket connections in /admin
      adminNs.sockets.forEach((s: any) => {
        s.disconnect(true);
      });
    } catch (err) {
      console.error('[Auth] Error notifying previous admin sessions:', err);
    }
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username, sessionId },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  // Set HTTP-only cookie for secure session handling
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
  });

  res.json({ message: 'Login successful', token, sessionId });
});

// Admin Logout Route
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.admin_token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; sessionId?: string };
      if (decoded.id && decoded.sessionId) {
        const admin = await prisma.admin.findUnique({
          where: { id: decoded.id },
          select: { activeSessionId: true }
        });
        if (admin && admin.activeSessionId === decoded.sessionId) {
          await prisma.admin.update({
            where: { id: decoded.id },
            data: { activeSessionId: null },
          });
        }
      }
    } catch {
      // Token expired or invalid, ignore
    }
  }

  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ message: 'Logged out successfully' });
});

// Enforce single admin set: only one set of admin credentials can ever be created
router.post('/setup', async (req: Request, res: Response) => {
  const count = await prisma.admin.count();
  if (count > 0) {
    return res.status(403).json({ error: 'Only one set of admin credentials can be created. An admin account already exists.' });
  }

  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: {
      username,
      email: email || `${username}@echona.com`,
      passwordHash,
    }
  });

  res.status(201).json({ message: 'Admin created successfully', username: admin.username });
});

// Admin registration endpoint (also enforces single admin rule)
router.post('/register', async (req: Request, res: Response) => {
  const count = await prisma.admin.count();
  if (count > 0) {
    return res.status(403).json({ error: 'Only one set of admin credentials can be created. An admin account already exists.' });
  }

  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.admin.create({
    data: {
      username,
      email: email || `${username}@echona.com`,
      passwordHash,
    }
  });

  res.status(201).json({ message: 'Admin created successfully', username: admin.username });
});

// ═══════════════════════════════════════════════════════════════
// ONE-TIME EMERGENCY PASSWORD RESET ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Check status of one-time password reset
router.get('/reset-password/status', async (req: Request, res: Response) => {
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    return res.status(404).json({ available: false, message: 'No admin account found in the system.' });
  }

  if (admin.passwordResetUsed) {
    return res.json({
      available: false,
      message: 'This one-time password reset link has already been used and is permanently disabled.',
      resetAt: admin.passwordResetAt,
    });
  }

  return res.json({
    available: true,
    username: admin.username,
    message: 'One-time password reset is available.',
  });
});

// Execute one-time password reset
router.post('/reset-password', async (req: Request, res: Response) => {
  const admin = await prisma.admin.findFirst();
  if (!admin) {
    return res.status(404).json({ error: 'No admin account found to reset.' });
  }

  if (admin.passwordResetUsed) {
    return res.status(403).json({
      error: 'This one-time password reset link has already been used and is permanently disabled.',
    });
  }

  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  if (confirmPassword && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const passwordHash = await bcrypt.hash(newPassword.trim(), 10);

  // Permanently mark reset as used, update password, and revoke any active sessions
  await prisma.admin.update({
    where: { id: admin.id },
    data: {
      passwordHash,
      passwordResetUsed: true,
      passwordResetAt: new Date(),
      activeSessionId: null,
    },
  });

  // Force-disconnect any active admin sockets
  const io = req.app.get('io');
  if (io) {
    try {
      const adminNs = io.of('/admin');
      adminNs.emit('admin:force_logout', {
        message: 'Admin password has been reset. Please log in with the new credentials.',
      });
      adminNs.sockets.forEach((s: any) => {
        s.disconnect(true);
      });
    } catch (err) {
      console.error('[Auth] Error kicking sockets on password reset:', err);
    }
  }

  // Clear cookie
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });

  return res.json({
    success: true,
    message: 'Password has been reset successfully. The one-time reset is now permanently disabled.',
  });
});

export default router;
