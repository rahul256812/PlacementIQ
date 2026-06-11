import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { runCode } from '../utils/codeRunner';

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

    const existingRounds = await prisma.interviewRound.findMany({
      where: { jobId }
    });

    const newRounds = rounds || [];
    const newRoundIds = newRounds.map((r: any) => r.id).filter(Boolean);

    // 1. Delete rounds that are no longer in the list
    const roundsToDelete = existingRounds.filter(
      (er) => !newRoundIds.includes(er.id)
    );
    if (roundsToDelete.length > 0) {
      await prisma.interviewRound.deleteMany({
        where: { id: { in: roundsToDelete.map((r) => r.id) } }
      });
    }

    // 2. Create or update each round in the new list to maintain order and keep existing IDs
    for (let index = 0; index < newRounds.length; index++) {
      const r = newRounds[index];
      const roundData = {
        jobId,
        title: r.title,
        type: r.type,
        format: r.format,
        description: r.description || null,
        instructions: r.instructions || null,
        order: index,
        startDate: r.startDate ? new Date(r.startDate) : null,
        endDate: r.endDate ? new Date(r.endDate) : null
      };

      if (r.id && existingRounds.some((er) => er.id === r.id)) {
        await prisma.interviewRound.update({
          where: { id: r.id },
          data: roundData
        });
      } else {
        await prisma.interviewRound.create({
          data: roundData
        });
      }
    }

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

// Update candidate round meeting link (Recruiter owner only)
router.post('/applications/:applicationId/rounds/:roundId/meet-link', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const roundId = req.params.roundId as string;
    const { meetLink, isMeetLinkPublished } = req.body;

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true
      }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.candidateProgress.update({
      where: {
        applicationId_roundId: { applicationId, roundId }
      },
      data: {
        meetLink: meetLink || null,
        isMeetLinkPublished: isMeetLinkPublished ?? false
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update meeting link' });
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
    if (!job.isOpen) {
      return res.status(400).json({ error: 'Recruiting is currently on hold. Communication is paused.' });
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

// Setup MCQ Questions
router.post('/rounds/:roundId/mcqs', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const { questions, mcqDuration } = req.body;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.$transaction([
      prisma.interviewRound.update({
        where: { id: roundId },
        data: { mcqDuration: mcqDuration !== undefined && mcqDuration !== null ? Number(mcqDuration) : null }
      }),
      prisma.mcqQuestion.deleteMany({ where: { roundId } }),
      prisma.mcqQuestion.createMany({
        data: questions.map((q: any) => ({
          roundId,
          questionText: q.questionText,
          imageBlob: q.imageBlob || null,
          type: q.type || 'SINGLE',
          options: q.options,
          correctAnswers: q.correctAnswers,
          marks: q.marks !== undefined ? Number(q.marks) : 1,
          duration: q.duration !== undefined && q.duration !== null && q.duration !== "" ? Number(q.duration) : null
        }))
      })
    ]);

    const updatedQuestions = await prisma.mcqQuestion.findMany({
      where: { roundId: roundId as string },
      orderBy: { createdAt: 'asc' }
    });

    res.json(updatedQuestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update MCQ questions' });
  }
});

// Publish MCQ Test
router.post('/rounds/:roundId/mcq-publish', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedRound = await prisma.interviewRound.update({
      where: { id: roundId },
      data: { isMcqPublished: true }
    });

    res.json(updatedRound);
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish MCQ test' });
  }
});

// Release MCQ Test Results
router.post('/rounds/:roundId/mcq-release-results', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedRound = await prisma.interviewRound.update({
      where: { id: roundId },
      data: { isMcqResultReleased: true }
    });

    res.json(updatedRound);
  } catch (error) {
    res.status(500).json({ error: 'Failed to release MCQ results' });
  }
});

