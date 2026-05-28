import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all jobs (Public/Students)
router.get('/', async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { isOpen: true },
      include: {
        recruiter: {
          select: { companyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Create a job (Recruiter only, must be APPROVED)
router.post('/', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });
    if (recruiterProfile.status !== 'APPROVED') {
      return res.status(403).json({ error: 'Your account is pending admin approval' });
    }

    const { title, description, requirements, salaryRange, jobType, location } = req.body;

    const job = await prisma.job.create({
      data: {
        recruiterProfileId: recruiterProfile.id,
        title,
        description,
        requirements,
        salaryRange,
        jobType,
        location
      }
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Get jobs by recruiter (Recruiter dashboard)
router.get('/me', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const jobs = await prisma.job.findMany({
      where: { recruiterProfileId: recruiterProfile.id },
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your jobs' });
  }
});

export default router;
