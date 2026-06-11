import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_for_steps_app';

router.post('/signup', async (req, res) => {
  try {
    const { email, password, role, fullName, ...profileData } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        fullName,
      },
    });

    if (role === 'STUDENT') {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          college: profileData.college,
          branch: profileData.branch,
          graduationYear: profileData.graduationYear ? parseInt(profileData.graduationYear) : null,
        },
      });
    } else if (role === 'RECRUITER') {
      await prisma.recruiterProfile.create({
        data: {
          userId: user.id,
          companyName: profileData.companyName || 'Unknown',
          designation: profileData.designation || 'Recruiter',
        },
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { studentProfile: true, recruiterProfile: true }
    });
    
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    const profile = user.role === 'STUDENT' ? user.studentProfile : user.recruiterProfile;
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        fullName: user.fullName,
        status: user.role === 'RECRUITER' ? user.recruiterProfile?.status : undefined
      },
      profile 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        recruiterProfile: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = user.role === 'STUDENT' ? user.studentProfile : user.recruiterProfile;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        status: user.role === 'RECRUITER' ? user.recruiterProfile?.status : undefined,
      },
      profile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
});

router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { fullName, ...profileData } = req.body;

    if (fullName) {
      await prisma.user.update({
        where: { id: userId },
        data: { fullName },
      });
    }

    let updatedProfile;
    if (role === 'STUDENT') {
      updatedProfile = await prisma.studentProfile.update({
        where: { userId },
        data: {
          college: profileData.college !== undefined ? profileData.college : undefined,
          branch: profileData.branch !== undefined ? profileData.branch : undefined,
          graduationYear: profileData.graduationYear !== undefined ? (profileData.graduationYear ? parseInt(profileData.graduationYear) : null) : undefined,
          skills: profileData.skills !== undefined ? profileData.skills : undefined,
          cgpa: profileData.cgpa !== undefined ? (profileData.cgpa ? parseFloat(profileData.cgpa) : null) : undefined,
          experience: profileData.experience !== undefined ? profileData.experience : undefined,
          projects: profileData.projects !== undefined ? profileData.projects : undefined,
        },
      });
    } else if (role === 'RECRUITER') {
      updatedProfile = await prisma.recruiterProfile.update({
        where: { userId },
        data: {
          companyName: profileData.companyName !== undefined ? profileData.companyName : undefined,
          designation: profileData.designation !== undefined ? profileData.designation : undefined,
        },
      });
    }

    res.json({
      fullName: fullName || undefined,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

export default router;