// Fetch MCQ questions for a round
router.get('/rounds/:roundId/mcqs', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { recruiterProfile: true, studentProfile: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    if (user.role === 'STUDENT') {
      if (!round.isMcqPublished) {
        return res.status(403).json({ error: 'MCQ test is not published yet' });
      }

      const now = new Date();
      if (round.startDate && now < new Date(round.startDate)) {
        return res.status(403).json({ error: 'This round has not started yet' });
      }
      if (round.endDate && now > new Date(round.endDate)) {
        return res.status(403).json({ error: 'This round has already closed' });
      }

      const application = await prisma.application.findFirst({
        where: { jobId: round.jobId, studentProfileId: user.studentProfile?.id },
        include: { progressions: true }
      });

      if (!application) {
        return res.status(403).json({ error: 'You have not applied to this job' });
      }

      const inRound = application.progressions.some((p: any) => p.roundId === roundId);
      if (!inRound) {
        return res.status(403).json({ error: 'You are not active in this interview round' });
      }
    }

    const questions = await prisma.mcqQuestion.findMany({
      where: { roundId: roundId as string },
      orderBy: { createdAt: 'asc' }
    });

    if (user.role === 'STUDENT') {
      const sanitized = questions.map((q: any) => {
        const { correctAnswers, ...rest } = q;
        return rest;
      });
      return res.json(sanitized);
    }

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch MCQ questions' });
  }
});

router.post('/applications/:applicationId/rounds/:roundId/mcq-submit', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const roundId = req.params.roundId as string;
    const { answers, timeTaken } = req.body;
    const userId = req.user!.id;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId }
    });
    if (!studentProfile) return res.status(404).json({ error: 'Student profile not found' });

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { progressions: true }
    }) as any;
    if (!application || application.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'Unauthorized to submit' });
    }

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId }
    });
    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const now = new Date();
    if (round.startDate && now < new Date(round.startDate)) {
      return res.status(403).json({ error: 'This round has not started yet' });
    }
    if (round.endDate && now > new Date(round.endDate)) {
      return res.status(403).json({ error: 'This round has already closed' });
    }

    const progression = application.progressions.find((p: any) => p.roundId === roundId && p.status === 'PENDING');
    if (!progression) {
      return res.status(400).json({ error: 'No active pending round progression found' });
    }

    const questions = await prisma.mcqQuestion.findMany({
      where: { roundId: roundId as string }
    });

    let totalScore = 0;
    let totalPossibleMarks = 0;

    questions.forEach((q: any) => {
      totalPossibleMarks += q.marks;
      const studentAnswers = answers[q.id] || [];
      const correctAnswers = q.correctAnswers as number[];
      
      const isCorrect = (
        studentAnswers.length === correctAnswers.length &&
        studentAnswers.every((val: number) => correctAnswers.includes(val))
      );

      if (isCorrect) {
        totalScore += q.marks;
      }
    });

    const response = await prisma.candidateMcqResponse.create({
      data: {
        candidateProgressId: progression.id,
        answers,
        score: totalScore,
        totalPossibleMarks,
        timeTaken: timeTaken !== undefined ? Number(timeTaken) : null
      }
    });

    res.status(201).json({
      message: 'MCQ Test submitted successfully',
      response
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit MCQ answers' });
  }
});

