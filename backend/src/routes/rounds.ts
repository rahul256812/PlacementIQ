import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Get rounds for a specific job
router.get('/jobs/:jobId/rounds', authenticate, async (req, res) => {
  try {
    const jobId = req.params.jobId as string;
    const rounds = await prisma.interviewRound.findMany({
      where: { jobId },
      orderBy: { order: 'asc' },
    });
    res.json(rounds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch interview rounds' });
  }
});

// 2. Create / Update rounds for a specific job (Recruiter owner only)
router.post('/jobs/:jobId/rounds', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;
    const { rounds } = req.body; // Array of { title, type, format, description, instructions }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Replace all rounds in a transaction to maintain integrity
    await prisma.$transaction([
      prisma.interviewRound.deleteMany({ where: { jobId } }),
      prisma.interviewRound.createMany({
        data: rounds.map((r: any, index: number) => ({
          jobId,
          title: r.title,
          type: r.type,
          format: r.format,
          description: r.description || null,
          instructions: r.instructions || null,
          order: index
        }))
      })
    ]);

    const updatedRounds = await prisma.interviewRound.findMany({
      where: { jobId },
      orderBy: { order: 'asc' }
    });

    res.json(updatedRounds);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update interview rounds' });
  }
});

// 3. Progress candidate to next round or reject (Recruiter owner only)
router.post('/applications/:applicationId/progress', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const { status, feedback } = req.body; // 'QUALIFIED' or 'REJECTED'

    if (!['QUALIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid progress status' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const application = (await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            rounds: { orderBy: { order: 'asc' } }
          }
        },
        progressions: {
          include: { round: true }
        }
      }
    })) as any;

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const rounds = application.job.rounds;
    if (rounds.length === 0) {
      return res.status(400).json({ error: 'No custom interview rounds defined for this job' });
    }

    // Find the current active progression (PENDING status)
    const activeProgression = application.progressions.find((p: any) => p.status === 'PENDING');
    if (!activeProgression) {
      return res.status(400).json({ error: 'No active round in progress for this candidate' });
    }

    const currentRound = activeProgression.round;

    // Update current round status
    await prisma.candidateProgress.update({
      where: { id: activeProgression.id },
      data: {
        status,
        feedback: feedback || null
      }
    });

    if (status === 'QUALIFIED') {
      // Find the next round
      const nextRound = rounds.find((r: any) => r.order === currentRound.order + 1);
      if (nextRound) {
        // Move to next round
        await prisma.candidateProgress.create({
          data: {
            applicationId,
            roundId: nextRound.id,
            status: 'PENDING'
          }
        });
        return res.json({ message: `Candidate progressed to ${nextRound.title}`, status: 'SHORTLISTED' });
      } else {
        // Final round completed successfully -> Offer extended
        await prisma.application.update({
          where: { id: applicationId },
          data: { status: 'OFFERED' }
        });
        return res.json({ message: 'All rounds completed! Candidate offered.', status: 'OFFERED' });
      }
    } else {
      // Status is REJECTED
      await prisma.application.update({
        where: { id: applicationId },
        data: { status: 'REJECTED' }
      });
      return res.json({ message: 'Candidate rejected from pipeline', status: 'REJECTED' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to progress candidate' });
  }
});

// 4. Get communication channels and messages for a job
router.get('/jobs/:jobId/messages', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;
    const userId = req.user!.id;

    // Determine user role and verify access
    const user = (await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        recruiterProfile: true
      }
    })) as any;

    if (!user) return res.status(404).json({ error: 'User not found' });

    const job = (await prisma.job.findUnique({
      where: { id: jobId },
      include: { rounds: { orderBy: { order: 'asc' } } }
    })) as any;

    if (!job) return res.status(404).json({ error: 'Job not found' });

    let allowedRoundIds: string[] = [];
    let isRecruiter = false;

    if (user.role === 'RECRUITER') {
      if (job.recruiterProfileId !== user.recruiterProfile?.id) {
        return res.status(403).json({ error: 'Unauthorized to view these messages' });
      }
      isRecruiter = true;
      allowedRoundIds = job.rounds.map((r: any) => r.id);
    } else if (user.role === 'STUDENT') {
      const application = (await prisma.application.findFirst({
        where: { jobId, studentProfileId: user.studentProfile?.id },
        include: { progressions: true }
      })) as any;

      if (!application) {
        return res.status(403).json({ error: 'You must apply to this job to view messages' });
      }

      // Student is allowed to access any round channel they have been registered in
      allowedRoundIds = application.progressions.map((p: any) => p.roundId);
    } else if (user.role === 'ADMIN') {
      allowedRoundIds = job.rounds.map((r: any) => r.id);
    }

    // Fetch messages: general (roundId: null) and allowed rounds
    const messages = await prisma.roundMessage.findMany({
      where: {
        jobId,
        OR: [
          { roundId: null },
          { roundId: { in: allowedRoundIds } }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      messages,
      allowedRoundIds,
      isRecruiter
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// 5. Send message / announcement to a channel
router.post('/jobs/:jobId/messages', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;
    const { roundId, content } = req.body; // roundId is null for general announcements
    const userId = req.user!.id;

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Recruiter profile not found' });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized to post announcements' });
    }

    if (roundId) {
      const round = await prisma.interviewRound.findUnique({ where: { id: roundId } });
      if (!round || round.jobId !== jobId) {
        return res.status(400).json({ error: 'Invalid round ID for this job' });
      }
    }

    const senderUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    const senderName = senderUser?.fullName || 'Recruiter';

    const message = await prisma.roundMessage.create({
      data: {
        jobId,
        roundId: roundId || null,
        senderId: userId,
        senderName,
        content
      }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to post message' });
  }
});

export default router;
