import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { screenCandidate } from '../utils/aiScreening';

const router = Router();

// Apply to a job (Student only)
router.post('/:jobId', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;
    const { coverLetterText, answers } = req.body;

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!studentProfile) return res.status(404).json({ error: 'Student profile not found' });

    // Check if already applied
    const existingApp = await prisma.application.findFirst({
      where: { jobId, studentProfileId: studentProfile.id }
    });

    if (existingApp) return res.status(400).json({ error: 'Already applied to this job' });

    const job = await prisma.job.findUnique({
      where: { id: jobId }
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const now = new Date();
    if (job.applyStartDate && now < new Date(job.applyStartDate)) {
      return res.status(400).json({ error: 'Job applications have not opened yet' });
    }
    if (job.applyEndDate && now > new Date(job.applyEndDate)) {
      return res.status(400).json({ error: 'Job applications have closed' });
    }

    const application = await prisma.application.create({
      data: {
        jobId,
        studentProfileId: studentProfile.id,
        coverLetterText: coverLetterText || '',
        answers: answers || null
      }
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// Get my applications (Student dashboard)
router.get('/me', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!studentProfile) return res.status(404).json({ error: 'Profile not found' });

    const applications = await prisma.application.findMany({
      where: { studentProfileId: studentProfile.id },
      include: {
        job: {
          include: {
            recruiter: { select: { companyName: true } },
            rounds: { orderBy: { order: 'asc' } }
          }
        },
        progressions: {
          include: { round: true, mcqResponse: true, codingSubmissions: { include: { question: true } } }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your applications' });
  }
});

// Get applicants for a job (Recruiter only)
router.get('/job/:jobId', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    
    if (!job || job.recruiterProfileId !== recruiterProfile?.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        job: {
          include: {
            rounds: { orderBy: { order: 'asc' } }
          }
        },
        progressions: {
          include: { round: true, mcqResponse: true, codingSubmissions: { include: { question: true } } }
        },
        student: {
          include: { user: { select: { fullName: true, email: true } } }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// Update application status (Recruiter only)
router.patch('/:applicationId/status', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const { status } = req.body;

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true }
    }) as any;

    if (!application) return res.status(404).json({ error: 'Application not found' });

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (application.job.recruiterProfileId !== recruiterProfile?.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status }
    });

    if (status === 'SHORTLISTED') {
      const firstRound = await prisma.interviewRound.findFirst({
        where: { jobId: application.jobId },
        orderBy: { order: 'asc' }
      });
      if (firstRound) {
        await prisma.candidateProgress.upsert({
          where: {
            applicationId_roundId: {
              applicationId,
              roundId: firstRound.id
            }
          },
          update: { status: 'PENDING' },
          create: {
            applicationId,
            roundId: firstRound.id,
            status: 'PENDING'
          }
        });
      }
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Student responds to offer (ACCEPTED | DECLINED)
router.patch('/:applicationId/respond', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: any) => {
  try {
    const applicationId = req.params.applicationId as string;
    const { response } = req.body; // 'ACCEPTED' | 'DECLINED'

    if (!['ACCEPTED', 'DECLINED'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response' });
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!studentProfile) return res.status(404).json({ error: 'Student profile not found' });

    const application = await prisma.application.findUnique({
      where: { id: applicationId }
    });

    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.studentProfileId !== studentProfile.id) {
      return res.status(403).json({ error: 'Unauthorized to respond to this application' });
    }
    if (application.status !== 'OFFERED') {
      return res.status(400).json({ error: 'No active job offer to respond to' });
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status: response }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to respond to offer' });
  }
});

// Trigger AI screening for all applicants of a job (Recruiter only)
router.post('/job/:jobId/ai-screen', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const jobId = req.params.jobId as string;
    const { keywords } = req.body;

    if (!keywords || !keywords.trim()) {
      return res.status(400).json({ error: 'Keywords are required for screening' });
    }

    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.recruiterProfileId !== recruiterProfile?.id) {
      return res.status(403).json({ error: 'Unauthorized to screen applicants for this job' });
    }

    // Get all applications for this job
    const applications = await prisma.application.findMany({
      where: { jobId },
      include: {
        student: true
      }
    });

    for (const app of applications) {
      const screening = screenCandidate(app.student, app.coverLetterText, keywords);
      await prisma.application.update({
        where: { id: app.id },
        data: {
          aiScreeningScore: screening.score,
          aiScreeningFeedback: JSON.stringify(screening.feedback)
        }
      });
    }

    // Return the updated applications list complete with round details and progressions
    const updatedApplications = await prisma.application.findMany({
      where: { jobId },
      include: {
        job: {
          include: {
            rounds: { orderBy: { order: 'asc' } }
          }
        },
        progressions: {
          include: { round: true, mcqResponse: true, codingSubmissions: { include: { question: true } } }
        },
        student: {
          include: { user: { select: { fullName: true, email: true } } }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    res.json(updatedApplications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to run AI screening' });
  }
});

export default router;