// Auto-shortlist top N candidates based on MCQ scores
router.post('/rounds/:roundId/auto-shortlist', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const { count } = req.body;
    const userId = req.user!.id;

    if (!count || typeof count !== 'number' || count <= 0) {
      return res.status(400).json({ error: 'Please enter a valid count of candidates to shortlist' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId }
    });
    if (!recruiterProfile) return res.status(404).json({ error: 'Recruiter profile not found' });

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: {
        job: {
          include: {
            rounds: { orderBy: { order: 'asc' } }
          }
        }
      }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });
    if (round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized to manage this round' });
    }

    // Get all pending progressions for this round, including responses and submissions
    const progressions = await prisma.candidateProgress.findMany({
      where: { roundId: roundId as string, status: 'PENDING' },
      include: { mcqResponse: true, application: true, codingSubmissions: true }
    }) as any[];

    if (progressions.length === 0) {
      return res.status(400).json({ error: 'No active pending candidates in this round' });
    }

    // Sort candidates based on round type: score descending, then timeTaken ascending. No response ranked last.
    const sorted = [...progressions].sort((a, b) => {
      if (round.type === 'MCQ') {
        const scoreA = (a.mcqResponse as any)?.score ?? -1;
        const scoreB = (b.mcqResponse as any)?.score ?? -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Descending score
        }
        const timeA = (a.mcqResponse as any)?.timeTaken ?? 999999;
        const timeB = (b.mcqResponse as any)?.timeTaken ?? 999999;
        return timeA - timeB; // Ascending timeTaken
      } else if (round.type === 'CODING') {
        const scoreA = a.codingSubmissions?.reduce((sum: number, s: any) => sum + (s.score || 0), 0) ?? -1;
        const scoreB = b.codingSubmissions?.reduce((sum: number, s: any) => sum + (s.score || 0), 0) ?? -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Descending score
        }
        const timeA = a.codingSubmissions?.reduce((sum: number, s: any) => sum + (s.timeTaken || 0), 0) ?? 999999;
        const timeB = b.codingSubmissions?.reduce((sum: number, s: any) => sum + (s.timeTaken || 0), 0) ?? 999999;
        if (a.codingSubmissions?.length === 0) return 1;
        if (b.codingSubmissions?.length === 0) return -1;
        return timeA - timeB; // Ascending timeTaken
      } else {
        return 0;
      }
    });

    const toShortlist = sorted.slice(0, count);
    const toReject = sorted.slice(count);

    const nextRound = round.job.rounds.find((r: any) => r.order === round.order + 1);

    // Update shortlisted candidates
    for (const prog of toShortlist) {
      await prisma.candidateProgress.update({
        where: { id: prog.id },
        data: { status: 'QUALIFIED', feedback: 'Auto-shortlisted based on MCQ score rank' }
      });

      if (nextRound) {
        await prisma.candidateProgress.create({
          data: {
            applicationId: prog.applicationId,
            roundId: nextRound.id,
            status: 'PENDING'
          }
        });
      } else {
        // Final round -> OFFERED
        await prisma.application.update({
          where: { id: prog.applicationId },
          data: { status: 'OFFERED' }
        });
      }
    }

    // Reject remaining candidates
    for (const prog of toReject) {
      await prisma.candidateProgress.update({
        where: { id: prog.id },
        data: { status: 'REJECTED', feedback: 'Not in top rank for MCQ test auto-shortlist' }
      });

      await prisma.application.update({
        where: { id: prog.applicationId },
        data: { status: 'REJECTED' }
      });
    }

    res.json({
      message: `Auto-shortlisting complete. Shortlisted: ${toShortlist.length}, Rejected: ${toReject.length}`,
      shortlistedCount: toShortlist.length,
      rejectedCount: toReject.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to apply auto-shortlist' });
  }
});

// Setup Coding Question & Test Cases (Recruiter only)
router.post('/rounds/:roundId/coding', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const { id, questionId, title, description, constraints, imageBlob, starterCode, testCases, marks, codingDuration, maxRunAttempts } = req.body;
    const qIdInput = id || questionId;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (codingDuration !== undefined) {
      await prisma.interviewRound.update({
        where: { id: roundId },
        data: { codingDuration: codingDuration ? Number(codingDuration) : null }
      });
      if (!title) {
        return res.json({ message: 'Coding duration updated successfully' });
      }
    }

    let qId = '';
    if (qIdInput) {
      qId = qIdInput;
      await prisma.codingQuestion.update({
        where: { id: qId },
        data: {
          title,
          description,
          constraints: constraints || null,
          imageBlob: imageBlob || null,
          starterCode: starterCode || {},
          marks: marks !== undefined ? Number(marks) : 10,
          maxRunAttempts: maxRunAttempts !== undefined && maxRunAttempts !== null && maxRunAttempts !== '' ? Number(maxRunAttempts) : null
        }
      });
    } else {
      const newQ = await prisma.codingQuestion.create({
        data: {
          roundId,
          title,
          description,
          constraints: constraints || null,
          imageBlob: imageBlob || null,
          starterCode: starterCode || {},
          marks: marks !== undefined ? Number(marks) : 10,
          maxRunAttempts: maxRunAttempts !== undefined && maxRunAttempts !== null && maxRunAttempts !== '' ? Number(maxRunAttempts) : null
        }
      });
      qId = newQ.id;
    }

    // Update test cases (delete old and insert new)
    await prisma.$transaction([
      prisma.codingTestCase.deleteMany({ where: { questionId: qId } }),
      prisma.codingTestCase.createMany({
        data: (testCases || []).map((tc: any) => ({
          questionId: qId,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isHidden: tc.isHidden === true || tc.isHidden === 'true'
        }))
      })
    ]);

    const updatedQ = await prisma.codingQuestion.findUnique({
      where: { id: qId },
      include: { testCases: true }
    });

    res.json(updatedQ);
  } catch (error) {
    console.error("Error saving coding question:", error);
    res.status(500).json({ error: 'Failed to save coding question', details: error instanceof Error ? error.message : String(error) });
  }
});

