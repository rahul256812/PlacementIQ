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

    const { title, description, requirements, salaryRange, jobType, location, questions, applyStartDate, applyEndDate } = req.body;

    const job = await prisma.job.create({
      data: {
        recruiterProfileId: recruiterProfile.id,
        title,
        description,
        requirements,
        salaryRange,
        jobType,
        location,
        questions: questions || null,
        applyStartDate: applyStartDate ? new Date(applyStartDate) : null,
        applyEndDate: applyEndDate ? new Date(applyEndDate) : null
      }
    });

    // Log the creation activity
    await prisma.jobActivityLog.create({
      data: {
        recruiterProfileId: recruiterProfile.id,
        jobId: job.id,
        jobTitle: job.title,
        action: 'POSTED',
        details: `Job posted at ${location || 'Remote'} with salary range ${salaryRange || 'Not specified'}.`
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
        },
        rounds: {
          orderBy: { order: 'asc' }
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

    const { title, description, requirements, salaryRange, jobType, location, questions, isOpen, applyStartDate, applyEndDate } = req.body;

    const oldIsOpen = job.isOpen;
    let parsedIsOpen: boolean | undefined = undefined;
    if (isOpen !== undefined) {
      parsedIsOpen = typeof isOpen === 'string' ? isOpen === 'true' : Boolean(isOpen);
    }
    
    const isStatusChanging = parsedIsOpen !== undefined && parsedIsOpen !== oldIsOpen;
    
    const isFieldsEdited = (
      (title !== undefined && title !== job.title) ||
      (description !== undefined && description !== job.description) ||
      (requirements !== undefined && requirements !== job.requirements) ||
      (salaryRange !== undefined && salaryRange !== job.salaryRange) ||
      (location !== undefined && location !== job.location) ||
      (jobType !== undefined && jobType !== job.jobType) ||
      (questions !== undefined && JSON.stringify(questions) !== JSON.stringify(job.questions)) ||
      (applyStartDate !== undefined && applyStartDate !== (job.applyStartDate ? job.applyStartDate.toISOString() : null)) ||
      (applyEndDate !== undefined && applyEndDate !== (job.applyEndDate ? job.applyEndDate.toISOString() : null))
    );

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
        isOpen: parsedIsOpen !== undefined ? parsedIsOpen : undefined,
        applyStartDate: applyStartDate !== undefined ? (applyStartDate ? new Date(applyStartDate) : null) : undefined,
        applyEndDate: applyEndDate !== undefined ? (applyEndDate ? new Date(applyEndDate) : null) : undefined
      }
    });

    if (isStatusChanging) {
      await prisma.jobActivityLog.create({
        data: {
          recruiterProfileId: recruiterProfile.id,
          jobId: updatedJob.id,
          jobTitle: updatedJob.title,
          action: parsedIsOpen ? 'RESUMED' : 'PAUSED',
          details: parsedIsOpen ? 'Recruiting process resumed.' : 'Recruiting process put on hold.'
        }
      });
    }

    if (isFieldsEdited) {
      await prisma.jobActivityLog.create({
        data: {
          recruiterProfileId: recruiterProfile.id,
          jobId: updatedJob.id,
          jobTitle: updatedJob.title,
          action: 'EDITED',
          details: 'Job posting details updated.'
        }
      });
    }

    res.json(updatedJob);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Get job activity history (Recruiter only)
router.get('/history', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
  try {
    const recruiterProfile = await prisma.recruiterProfile.findUnique({
      where: { userId: req.user!.id }
    });

    if (!recruiterProfile) return res.status(404).json({ error: 'Profile not found' });

    const logs = await prisma.jobActivityLog.findMany({
      where: { recruiterProfileId: recruiterProfile.id },
      orderBy: { timestamp: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
});

// Delete a job (Recruiter only, must be owner)
router.delete('/:id', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: any) => {
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

    // Log deletion before actual cascade delete
    await prisma.jobActivityLog.create({
      data: {
        recruiterProfileId: recruiterProfile.id,
        jobId: null,
        jobTitle: job.title,
        action: 'DELETED',
        details: `Job posting "${job.title}" was deleted.`
      }
    });

    // Delete job (cascade handles rounds, progressions, roundMessages, and applications)
    await prisma.job.delete({ where: { id } });

    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

export default router;
