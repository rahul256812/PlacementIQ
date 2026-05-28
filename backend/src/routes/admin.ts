import { Router } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all recruiters (pending, approved, rejected)
router.get('/recruiters', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: any) => {
  try {
    const recruiters = await prisma.recruiterProfile.findMany({
      include: {
        user: { select: { fullName: true, email: true, createdAt: true } }
      },
      orderBy: { user: { createdAt: 'desc' } }
    });
    res.json(recruiters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruiters' });
  }
});

// Approve or reject a recruiter
router.patch('/recruiters/:id/status', authenticate, requireRole(['ADMIN']), async (req: AuthRequest, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const recruiter = await prisma.recruiterProfile.update({
      where: { id },
      data: { status }
    });

    res.json(recruiter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update recruiter status' });
  }
});

export default router;