// Delete Coding Question (Recruiter only)
router.delete('/rounds/:roundId/coding/:questionId', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const questionId = req.params.questionId as string;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.codingQuestion.delete({
      where: { id: questionId }
    });

    res.json({ message: 'Coding question deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete coding question' });
  }
});

// Publish Coding Test
router.post('/rounds/:roundId/coding-publish', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
      include: { job: true }
    }) as any;

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });
    if (!recruiterProfile || round.job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updatedRound = await prisma.interviewRound.update({
      where: { id: roundId },
      data: { isCodingPublished: true }
    });

    res.json(updatedRound);
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish coding test' });
  }
});

// Fetch Coding Details (Student/Recruiter)
router.get('/rounds/:roundId/coding', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { recruiterProfile: true, studentProfile: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId }
    });

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    if (user.role === 'STUDENT') {
      if (!round.isCodingPublished) {
        return res.status(403).json({ error: 'Coding round is not published yet' });
      }

      const now = new Date();
      if (round.startDate && now < new Date(round.startDate)) {
        return res.status(403).json({ error: 'This round has not started yet' });
      }
      if (round.endDate && now > new Date(round.endDate)) {
        return res.status(403).json({ error: 'This round has already closed' });
      }
    }

    const questions = await prisma.codingQuestion.findMany({
      where: { roundId },
      include: { testCases: true },
      orderBy: { createdAt: 'asc' }
    });

    // Filter out hidden test cases for students
    if (user.role === 'STUDENT') {
      const publicQuestions = questions.map(question => ({
        ...question,
        testCases: question.testCases.filter(tc => !tc.isHidden)
      }));
      return res.json(publicQuestions);
    }

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch coding details' });
  }
});

// Exit Coding Test (Student only) — permanently ends the test session
router.post('/applications/:applicationId/rounds/:roundId/coding-exit', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const roundId = req.params.roundId as string;
    const userId = req.user!.id;

    const studentProfile = await prisma.studentProfile.findUnique({ where: { userId } });
    if (!studentProfile) return res.status(404).json({ error: 'Student profile not found' });

    const application = await prisma.application.findUnique({ where: { id: applicationId } }) as any;
    if (!application || application.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const progression = await prisma.candidateProgress.findUnique({
      where: { applicationId_roundId: { applicationId, roundId } }
    });
    if (!progression) return res.status(404).json({ error: 'Progression not found' });

    await prisma.candidateProgress.update({
      where: { id: progression.id },
      data: { codingTestExited: true }
    });

    res.json({ message: 'Coding test marked as exited.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to exit coding test' });
  }
});

// Test Run Code (Student only, public cases)
router.post('/rounds/:roundId/coding/run', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const roundId = req.params.roundId as string;
    const { code, language, questionId, runCount } = req.body;

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId }
    });
    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const now = new Date();
    if (round.startDate && now < new Date(round.startDate)) {
      return res.status(403).json({ error: 'This round has not started yet' });
    }
    if (round.endDate && now > new Date(round.endDate)) {
      return res.status(403).json({ error: 'This round has already closed' });
    }

    const question = questionId
      ? await prisma.codingQuestion.findUnique({
          where: { id: questionId },
          include: { testCases: true }
        })
      : await prisma.codingQuestion.findFirst({
          where: { roundId },
          include: { testCases: true }
        });

    if (!question) return res.status(404).json({ error: 'Coding question not found' });

    // Enforce maxRunAttempts limit if set
    if (question.maxRunAttempts !== null && question.maxRunAttempts !== undefined) {
      const currentRunCount = typeof runCount === 'number' ? runCount : 0;
      if (currentRunCount >= question.maxRunAttempts) {
        return res.status(429).json({ 
          error: `Run limit reached. You can only run this code ${question.maxRunAttempts} time(s).`,
          limitReached: true
        });
      }
    }

    // Visible test cases only
    const publicCases = question.testCases.filter(tc => !tc.isHidden);

    const results = [];
    for (const tc of publicCases) {
      const result = await runCode(language, code, tc.input, tc.expectedOutput);
      results.push({
        testCaseId: tc.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        status: result.status,
        actualOutput: result.output,
        error: result.error,
        passed: result.status === 'PASSED'
      });
    }

    res.json({ results, maxRunAttempts: question.maxRunAttempts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to test run code' });
  }
});

