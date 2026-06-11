import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/analytics/admin - System-wide stats
router.get('/admin', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const [totalStudents, totalRecruiters, totalJobs, totalApplications] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.recruiterProfile.count(),
      prisma.job.count(),
      prisma.application.count(),
    ]);

    // Recruiter status breakdown
    const recruitersPending = await prisma.recruiterProfile.count({ where: { status: 'PENDING' } });
    const recruitersApproved = await prisma.recruiterProfile.count({ where: { status: 'APPROVED' } });

    // Job status breakdown
    const openJobs = await prisma.job.count({ where: { isOpen: true } });

    // Applications status breakdown
    const appBreakdown = await prisma.application.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    const statusCounts = {
      APPLIED: 0,
      SHORTLISTED: 0,
      REJECTED: 0,
      HIRED: 0,
    };

    appBreakdown.forEach((item) => {
      if (item.status in statusCounts) {
        statusCounts[item.status as keyof typeof statusCounts] = item._count.id;
      }
    });

    // Students placed (at least one HIRED application)
    const placedStudentsCount = await prisma.studentProfile.count({
      where: {
        applications: {
          some: {
            status: 'HIRED',
          },
        },
      },
    });

    const placementRate = totalStudents > 0 ? Math.round((placedStudentsCount / totalStudents) * 100) : 0;

    res.json({
      summary: {
        totalStudents,
        totalRecruiters,
        totalJobs,
        totalApplications,
        placementRate,
        placedStudents: placedStudentsCount,
      },
      recruiters: {
        pending: recruitersPending,
        approved: recruitersApproved,
      },
      jobs: {
        open: openJobs,
        closed: totalJobs - openJobs,
      },
      applications: statusCounts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching admin analytics' });
  }
});

// GET /api/analytics/recruiter - Recruiter dashboard stats
router.get('/recruiter', authenticate, requireRole(['RECRUITER']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    const recruiter = await prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!recruiter) {
      return res.status(404).json({ error: 'Recruiter profile not found' });
    }

    // Get jobs by this recruiter
    const recruiterJobs = await prisma.job.findMany({
      where: { recruiterProfileId: recruiter.id },
      include: {
        _count: {
          select: { applications: true },
        },
      },
    });

    const totalJobs = recruiterJobs.length;
    const openJobs = recruiterJobs.filter((j) => j.isOpen).length;

    // Total applications for recruiter's jobs
    const totalApplications = recruiterJobs.reduce((acc, job) => acc + job._count.applications, 0);

    // Group by status for applications to recruiter's jobs
    const appBreakdown = await prisma.application.groupBy({
      by: ['status'],
      where: {
        job: {
          recruiterProfileId: recruiter.id,
        },
      },
      _count: {
        id: true,
      },
    });

    const statusCounts = {
      APPLIED: 0,
      SHORTLISTED: 0,
      REJECTED: 0,
      HIRED: 0,
    };

    appBreakdown.forEach((item) => {
      if (item.status in statusCounts) {
        statusCounts[item.status as keyof typeof statusCounts] = item._count.id;
      }
    });

    // Applications count by job title for charts
    const jobsChartData = recruiterJobs.map((job) => ({
      title: job.title,
      applications: job._count.applications,
      isOpen: job.isOpen,
    }));

    res.json({
      summary: {
        totalJobs,
        openJobs,
        closedJobs: totalJobs - openJobs,
        totalApplications,
      },
      applications: statusCounts,
      jobsChartData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching recruiter analytics' });
  }
});

// GET /api/analytics/student - Student stats
router.get('/student', authenticate, requireRole(['STUDENT']), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const student = await prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const myApps = await prisma.application.findMany({
      where: { studentProfileId: student.id },
    });

    const totalApplications = myApps.length;

    const statusCounts = {
      APPLIED: 0,
      SHORTLISTED: 0,
      REJECTED: 0,
      HIRED: 0,
    };

    myApps.forEach((app) => {
      if (app.status in statusCounts) {
        statusCounts[app.status as keyof typeof statusCounts]++;
      }
    });

    const totalOpenJobs = await prisma.job.count({
      where: { isOpen: true },
    });

    res.json({
      totalApplications,
      applications: statusCounts,
      totalOpenJobs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error fetching student analytics' });
  }
});

export default router;
