import { Server, Socket } from 'socket.io';
import { prisma } from './db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'echona_super_secret';

export function setupSocketHandlers(io: Server) {
  // ─── Admin Namespace ───
  const adminNs = io.of('/admin');

  adminNs.use((socket, next) => {
    let token = socket.handshake.auth?.token;
    
    // Fallback to cookie if auth payload is missing
    if (!token && socket.request.headers.cookie) {
      const cookies = socket.request.headers.cookie.split(';').reduce((acc: any, cookie: string) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      token = cookies['admin_token'];
    }

    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string };
      (socket as any).admin = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  adminNs.on('connection', (socket: Socket) => {
    console.log(`[Admin Socket] ${(socket as any).admin.username} connected`);

    // Start a round
    socket.on('round:start', async (data: { roundId: string }) => {
      try {
        const round = await prisma.round.update({
          where: { id: data.roundId },
          data: { status: 'ACTIVE' },
          include: { quiz: true },
        });

        // Notify all participants in this quiz
        io.of('/participant').to(`quiz:${round.quizId}`).emit('round:started', {
          roundId: round.id,
          name: round.name,
          questionTimer: round.questionTimer,
          overallTimer: round.overallTimer,
        });

        adminNs.emit('round:updated', round);
        console.log(`[Admin] Round "${round.name}" started for quiz ${round.quiz.name}`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to start round' });
      }
    });

    // Pause a round
    socket.on('round:pause', async (data: { roundId: string }) => {
      try {
        const round = await prisma.round.update({
          where: { id: data.roundId },
          data: { status: 'PAUSED' },
        });

        io.of('/participant').to(`quiz:${round.quizId}`).emit('round:paused', { roundId: round.id });
        adminNs.emit('round:updated', round);
      } catch (err) {
        socket.emit('error', { message: 'Failed to pause round' });
      }
    });

    // Resume a round
    socket.on('round:resume', async (data: { roundId: string }) => {
      try {
        const round = await prisma.round.update({
          where: { id: data.roundId },
          data: { status: 'ACTIVE' },
        });

        io.of('/participant').to(`quiz:${round.quizId}`).emit('round:resumed', { roundId: round.id });
        adminNs.emit('round:updated', round);
      } catch (err) {
        socket.emit('error', { message: 'Failed to resume round' });
      }
    });

    // End a round
    socket.on('round:end', async (data: { roundId: string }) => {
      try {
        const round = await prisma.round.update({
          where: { id: data.roundId },
          data: { status: 'COMPLETED' },
        });

        // Force-submit any participants who haven't submitted yet
        await prisma.participantSession.updateMany({
          where: { roundId: data.roundId, status: 'ACTIVE' },
          data: { status: 'SUBMITTED', endTime: new Date() },
        });

        // Calculate scores for any un-scored participants
        const sessions = await prisma.participantSession.findMany({
          where: { roundId: data.roundId },
        });

        for (const session of sessions) {
          const answers = await prisma.answer.findMany({
            where: { participantId: session.participantId, question: { roundId: data.roundId } },
          });
          const totalScore = answers.reduce((sum: number, a: any) => sum + a.marksAwarded, 0);

          await prisma.score.upsert({
            where: {
              participantId_roundId: {
                participantId: session.participantId,
                roundId: data.roundId,
              },
            },
            update: { totalScore },
            create: {
              participantId: session.participantId,
              roundId: data.roundId,
              totalScore,
            },
          });
        }

        io.of('/participant').to(`quiz:${round.quizId}`).emit('round:ended', { roundId: round.id });
        adminNs.emit('round:updated', round);
        console.log(`[Admin] Round "${round.name}" ended`);
      } catch (err) {
        socket.emit('error', { message: 'Failed to end round' });
      }
    });

    // Get live stats for a round
    socket.on('round:stats', async (data: { roundId: string }) => {
      const totalParticipants = await prisma.participantSession.count({
        where: { roundId: data.roundId },
      });
      const submitted = await prisma.participantSession.count({
        where: { roundId: data.roundId, status: 'SUBMITTED' },
      });
      const active = await prisma.participantSession.count({
        where: { roundId: data.roundId, status: 'ACTIVE' },
      });

      socket.emit('round:stats', { roundId: data.roundId, totalParticipants, submitted, active });
    });

    socket.on('disconnect', () => {
      console.log(`[Admin Socket] ${(socket as any).admin.username} disconnected`);
    });
  });

  // ─── Participant Namespace ───
  const participantNs = io.of('/participant');

  participantNs.use((socket, next) => {
    let token = socket.handshake.auth?.token;
    
    // Fallback to cookie if auth payload is missing
    if (!token && socket.request.headers.cookie) {
      const cookies = socket.request.headers.cookie.split(';').reduce((acc: any, cookie: string) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      token = cookies['participant_token'];
    }

    if (!token) return next(new Error('No token'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; quizId: string };
      (socket as any).participant = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  participantNs.on('connection', async (socket: Socket) => {
    const p = (socket as any).participant;
    console.log(`[Participant Socket] ${p.username} connected`);

    // Join quiz room for targeted events
    socket.join(`quiz:${p.quizId}`);

    // Update lastActiveAt and restore DISCONNECTED sessions
    await prisma.participantSession.updateMany({
      where: { 
        participantId: p.id, 
        status: { in: ['ACTIVE', 'DISCONNECTED'] } 
      },
      data: { 
        status: 'ACTIVE',
        lastActiveAt: new Date() 
      },
    });

    // In-memory tracker for throttling DB writes on heartbeat
    // We only write to the DB at most once every 15 seconds per participant
    const lastDbUpdate = (socket as any).lastDbUpdate || 0;

    socket.on('heartbeat', async () => {
      const now = Date.now();
      if (now - lastDbUpdate > 15000) {
        (socket as any).lastDbUpdate = now;
        try {
          await prisma.participantSession.updateMany({
            where: { participantId: p.id, status: 'ACTIVE' },
            data: { lastActiveAt: new Date() },
          });
        } catch (err) {
          console.error(`[Heartbeat Error] ${p.username}:`, err);
        }
      }
    });

    socket.on('disconnect', async () => {
      console.log(`[Participant Socket] ${p.username} disconnected`);
      // Mark sessions as disconnected if they were active
      await prisma.participantSession.updateMany({
        where: { participantId: p.id, status: 'ACTIVE' },
        data: { status: 'DISCONNECTED' },
      });

      // Notify admin
      adminNs.emit('participant:disconnected', { participantId: p.id, username: p.username });
    });
  });
}