// Submit Coding Exam (Student only, all cases)
router.post('/applications/:applicationId/rounds/:roundId/coding-submit', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const roundId = req.params.roundId as string;
    const { code, language, questionId, timeTaken } = req.body;
    const userId = req.user!.id;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId }
    });
    if (!studentProfile) return res.status(404).json({ error: 'Student profile not found' });

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { progressions: true }
    }) as any;
    if (!application || application.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'Unauthorized to submit' });
    }

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId }
    });
    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const now = new Date();
    if (round.startDate && now < new Date(round.startDate)) {
      return res.status(403).json({ error: 'This round has not started yet' });
    }
    if (round.endDate && now > new Date(round.endDate)) {
      return res.status(403).json({ error: 'This round has already closed' });
    }

    const progression = application.progressions.find((p: any) => p.roundId === roundId && p.status === 'PENDING');
    if (!progression) {
      return res.status(400).json({ error: 'No active pending round progression found' });
    }

    const question = questionId
      ? await prisma.codingQuestion.findUnique({
          where: { id: questionId },
          include: { testCases: true }
        })
      : await prisma.codingQuestion.findFirst({
          where: { roundId },
          include: { testCases: true }
        });

    if (!question) return res.status(404).json({ error: 'Coding question not found' });

    const testCases = question.testCases;
    let passedCount = 0;
    const caseResults = [];

    // Run against all test cases (visible + hidden)
    for (const tc of testCases) {
      const result = await runCode(language, code, tc.input, tc.expectedOutput);
      const isPassed = result.status === 'PASSED';
      if (isPassed) {
        passedCount++;
      }
      caseResults.push({
        input: tc.isHidden ? '*** Hidden ***' : tc.input,
        expectedOutput: tc.isHidden ? '*** Hidden ***' : tc.expectedOutput,
        actualOutput: tc.isHidden ? (isPassed ? '*** Hidden (Correct) ***' : '*** Hidden (Incorrect) ***') : result.output,
        status: result.status,
        error: tc.isHidden ? (isPassed ? null : 'Failed') : result.error
      });
    }

    const totalCount = testCases.length;
    const score = totalCount > 0 ? Number((question.marks * (passedCount / totalCount)).toFixed(2)) : 0;
    const status = passedCount === totalCount ? 'PASSED' : 'FAILED';

    // Upsert coding submission
    const existingSub = await prisma.candidateCodingSub.findFirst({
      where: { candidateProgressId: progression.id, codingQuestionId: question.id }
    });

    let submission;
    if (existingSub) {
      submission = await prisma.candidateCodingSub.update({
        where: { id: existingSub.id },
        data: {
          code,
          language,
          status,
          passedCasesCount: passedCount,
          totalCasesCount: totalCount,
          score,
          runtimeMessage: JSON.stringify(caseResults),
          timeTaken: timeTaken !== undefined ? Number(timeTaken) : null
        }
      });
    } else {
      submission = await prisma.candidateCodingSub.create({
        data: {
          candidateProgressId: progression.id,
          codingQuestionId: question.id,
          code,
          language,
          status,
          passedCasesCount: passedCount,
          totalCasesCount: totalCount,
          score,
          runtimeMessage: JSON.stringify(caseResults),
          timeTaken: timeTaken !== undefined ? Number(timeTaken) : null
        }
      });
    }

    res.json({
      submission,
      passedCount,
      totalCount,
      score
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit coding round solution' });
  }
});

export default router;
