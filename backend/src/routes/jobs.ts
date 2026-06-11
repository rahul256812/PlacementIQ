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

    const { title, description, requirements, salaryRange, jobType, location, questions } = req.body;

    const job = await prisma.job.create({
      data: {
        recruiterProfileId: recruiterProfile.id,
        title,
        description,
        requirements,
        salaryRange,
        jobType,
        location,
        questions: questions || null
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

// Update a job (Recruiter only, must be owner)
router.put('/:id', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const id = req.params.id as string;
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.recruiterProfileId !== recruiterProfile.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { title, description, requirements, salaryRange, jobType, location, questions, isOpen } = req.body;

    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        requirements: requirements !== undefined ? requirements : undefined,
        salaryRange: salaryRange !== undefined ? salaryRange : undefined,
        jobType: jobType !== undefined ? jobType : undefined,
        location: location !== undefined ? location : undefined,
        questions: questions !== undefined ? questions : undefined,
        isOpen: isOpen !== undefined ? isOpen : undefined
      }
    });

    res.json(updatedJob);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

export default router;
