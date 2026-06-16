import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatTimeAMPM } from '../utils/dateFormatter';
import { JobService, ApplicationService, AuthService, AnalyticsService, RoundService } from '../services/api';
import { Button } from '../components/ui/button';
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  User, 
  Award, 
  BookOpen, 
  GraduationCap, 
  BarChart3,
  Calendar,
  FileText,
  Save,
  Edit2,
  X,
  MessageSquare,
  Layers,
  Volume2,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';

export function StudentDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ['BROWSE', 'APPLICATIONS', 'PROFILE', 'ANALYTICS'].includes(tabParam || '') ? tabParam as any : 'BROWSE';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // MCQ state variables
  const [activeMcqRound, setActiveMcqRound] = useState<any | null>(null);
  const [activeMcqAppId, setActiveMcqAppId] = useState<string | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [studentMcqAnswers, setStudentMcqAnswers] = useState<Record<string, number[]>>({});
  const [submittingMcq, setSubmittingMcq] = useState(false);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [overallTimeLeft, setOverallTimeLeft] = useState<number | null>(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState<number | null>(null);
  const [mcqStartTime, setMcqStartTime] = useState<number | null>(null);

  // Coding state variables
  const [activeCodingRound, setActiveCodingRound] = useState<any | null>(null);
  const [activeCodingAppId, setActiveCodingAppId] = useState<string | null>(null);
  const [codingChallenges, setCodingChallenges] = useState<any[]>([]);
  const [activeChallengeIdx, setActiveChallengeIdx] = useState<number>(0);
  const [activeQuestionLockedId, setActiveQuestionLockedId] = useState<string | null>(null);
  const [studentCodes, setStudentCodes] = useState<Record<string, { code: string; language: string }>>({});
  const [studentCode, setStudentCode] = useState('');
  const [selectedCodingLanguage, setSelectedCodingLanguage] = useState('javascript');
  const [runResults, setRunResults] = useState<any[]>([]);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [codingSubSuccess, setCodingSubSuccess] = useState<any | null>(null);
  const [codingStartTime, setCodingStartTime] = useState<number | null>(null);
  const [codingTimeLeft, setCodingTimeLeft] = useState<number | null>(null);
  // Run attempt tracking: { [questionId]: number }
  const [runCountPerQuestion, setRunCountPerQuestion] = useState<Record<string, number>>({});
  // Test done summary modal: { questions, submissions, exited }
  const [codingTestDoneSummary, setCodingTestDoneSummary] = useState<{ questions: any[]; submissions: any[]; exited: boolean } | null>(null);

  // Refs to prevent stale closure in setInterval callback
  const studentMcqAnswersRef = React.useRef<Record<string, number[]>>({});
  const activeMcqRoundRef = React.useRef<any | null>(null);
  const activeMcqAppIdRef = React.useRef<string | null>(null);
  const mcqQuestionsRef = React.useRef<any[]>([]);

  const studentCodesRef = React.useRef<Record<string, { code: string; language: string }>>({});
  const activeCodingRoundRef = React.useRef<any | null>(null);
  const activeCodingAppIdRef = React.useRef<string | null>(null);
  const codingChallengesRef = React.useRef<any[]>([]);
  const activeChallengeIdxRef = React.useRef<number>(0);
  const studentCodeRef = React.useRef<string>('');
  const selectedCodingLanguageRef = React.useRef<string>('javascript');
  const codingStartTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    studentMcqAnswersRef.current = studentMcqAnswers;
    activeMcqRoundRef.current = activeMcqRound;
    activeMcqAppIdRef.current = activeMcqAppId;
    mcqQuestionsRef.current = mcqQuestions;
  }, [studentMcqAnswers, activeMcqRound, activeMcqAppId, mcqQuestions]);

  React.useEffect(() => {
    studentCodesRef.current = studentCodes;
    activeCodingRoundRef.current = activeCodingRound;
    activeCodingAppIdRef.current = activeCodingAppId;
    codingChallengesRef.current = codingChallenges;
    activeChallengeIdxRef.current = activeChallengeIdx;
    studentCodeRef.current = studentCode;
    selectedCodingLanguageRef.current = selectedCodingLanguage;
    codingStartTimeRef.current = codingStartTime;
  }, [studentCodes, activeCodingRound, activeCodingAppId, codingChallenges, activeChallengeIdx, studentCode, selectedCodingLanguage, codingStartTime]);

  // Expanded application details & Communication Hub
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [studentChannels, setStudentChannels] = useState<any[]>([]);
  const [selectedStudentChannelId, setSelectedStudentChannelId] = useState<string | null>(null); // null = General
  const [studentMessages, setStudentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (selectedJob) {
      setAnswers({});
    }
  }, [selectedJob]);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [profile, setProfile] = useState({
    college: '',
    branch: '',
    graduationYear: '',
    skills: '',
    cgpa: '',
    experience: '',
    projects: '',
  });

  const [analytics, setAnalytics] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, appsData, profileRes, analyticsRes] = await Promise.all([
        JobService.getAllJobs(),
        ApplicationService.getMyApplications(),
        AuthService.getProfile(),
        AnalyticsService.getStudentAnalytics()
      ]);
      setJobs(jobsData);
      setMyApplications(appsData);
      
      if (profileRes) {
        setFullName(profileRes.user.fullName);
        setProfile({
          college: profileRes.profile?.college || '',
          branch: profileRes.profile?.branch || '',
          graduationYear: profileRes.profile?.graduationYear || '',
          skills: profileRes.profile?.skills || '',
          cgpa: profileRes.profile?.cgpa || '',
          experience: profileRes.profile?.experience || '',
          projects: profileRes.profile?.projects || '',
        });
      }
      setAnalytics(analyticsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentChannelMessages = async (jobId: string, roundId: string | null) => {
    try {
      const data = await RoundService.getMessages(jobId);
      const filtered = data.messages.filter((m: any) => m.roundId === roundId);
      setStudentMessages(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExpandApp = async (app: any) => {
    if (expandedAppId === app.id) {
      setExpandedAppId(null);
      return;
    }

    setExpandedAppId(app.id);
    setSelectedStudentChannelId(null);
    setStudentMessages([]);

    try {
      const data = await RoundService.getMessages(app.jobId);
      const generalChannel = { id: null, title: 'General Announcements', icon: Volume2 };
      
      const allowedRoundIds = data.allowedRoundIds || [];
      const rounds = app.job.rounds || [];
      const allowedRounds = rounds.filter((r: any) => allowedRoundIds.includes(r.id));

      const channels = [
        generalChannel,
        ...allowedRounds.map((r: any) => ({
          id: r.id,
          title: `${r.title} (${r.format})`,
          icon: Layers
        }))
      ];
      setStudentChannels(channels);

      const filtered = data.messages.filter((m: any) => m.roundId === null);
      setStudentMessages(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectStudentChannel = async (jobId: string, channelId: string | null) => {
    setSelectedStudentChannelId(channelId);
    await loadStudentChannelMessages(jobId, channelId);
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApplicationService.applyToJob(selectedJob.id, { 
        coverLetterText: coverLetter,
        answers
      });
      alert('Application submitted successfully!');
      setSelectedJob(null);
      setCoverLetter('');
      setAnswers({});
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to apply');
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await AuthService.updateProfile({
        fullName,
        college: profile.college,
        branch: profile.branch,
        graduationYear: profile.graduationYear ? parseInt(profile.graduationYear as string) : null,
        skills: profile.skills,
        cgpa: profile.cgpa ? parseFloat(profile.cgpa as string) : null,
        experience: profile.experience,
        projects: profile.projects,
      });
      alert('Profile updated successfully!');
      setIsEditingProfile(false);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRespondToOffer = async (applicationId: string, response: 'ACCEPTED' | 'DECLINED') => {
    try {
      await ApplicationService.respondToOffer(applicationId, response);
      alert(`Successfully ${response === 'ACCEPTED' ? 'accepted' : 'declined'} the offer!`);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to respond to offer');
    }
  };

  const handleStartMcqTest = async (appId: string, round: any) => {
    try {
      const questionsData = await RoundService.getMcqQuestions(round.id);
      setMcqQuestions(questionsData);
      setStudentMcqAnswers({});
      setActiveMcqRound(round);
      setActiveMcqAppId(appId);
      setIsTestSubmitted(false);
      setCurrentQuestionIndex(0);
      setMcqStartTime(Date.now());

      // Set timers
      setOverallTimeLeft(round.mcqDuration ? round.mcqDuration * 60 : null);
      const firstQ = questionsData[0];
      setQuestionTimeLeft(firstQ?.duration ? Number(firstQ.duration) : null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fetch MCQ questions');
    }
  };

  const handleToggleMcqOption = (questionId: string, optionIdx: number, isMultipleChoice: boolean) => {
    setStudentMcqAnswers(prev => {
      const current = prev[questionId] || [];
      if (isMultipleChoice) {
        if (current.includes(optionIdx)) {
          return { ...prev, [questionId]: current.filter(idx => idx !== optionIdx) };
        } else {
          return { ...prev, [questionId]: [...current, optionIdx].sort() };
        }
      } else {
        return { ...prev, [questionId]: [optionIdx] };
      }
    });
  };

  const handleSubmitMcqTest = async () => {
    const rId = activeMcqRoundRef.current?.id;
    const aId = activeMcqAppIdRef.current;
    if (!rId || !aId) return;
    setSubmittingMcq(true);
    const timeTaken = mcqStartTime ? Math.floor((Date.now() - mcqStartTime) / 1000) : undefined;
    try {
      await RoundService.submitMcqAnswers(aId, rId, { answers: studentMcqAnswersRef.current, timeTaken });
      setIsTestSubmitted(true);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit MCQ test');
    } finally {
      setSubmittingMcq(false);
    }
  };

  // MCQ Timer Ticking Loop
  React.useEffect(() => {
    if (!activeMcqRound || isTestSubmitted) return;

    const timer = setInterval(() => {
      // 1. Overall Timer
      setOverallTimeLeft(prev => {
        if (prev !== null) {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitMcqTest();
            return 0;
          }
          return prev - 1;
        }
        return null;
      });

      // 2. Question-Specific Timer
      setQuestionTimeLeft(prev => {
        if (prev !== null) {
          if (prev <= 1) {
            // Move to next question if time limit is reached
            setCurrentQuestionIndex(currIdx => {
              const hasNext = currIdx < mcqQuestionsRef.current.length - 1;
              if (hasNext) {
                const nextIdx = currIdx + 1;
                const nextQ = mcqQuestionsRef.current[nextIdx];
                setQuestionTimeLeft(nextQ.duration ? Number(nextQ.duration) : null);
                return nextIdx;
              } else {
                clearInterval(timer);
                handleSubmitMcqTest();
                return currIdx;
              }
            });
            return 0;
          }
          return prev - 1;
        }
        return null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeMcqRound, isTestSubmitted]);

  // Coding actions
  const handleStartCodingTest = async (appId: string, round: any) => {
    try {
      const questions = await RoundService.getCodingQuestion(round.id);
      const questionsList = Array.isArray(questions) ? questions : (questions ? [questions] : []);
      if (questionsList.length === 0) {
        alert("No coding questions configured for this round.");
        return;
      }

      // Block entry if all questions already submitted OR test was exited
      const app = myApplications?.find((a: any) => a.id === appId);
      const progression = app?.progressions?.find((p: any) => p.roundId === round.id);
      if (progression?.codingTestExited) {
        setCodingTestDoneSummary({
          questions: questionsList,
          submissions: progression?.codingSubmissions || [],
          exited: true
        });
        return;
      }
      const submittedIds = new Set((progression?.codingSubmissions || []).map((s: any) => s.codingQuestionId));
      const allDone = questionsList.every((q: any) => submittedIds.has(q.id));
      if (allDone) {
        setCodingTestDoneSummary({
          questions: questionsList,
          submissions: progression?.codingSubmissions || [],
          exited: false
        });
        return;
      }
      setCodingChallenges(questionsList);
      setActiveCodingRound(round);
      setActiveCodingAppId(appId);
      setRunResults([]);
      setCodingSubSuccess(null);
      setActiveChallengeIdx(0);
      setActiveQuestionLockedId(null);
      setCodingStartTime(Date.now());
      setCodingTimeLeft(round.codingDuration ? round.codingDuration * 60 : null);
      setRunCountPerQuestion({});

      // Load code states for all questions
      const initialCodes: Record<string, { code: string; language: string }> = {};

      questionsList.forEach((q: any) => {
        const existingSub = progression?.codingSubmissions?.find((s: any) => s.codingQuestionId === q.id);
        if (existingSub) {
          initialCodes[q.id] = {
            code: existingSub.code,
            language: existingSub.language
          };
        } else {
          const starterCodeMap = typeof q.starterCode === 'string'
            ? JSON.parse(q.starterCode)
            : q.starterCode;
          initialCodes[q.id] = {
            code: starterCodeMap?.javascript || 'function solve() {\n  // Write code here\n}',
            language: 'javascript'
          };
        }
      });

      setStudentCodes(initialCodes);

      // Initialize editor with first question
      const firstQ = questionsList[0];
      setStudentCode(initialCodes[firstQ.id].code);
      setSelectedCodingLanguage(initialCodes[firstQ.id].language);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fetch coding details');
    }
  };

  const handleSelectChallenge = (index: number) => {
    const app = myApplications?.find((a: any) => a.id === activeCodingAppId);
    const progression = app?.progressions?.find((p: any) => p.roundId === activeCodingRound?.id);
    const isAlreadySubmitted = (q: any) => progression?.codingSubmissions?.some((s: any) => s.codingQuestionId === q.id);

    // Save current code to state before switching
    const currentQ = codingChallenges[activeChallengeIdx];
    if (currentQ && !isAlreadySubmitted(currentQ)) {
      setStudentCodes(prev => ({
        ...prev,
        [currentQ.id]: { code: studentCode, language: selectedCodingLanguage }
      }));
    }

    const nextQ = codingChallenges[index];
    if (!nextQ) return;

    // Don't switch to already-submitted questions
    if (isAlreadySubmitted(nextQ)) return;

    setActiveChallengeIdx(index);
    const nextState = studentCodes[nextQ.id] || { code: '', language: 'javascript' };
    setStudentCode(nextState.code);
    setSelectedCodingLanguage(nextState.language);
    setRunResults([]);
  };

  const handleCodingLanguageChange = (lang: string) => {
    setSelectedCodingLanguage(lang);
    const activeQ = codingChallenges[activeChallengeIdx];
    if (!activeQ) return;
    
    const starterCodeMap = typeof activeQ.starterCode === 'string' 
      ? JSON.parse(activeQ.starterCode) 
      : activeQ.starterCode;

    setStudentCode(starterCodeMap?.[lang] || '');
  };

  // Shared exit handler — calls backend to permanently close the test
  const handleExitCodingTest = async () => {
    const confirmExit = confirm(
      "⚠️ Are you sure you want to exit?\n\nThis will PERMANENTLY end your coding test. You will NOT be able to re-enter once you exit."
    );
    if (!confirmExit) return;

    // Call backend to mark as exited
    if (activeCodingAppId && activeCodingRound) {
      try {
        await RoundService.exitCodingTest(activeCodingAppId, activeCodingRound.id);
      } catch (err) {
        console.error('Failed to record exit:', err);
      }
    }

    setActiveCodingRound(null);
    setActiveCodingAppId(null);
    setCodingChallenges([]);
    setStudentCode('');
    setRunResults([]);
    setCodingSubSuccess(null);
    setActiveQuestionLockedId(null);
    await loadData(); // Refresh so the UI reflects exited state
  };

  const handleRunCodingTest = async () => {
    const activeQ = codingChallenges[activeChallengeIdx];
    if (!activeCodingRound || !activeQ) return;

    const currentRunCount = runCountPerQuestion[activeQ.id] || 0;
    if (activeQ.maxRunAttempts != null && currentRunCount >= activeQ.maxRunAttempts) {
      alert(`Run limit reached! You can only run this code ${activeQ.maxRunAttempts} time(s).`);
      return;
    }

    setIsRunningCode(true);
    setRunResults([]);
    try {
      const res = await RoundService.runCodingTest(activeCodingRound.id, {
        code: studentCode,
        language: selectedCodingLanguage,
        questionId: activeQ.id,
        runCount: currentRunCount
      });
      setRunResults(res.results || []);
      // Increment run count only on successful run
      setRunCountPerQuestion(prev => ({ ...prev, [activeQ.id]: currentRunCount + 1 }));
    } catch (err: any) {
      if (err.response?.data?.limitReached) {
        alert(err.response.data.error);
      } else {
        alert(err.response?.data?.error || 'Failed to run code');
      }
    } finally {
      setIsRunningCode(false);
    }
  };

  const handleSubmitCodingTest = async () => {
    const activeQ = codingChallenges[activeChallengeIdx];
    if (!activeCodingRound || !activeCodingAppId || !activeQ) return;
    setIsSubmittingCode(true);
    const timeTaken = codingStartTime ? Math.floor((Date.now() - codingStartTime) / 1000) : undefined;
    try {
      const res = await RoundService.submitCodingSolution(activeCodingAppId, activeCodingRound.id, {
        code: studentCode,
        language: selectedCodingLanguage,
        questionId: activeQ.id,
        timeTaken
      });
      setCodingSubSuccess(res);
      setActiveQuestionLockedId(null); // Unlock so candidate can pick another
      setRunResults([]);
      await loadData();

      // Check if ALL questions are now submitted → auto-end the test
      // We re-fetch latest app state after loadData
      setMyApplications((prevApps: any[]) => {
        if (!prevApps) return prevApps;
        const updatedApp = prevApps.find((a: any) => a.id === activeCodingAppId);
        if (!updatedApp) return prevApps;
        const updatedProgression = updatedApp.progressions?.find((p: any) => p.roundId === activeCodingRound?.id);
        // Count the submission we just made too
        const submittedIds = new Set([
          ...(updatedProgression?.codingSubmissions || []).map((s: any) => s.codingQuestionId),
          activeQ.id // include the just-submitted question
        ]);
        const allDone = codingChallenges.every((q: any) => submittedIds.has(q.id));
        if (allDone) {
          // Small delay so success screen shows briefly, then auto-close
          setTimeout(() => {
            setActiveCodingRound(null);
            setActiveCodingAppId(null);
            setCodingChallenges([]);
            setStudentCode('');
            setRunResults([]);
            setCodingSubSuccess(null);
            setActiveQuestionLockedId(null);
          }, 3000);
        }
        return prevApps;
      });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit solution');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleAutoSubmitCodingTest = async () => {
    const activeQ = codingChallengesRef.current[activeChallengeIdxRef.current];
    const rRound = activeCodingRoundRef.current;
    const rAppId = activeCodingAppIdRef.current;
    if (!rRound || !rAppId || !activeQ) return;
    setIsSubmittingCode(true);
    const timeTaken = codingStartTimeRef.current ? Math.floor((Date.now() - codingStartTimeRef.current) / 1000) : undefined;
    try {
      const res = await RoundService.submitCodingSolution(rAppId, rRound.id, {
        code: studentCodeRef.current,
        language: selectedCodingLanguageRef.current,
        questionId: activeQ.id,
        timeTaken
      });
      setCodingSubSuccess(res);
      setActiveQuestionLockedId(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to auto-submit solution');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Coding round timer ticking loop
  React.useEffect(() => {
    if (!activeCodingRound) return;

    const timer = setInterval(() => {
      setCodingTimeLeft(prev => {
        if (prev !== null) {
          if (prev <= 1) {
            clearInterval(timer);
            alert("Time limit reached! Submitting your current code.");
            handleAutoSubmitCodingTest();
            return 0;
          }
          return prev - 1;
        }
        return null;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeCodingRound]);

  if (loading) return <div className="p-8 text-center text-slate-600 font-medium">Loading placement dashboard...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('BROWSE')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'BROWSE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Briefcase className="h-4 w-4" /> Browse Jobs
        </button>
        <button 
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'APPLICATIONS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <FileText className="h-4 w-4" /> My Applications ({myApplications.length})
        </button>
        <button 
          onClick={() => setActiveTab('PROFILE')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'PROFILE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <User className="h-4 w-4" /> My Profile
        </button>
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${activeTab === 'ANALYTICS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 className="h-4 w-4" /> Analytics
        </button>
      </div>

      {/* BROWSE JOBS TAB */}
      {activeTab === 'BROWSE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-250 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                    <p className="text-blue-600 font-semibold text-sm flex items-center gap-1 mt-1">
                      <Building2 className="h-4 w-4" /> {job.recruiter.companyName}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <p className="text-sm text-slate-600 flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {job.location || 'Remote'}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-2"><DollarSign className="h-4 w-4 text-slate-400" /> {job.salaryRange || 'Not disclosed'}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" /> {job.jobType || 'Full-time'}</p>
                </div>
                {job.requirements && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Requirements</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{job.requirements}</p>
                  </div>
                )}
              </div>
              
              {myApplications.some(app => app.jobId === job.id) ? (
                <Button disabled className="w-full bg-green-50 text-green-700 border-none flex items-center justify-center font-bold">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Applied
                </Button>
              ) : (
                <Button onClick={() => setSelectedJob(job)} className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold transition-all duration-200">
                  Apply Now
                </Button>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p className="text-slate-500 col-span-3 text-center py-12">No open jobs at the moment.</p>}
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'APPLICATIONS' && (
        <div className="space-y-4">
          {myApplications.map(app => (
            <div key={app.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{app.job.title}</h3>
                  <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                    <Building2 className="h-4 w-4 text-slate-400" /> {app.job.recruiter.companyName}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Applied on {formatTimeAMPM(app.appliedAt)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {app.status === 'OFFERED' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleRespondToOffer(app.id, 'ACCEPTED')} 
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Accept Offer
                      </button>
                      <button 
                        onClick={() => handleRespondToOffer(app.id, 'DECLINED')} 
                        className="px-4 py-1.5 bg-red-50 text-red-655 hover:bg-red-100 rounded-xl text-xs font-bold transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold text-center self-start sm:self-auto ${
                    app.status === 'APPLIED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    app.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                    app.status === 'OFFERED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                    app.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    app.status === 'DECLINED' ? 'bg-red-50 text-red-655 border border-red-200' :
                    'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {app.status === 'OFFERED' ? 'OFFER RECEIVED 🎉' : app.status === 'ACCEPTED' ? 'HIRED 🎉' : app.status}
                  </span>
                  <button 
                    onClick={() => handleExpandApp(app)} 
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-900 transition-all self-start sm:self-auto border border-slate-200"
                  >
                    {expandedAppId === app.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandedAppId === app.id && (
                <div className="border-t border-slate-100 pt-5 mt-2 space-y-6">
                  {/* Interview Progression Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-blue-500" /> Interview Process Status
                    </h4>
                    {app.job.rounds && app.job.rounds.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {app.job.rounds.map((round: any, index: number) => {
                          const progression = app.progressions?.find((p: any) => p.roundId === round.id);
                          const isCurrent = progression?.status === 'PENDING';
                          const isPassed = progression?.status === 'QUALIFIED';
                          const isRejected = progression?.status === 'REJECTED';

                          return (
                            <div key={round.id} className={`p-4 rounded-2xl border ${
                              isCurrent ? 'bg-purple-50/50 border-purple-200 shadow-sm' :
                              isPassed ? 'bg-emerald-50/30 border-emerald-100' :
                              isRejected ? 'bg-red-50/30 border-red-100' :
                              'bg-slate-50/30 border-slate-100 opacity-60'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                  isCurrent ? 'bg-purple-100 text-purple-700' :
                                  isPassed ? 'bg-emerald-100 text-emerald-700' :
                                  isRejected ? 'bg-red-100 text-red-700' :
                                  'bg-slate-150 text-slate-500'
                                }`}>
                                  Round {index + 1}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider">
                                  {isCurrent ? <span className="text-purple-650 animate-pulse font-extrabold">In Progress</span> :
                                   isPassed ? <span className="text-emerald-600 font-bold">Passed</span> :
                                   isRejected ? <span className="text-red-500 font-bold">Rejected</span> :
                                   <span className="text-slate-400">Locked</span>}
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-800">{round.title}</h5>
                              <p className="text-xs text-slate-450 mt-1">{round.description || 'No description provided'}</p>
                              {round.instructions && <p className="text-xs text-blue-600 font-semibold mt-1">Instructions: {round.instructions}</p>}
                              
                              {round.type === 'MCQ' && (() => {
                                const now = new Date();
                                const roundNotStarted = round.startDate && now < new Date(round.startDate);
                                const roundEnded = round.endDate && now > new Date(round.endDate);
                                
                                return (
                                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-left">
                                    {round.isMcqPublished ? (
                                      progression?.mcqResponse ? (
                                        round.isMcqResultReleased ? (
                                          <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs font-bold border border-emerald-100">
                                            Score: {progression.mcqResponse.score} / {progression.mcqResponse.totalPossibleMarks} Marks
                                          </div>
                                        ) : (
                                          <div className="bg-blue-50 text-blue-800 p-2.5 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-1.5">
                                            <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" /> Exam Done. Results pending.
                                          </div>
                                        )
                                      ) : isCurrent ? (
                                        roundNotStarted ? (
                                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                            🔒 Test opens {formatTimeAMPM(round.startDate)}
                                          </span>
                                        ) : roundEnded ? (
                                          <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                                            ⚠️ Test closed on {formatTimeAMPM(round.endDate)}
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => handleStartMcqTest(app.id, round)}
                                            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200"
                                          >
                                            Take MCQ Test
                                          </button>
                                        )
                                      ) : (
                                        <span className="text-xs text-slate-400 italic font-medium block">Test not completed</span>
                                      )
                                    ) : (
                                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                        🔒 MCQ Test not published yet
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {round.type === 'CODING' && (() => {
                                const now = new Date();
                                const roundNotStarted = round.startDate && now < new Date(round.startDate);
                                const roundEnded = round.endDate && now > new Date(round.endDate);
                                
                                return (
                                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-left">
                                    {round.isCodingPublished ? (
                                      isCurrent ? (
                                        roundNotStarted ? (
                                          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                            🔒 Test opens {formatTimeAMPM(round.startDate)}
                                          </span>
                                        ) : roundEnded ? (
                                          <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                                            ⚠️ Test closed on {formatTimeAMPM(round.endDate)}
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => handleStartCodingTest(app.id, round)}
                                            className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200"
                                          >
                                            Enter Coding Test
                                          </button>
                                        )
                                      ) : (
                                        <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-xs font-bold border border-emerald-100 flex items-center gap-1.5">
                                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Coding Round Completed.
                                        </div>
                                      )
                                    ) : (
                                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                                        🔒 Coding Test not published yet
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {['TECHNICAL_INTERVIEW', 'HR_INTERVIEW'].includes(round.type) && (
                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-left">
                                  {progression?.meetLink && progression?.isMeetLinkPublished ? (
                                    <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 flex flex-col gap-2.5">
                                      <div className="flex items-center gap-2 text-indigo-850">
                                        <span className="text-lg">📹</span>
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">Interview Scheduled</p>
                                          <p className="text-xs text-slate-650">Your video call meeting link is ready. Click below to join.</p>
                                        </div>
                                      </div>
                                      <a
                                        href={progression.meetLink.startsWith('http') ? progression.meetLink : `https://${progression.meetLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full text-center py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 block"
                                      >
                                        Join Video Call
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center">
                                      <p className="text-xs font-semibold text-slate-500">Interview details and meeting link will be shared here soon.</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {progression?.feedback && (
                                <p className="text-xs text-purple-600 font-medium mt-2 bg-white p-2 rounded-xl border border-purple-100 italic">
                                  Feedback: "{progression.feedback}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Standard Direct Pipeline */
                      <div className="flex gap-2 text-center text-xs font-semibold text-slate-500">
                        <span className="flex-1 bg-emerald-50 text-emerald-700 py-2 rounded-xl border border-emerald-150">1. Applied</span>
                        <span className={`flex-1 py-2 rounded-xl border ${app.status !== 'APPLIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-50 border-slate-150'}`}>2. Shortlisted</span>
                        <span className={`flex-1 py-2 rounded-xl border ${['OFFERED', 'ACCEPTED', 'DECLINED'].includes(app.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-50 border-slate-150'}`}>3. Offered</span>
                        <span className={`flex-1 py-2 rounded-xl border ${app.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-slate-50 border-slate-150'}`}>4. Hired</span>
                      </div>
                    )}
                  </div>

                  {/* Communication Channel Inside Application */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-blue-500" /> Communication Hub
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[200px]">
                      {/* Channels list */}
                      <div className="md:col-span-1 border-r border-slate-100 pr-3 space-y-1">
                        {studentChannels.map(channel => {
                          const Icon = channel.icon;
                          const isSelected = selectedStudentChannelId === channel.id;
                          return (
                            <div
                              key={channel.id || 'general'}
                              onClick={() => handleSelectStudentChannel(app.jobId, channel.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                                isSelected 
                                  ? 'bg-blue-100 text-blue-750' 
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              <span className="truncate">{channel.title}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Channel messages */}
                      <div className="md:col-span-3 flex flex-col justify-between h-full min-h-[150px]">
                        <div className="flex-1 overflow-y-auto max-h-[180px] space-y-3 mb-2 pr-1">
                          {studentMessages.map((msg: any) => (
                            <div key={msg.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1">
                              <div className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-purple-700">{msg.senderName}</span>
                                <span className="text-slate-450">{formatTimeAMPM(msg.createdAt)}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                          ))}
                          {studentMessages.length === 0 && (
                            <p className="text-slate-400 text-xs text-center py-6">No announcements posted in this channel yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {myApplications.length === 0 && <p className="text-slate-500 text-center py-12">You haven't applied to any jobs yet.</p>}
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'PROFILE' && (
        <div className="max-w-3xl mx-auto">
          {!isEditingProfile ? (
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">{fullName || 'Student Profile'}</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">Update your professional details manually to stand out to recruiters</p>
                </div>
                <Button 
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-none font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all duration-200"
                >
                  <Edit2 className="h-4 w-4" /> Edit Profile
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-slate-400" /> Education
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-400">College / University</p>
                      <p className="text-slate-800 font-bold">{profile.college || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400">Branch / Specialization</p>
                      <p className="text-slate-800 font-bold">{profile.branch || 'Not specified'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-400">Graduation Year</p>
                        <p className="text-slate-800 font-bold">{profile.graduationYear || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">CGPA / Score</p>
                        <p className="text-slate-800 font-bold">{profile.cgpa ? `${profile.cgpa} / 10` : 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-slate-400" /> Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills ? profile.skills.split(',').map((skill, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-100">
                          {skill.trim()}
                        </span>
                      )) : <p className="text-slate-500 text-sm">No skills added yet.</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-slate-400" /> Key Projects
                  </h3>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{profile.projects || 'Tell recruiters about projects you have built...'}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-slate-400" /> Work / Internship Experience
                  </h3>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{profile.experience || 'Tell recruiters about internships, roles or freelancing experience...'}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Edit Profile Details</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1">Enter your details manually. All fields are optional but recommended.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input 
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">College / University</label>
                    <input 
                      type="text"
                      value={profile.college}
                      onChange={e => setProfile({...profile, college: e.target.value})}
                      placeholder="e.g. Stanford University"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Branch / Major</label>
                    <input 
                      type="text"
                      value={profile.branch}
                      onChange={e => setProfile({...profile, branch: e.target.value})}
                      placeholder="e.g. Computer Science"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Graduation Year</label>
                    <input 
                      type="number"
                      value={profile.graduationYear}
                      onChange={e => setProfile({...profile, graduationYear: e.target.value})}
                      placeholder="e.g. 2026"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">CGPA</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={profile.cgpa}
                      onChange={e => setProfile({...profile, cgpa: e.target.value})}
                      placeholder="e.g. 9.1"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills (Comma Separated)</label>
                  <input 
                    type="text"
                    value={profile.skills}
                    onChange={e => setProfile({...profile, skills: e.target.value})}
                    placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Projects</label>
                  <textarea 
                    rows={4}
                    value={profile.projects}
                    onChange={e => setProfile({...profile, projects: e.target.value})}
                    placeholder="e.g.
• PlacementIQ - Job application portal built using React and Node.js
• E-Commerce API - REST API built with Node/Express & PostgreSQL"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm whitespace-pre-wrap"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Work / Internship Experience</label>
                  <textarea 
                    rows={4}
                    value={profile.experience}
                    onChange={e => setProfile({...profile, experience: e.target.value})}
                    placeholder="e.g.
• Software Engineer Intern at Google (Summer 2025)
  Worked on cloud services logging API using Go."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm whitespace-pre-wrap"
                  />
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={savingProfile}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save Profile'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Applications</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.totalApplications}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hired Status</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.applications.ACCEPTED > 0 ? 'Placed 🎉' : 'In Progress'}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Jobs Open</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.totalOpenJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" /> Application Funnel Distribution
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Applied ({analytics.applications.APPLIED})</span>
                  <span>{analytics.totalApplications > 0 ? Math.round((analytics.applications.APPLIED / analytics.totalApplications) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.totalApplications > 0 ? (analytics.applications.APPLIED / analytics.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Shortlisted ({analytics.applications.SHORTLISTED})</span>
                  <span>{analytics.totalApplications > 0 ? Math.round((analytics.applications.SHORTLISTED / analytics.totalApplications) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.totalApplications > 0 ? (analytics.applications.SHORTLISTED / analytics.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Offered ({analytics.applications.OFFERED})</span>
                  <span>{analytics.totalApplications > 0 ? Math.round((analytics.applications.OFFERED / analytics.totalApplications) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.totalApplications > 0 ? (analytics.applications.OFFERED / analytics.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Hired ({analytics.applications.ACCEPTED})</span>
                  <span>{analytics.totalApplications > 0 ? Math.round((analytics.applications.ACCEPTED / analytics.totalApplications) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.totalApplications > 0 ? (analytics.applications.ACCEPTED / analytics.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                  <span>Rejected ({analytics.applications.REJECTED})</span>
                  <span>{analytics.totalApplications > 0 ? Math.round((analytics.applications.REJECTED / analytics.totalApplications) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                  <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${analytics.totalApplications > 0 ? (analytics.applications.REJECTED / analytics.totalApplications) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 transition-opacity duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all">
            <h2 className="text-2xl font-black mb-2 text-slate-900">Apply for {selectedJob.title}</h2>
            <p className="text-blue-600 font-semibold text-sm flex items-center gap-1 mb-6">
              <Building2 className="h-4 w-4" /> {selectedJob.recruiter.companyName}
            </p>
            
            <form onSubmit={handleApply} className="space-y-4">
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
                {/* Job Overview */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 text-left">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Job Description</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedJob.description}</p>
                  </div>
                  {selectedJob.requirements && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Requirements</h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedJob.requirements}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-500 pt-3 border-t border-slate-200/60">
                    <div>📍 {selectedJob.location || 'Remote'}</div>
                    <div>💰 {selectedJob.salaryRange || 'Not disclosed'}</div>
                    <div>💼 {selectedJob.jobType || 'Full-time'}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cover Letter / Pitch</label>
                  <textarea 
                    required 
                    rows={4}
                    value={coverLetter}
                    onChange={e => setCoverLetter(e.target.value)}
                    placeholder="Tell the recruiter why you are a great fit..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm whitespace-pre-wrap"
                  />
                </div>

                {Array.isArray(selectedJob.questions) && selectedJob.questions.length > 0 && (
                  <div className="space-y-4 pt-2 text-left">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Screening Questions</h3>
                    {(selectedJob.questions as string[]).map((q: string, i: number) => (
                      <div key={i}>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{q}</label>
                        <input 
                          required 
                          type="text"
                          value={answers[q] || ''}
                          onChange={e => setAnswers({ ...answers, [q]: e.target.value })}
                          placeholder="Your answer..."
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-slate-800 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setSelectedJob(null)} className="flex-1 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all">Submit Application</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MCQ Exam Modal Overlay */}
      {activeMcqRound && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl relative overflow-hidden transform scale-100 transition-all my-8">
            {isTestSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-900">Exam Done!</h2>
                <p className="text-slate-650 text-sm max-w-md mx-auto">
                  Your response has been successfully submitted. The recruiter will review and release the results.
                </p>
                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setActiveMcqRound(null);
                      setActiveMcqAppId(null);
                      setMcqQuestions([]);
                      setStudentMcqAnswers({});
                      setIsTestSubmitted(false);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{activeMcqRound.title} - MCQ Test</h2>
                    <p className="text-slate-500 text-xs mt-1">
                      Please read the questions carefully and select the correct answer(s).
                    </p>
                  </div>
                  {/* Overall test timer */}
                  <div className="flex items-center gap-4">
                    {overallTimeLeft !== null && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-700 flex items-center gap-1">
                        ⏱️ Total: {Math.floor(overallTimeLeft / 60)}:{(overallTimeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to exit? Your progress in this test will not be saved.")) {
                          setActiveMcqRound(null);
                          setActiveMcqAppId(null);
                          setMcqQuestions([]);
                          setStudentMcqAnswers({});
                        }
                      }}
                      className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-slate-150"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
                  {/* Question Navigator */}
                  {!mcqQuestions.some(q => q.duration) && (
                    <div className="flex flex-wrap gap-2 mb-4">
                    {mcqQuestions.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`w-9 h-9 rounded-xl font-bold text-sm transition-all duration-200 ${
                          currentQuestionIndex === idx
                            ? 'bg-blue-600 text-white shadow-sm'
                            : studentMcqAnswers[mcqQuestions[idx].id]?.length > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-150'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  )}

                  {mcqQuestions[currentQuestionIndex] && (() => {
                    const q = mcqQuestions[currentQuestionIndex];
                    const isMulti = q.type === 'MULTIPLE';
                    const selectedOptions = studentMcqAnswers[q.id] || [];
                    return (
                      <div className="space-y-4 text-left border border-slate-100 p-6 rounded-2xl bg-slate-50/30">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-blue-650 bg-blue-50 px-2.5 py-1 rounded-lg">
                            Question {currentQuestionIndex + 1} of {mcqQuestions.length} ({q.marks} {q.marks === 1 ? 'Mark' : 'Marks'})
                          </span>
                          {questionTimeLeft !== null && (
                            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              ⏱️ Question Time: {Math.floor(questionTimeLeft / 60)}:{(questionTimeLeft % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <p className="text-base font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">{q.questionText}</p>
                        
                        <div className="grid grid-cols-1 gap-2.5 pt-2">
                          {(q.options as string[]).map((option, oIdx) => {
                            const isSelected = selectedOptions.includes(oIdx);
                            return (
                              <div
                                key={oIdx}
                                onClick={() => handleToggleMcqOption(q.id, oIdx, isMulti)}
                                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border transition-all duration-200 select-none ${
                                  isSelected
                                    ? 'bg-blue-50/50 border-blue-300 text-blue-900 font-semibold shadow-sm'
                                    : 'bg-white border-slate-150 hover:bg-slate-50/40 text-slate-700'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs ${
                                  isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-slate-400 bg-white'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </div>
                                <span className="text-sm font-medium">{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {mcqQuestions.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-12">No questions defined for this test.</p>
                  )}

                  {/* Navigation Buttons */}
                  {mcqQuestions.length > 0 && (
                    <div className="flex gap-3 pt-2">
                      {!mcqQuestions.some(q => q.duration) && currentQuestionIndex > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                          className="flex-1 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl"
                        >
                          Previous
                        </Button>
                      )}
                      {currentQuestionIndex < mcqQuestions.length - 1 && (
                        <Button
                          type="button"
                          onClick={() => {
                            const nextIdx = currentQuestionIndex + 1;
                            setCurrentQuestionIndex(nextIdx);
                            const nextQ = mcqQuestions[nextIdx];
                            if (mcqQuestions.some(q => q.duration)) {
                              setQuestionTimeLeft(nextQ.duration ? Number(nextQ.duration) : null);
                            }
                          }}
                          className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all"
                        >
                          Next Question
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (confirm("Are you sure you want to exit? Your progress in this test will not be saved.")) {
                        setActiveMcqRound(null);
                        setActiveMcqAppId(null);
                        setMcqQuestions([]);
                        setStudentMcqAnswers({});
                      }
                    }}
                    className="flex-1 font-bold border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl"
                  >
                    Cancel / Exit
                  </Button>
                  <Button
                    onClick={handleSubmitMcqTest}
                    disabled={submittingMcq || mcqQuestions.length === 0}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    {submittingMcq ? 'Submitting Test...' : 'Submit Final Test'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CODING EXAM MODAL IDE OVERLAY */}
      {activeCodingRound && (() => {
        const app = myApplications?.find((a: any) => a.id === activeCodingAppId);
        const progression = app?.progressions?.find((p: any) => p.roundId === activeCodingRound.id);
        const activeQ = codingChallenges[activeChallengeIdx];

        return (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-6 max-w-6xl w-full shadow-2xl relative flex flex-col h-[90vh] animate-in fade-in zoom-in-95 duration-200">
              {codingSubSuccess ? (
                <div className="text-center py-12 space-y-6 flex-1 flex flex-col justify-center items-center">
                  <div className="mx-auto w-20 h-20 bg-emerald-950 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-850 animate-bounce">
                    <CheckCircle2 className="h-12 w-12" />
                  </div>
                  <h2 className="text-3xl font-black text-white">Question Submitted!</h2>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 max-w-md w-full text-left space-y-3 font-semibold text-slate-300">
                    <p>Language used: <span className="text-white uppercase font-extrabold">{codingSubSuccess.submission?.language}</span></p>
                    <p>Passed test cases: <span className="text-white font-extrabold">{codingSubSuccess.passedCount} / {codingSubSuccess.totalCount}</span></p>
                    <p>Score obtained: <span className="text-purple-400 font-extrabold">{codingSubSuccess.score} Marks</span></p>
                  </div>
                  <p className="text-slate-400 text-sm max-w-md">
                    Your code has been graded and stored. You may now select another question or exit the workspace.
                  </p>
                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={() => { setCodingSubSuccess(null); }}
                      className="bg-slate-850 hover:bg-slate-800 text-slate-200 font-bold px-6 py-3 rounded-xl transition-all"
                    >
                      Select Another Question
                    </Button>
                    <Button
                      onClick={handleExitCodingTest}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-750 hover:to-indigo-750 text-white font-bold px-6 py-3 rounded-xl transition-all border-none"
                    >
                      Exit Test
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                        Coding Workspace - {activeCodingRound.title}
                      </h2>
                      <p className="text-slate-400 text-xs mt-0.5">
                        {activeQuestionLockedId
                          ? <span className="text-red-400 font-bold">🔒 Question Locked — Submit to unlock and pick another</span>
                          : <span className="text-amber-400 font-bold">👈 Select a question from the left to start coding</span>
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Timer */}
                      {codingTimeLeft !== null && (
                        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-450 flex items-center gap-1">
                          ⏱️ Time Left: {Math.floor(codingTimeLeft / 60)}:{(codingTimeLeft % 60).toString().padStart(2, '0')}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleExitCodingTest}
                        className="p-1.5 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white border border-slate-800"
                        title="Exit Test (Permanent)"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Main Dual-Pane Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 flex-1 min-h-0">

                    {/* LEFT: Question List Panel — always visible */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-3 flex flex-col gap-2 overflow-y-auto">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1 mb-1">Questions</p>
                      {codingChallenges.map((q, idx) => {
                        const isSubmitted = progression?.codingSubmissions?.some((s: any) => s.codingQuestionId === q.id);
                        const isLocked = activeQuestionLockedId === q.id;
                        const isActive = activeChallengeIdx === idx;
                        return (
                          <button
                            key={q.id}
                            onClick={() => {
                              if (isSubmitted) return; // Can't re-select submitted
                              if (activeQuestionLockedId && activeQuestionLockedId !== q.id) {
                                // Currently locked on another — can't switch
                                alert('You must submit the current question before selecting another.');
                                return;
                              }
                              handleSelectChallenge(idx);
                            }}
                            disabled={isSubmitted}
                            className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all border ${
                              isSubmitted
                                ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400 cursor-not-allowed opacity-80'
                                : isLocked
                                ? 'bg-red-950/40 border-red-700/50 text-red-300'
                                : isActive && !activeQuestionLockedId
                                ? 'bg-slate-800 border-slate-700 text-white'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate pr-1">{idx + 1}. {q.title}</span>
                              {isSubmitted ? <span>✓</span> : isLocked ? <span>🔒</span> : null}
                            </div>
                            <div className="flex items-center gap-2 mt-1 font-semibold">
                              <span className="text-slate-500">{q.marks} marks</span>
                              {q.maxRunAttempts != null && !isSubmitted && (
                                <span className={`${
                                  (runCountPerQuestion[q.id] || 0) >= q.maxRunAttempts
                                    ? 'text-red-400'
                                    : 'text-amber-500'
                                }`}>
                                  {q.maxRunAttempts - (runCountPerQuestion[q.id] || 0)} runs left
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* RIGHT: Editor Area */}
                    {activeQ ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                        {/* Left Pane: Challenge Info */}
                        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col h-full min-h-0 text-left overflow-y-auto">
                          <h3 className="text-lg font-bold text-white mb-2">{activeQ.title}</h3>
                          
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[10px] font-black uppercase bg-slate-850 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                              Marks: {activeQ.marks}
                            </span>
                            {activeQ.maxRunAttempts != null && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                (runCountPerQuestion[activeQ.id] || 0) >= activeQ.maxRunAttempts
                                  ? 'bg-red-950/40 text-red-400 border-red-900/40'
                                  : 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                              }`}>
                                Runs: {runCountPerQuestion[activeQ.id] || 0} / {activeQ.maxRunAttempts}
                              </span>
                            )}
                            {activeQ.constraints && (
                              <span className="text-[10px] font-semibold bg-purple-950/40 text-purple-450 px-2 py-0.5 rounded border border-purple-900/40">
                                {activeQ.constraints}
                              </span>
                            )}
                          </div>

                          <div className="prose prose-invert max-w-none mb-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{activeQ.description}</p>
                          </div>

                          {/* Visible public test cases */}
                          <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Visible Test Cases</h4>
                            <div className="space-y-3">
                              {activeQ.testCases?.map((tc: any, index: number) => (
                                <div key={tc.id || index} className="bg-slate-900 border border-slate-850/80 p-3.5 rounded-xl space-y-2 text-xs font-mono">
                                  <div>
                                    <span className="text-slate-500 font-bold">Input:</span>
                                    <pre className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-350 mt-1">{tc.input}</pre>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 font-bold">Expected Output:</span>
                                    <pre className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-slate-350 mt-1">{tc.output}</pre>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right Pane: Code Editor & Exec Console */}
                        <div className="flex flex-col h-full min-h-0 space-y-4">
                          {activeQuestionLockedId === activeQ.id ? (
                            <>
                              {/* Editor Window */}
                              <div className="bg-slate-950 border border-slate-850 rounded-2xl flex-1 flex flex-col min-h-0 overflow-hidden relative">
                            <div className="flex justify-between items-center px-4 py-2 bg-slate-900/80 border-b border-slate-850">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider">Editor Workspace</span>
                              
                              <select
                                value={selectedCodingLanguage}
                                onChange={(e) => handleCodingLanguageChange(e.target.value)}
                                className="bg-slate-950 text-slate-300 border border-slate-800 px-2 py-1 rounded text-xs outline-none focus:border-slate-650"
                              >
                                <option value="javascript">JavaScript</option>
                                <option value="cpp">C++</option>
                                <option value="java">Java</option>
                                <option value="python">Python</option>
                              </select>
                            </div>

                            <textarea
                              value={studentCode}
                              onChange={(e) => setStudentCode(e.target.value)}
                              className="flex-1 bg-slate-950 text-slate-200 p-4 font-mono text-sm leading-relaxed outline-none border-none resize-none focus:ring-0 whitespace-pre"
                              placeholder="// Write your code here..."
                            />

                            {/* Output Panel */}
                            <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col h-44 min-h-0 text-left">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider mb-2">Execution Console</span>
                              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1.5 pr-1 text-slate-300">
                                {runResults.length > 0 ? (
                                  runResults.map((res, i) => (
                                    <div key={i} className={`p-2.5 rounded-lg border ${
                                      (res.passed || res.status === 'PASSED') ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-450' : 'bg-red-950/20 border-red-900/40 text-red-450'
                                    }`}>
                                      <p className="font-bold">Test Case {i + 1}: {res.status}</p>
                                      {res.error && <p className="text-[10px] mt-1 text-red-300 whitespace-pre-wrap">{res.error}</p>}
                                      {!res.error && res.actualOutput && (
                                        <p className="text-[10px] mt-0.5 text-slate-350">Output: "{res.actualOutput}"</p>
                                      )}
                                    </div>
                                  ))
                                ) : isRunningCode ? (
                                  <p className="text-slate-450 italic animate-pulse">Running test cases locally...</p>
                                ) : (
                                  <p className="text-slate-500 italic">Click "Run Code" to test against public test cases.</p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 p-4 border-t border-slate-850 bg-slate-900/30">
                              <button
                                type="button"
                                onClick={handleExitCodingTest}
                                className="flex-1 bg-slate-850 hover:bg-slate-800 text-slate-350 border border-slate-800 font-bold py-3 rounded-xl transition-all text-xs"
                              >
                                Exit Workspace
                              </button>
                              <button
                                type="button"
                                onClick={handleRunCodingTest}
                                disabled={isRunningCode || isSubmittingCode || (activeQ.maxRunAttempts != null && (runCountPerQuestion[activeQ.id] || 0) >= activeQ.maxRunAttempts)}
                                title={activeQ.maxRunAttempts != null && (runCountPerQuestion[activeQ.id] || 0) >= activeQ.maxRunAttempts ? 'Run limit reached' : 'Run against public test cases'}
                                className="flex-1 bg-slate-800 hover:bg-slate-755 text-slate-200 border border-slate-750 font-bold py-3 rounded-xl transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isRunningCode ? 'Running...' : activeQ.maxRunAttempts != null
                                  ? `Run Code (${Math.max(0, activeQ.maxRunAttempts - (runCountPerQuestion[activeQ.id] || 0))} left)`
                                  : 'Run Code'
                                }
                              </button>
                              <button
                                type="button"
                                onClick={handleSubmitCodingTest}
                                disabled={isRunningCode || isSubmittingCode}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all border-none text-xs"
                              >
                                {isSubmittingCode ? 'Evaluating...' : 'Submit Solution'}
                              </button>
                            </div>
                          </div>
                          </>
                        ) : (
                            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                                <Lock className="h-8 w-8 text-slate-500" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-3">Ready to solve this?</h3>
                              <p className="text-sm text-slate-400 mb-8 max-w-sm leading-relaxed mx-auto">
                                You can browse other questions freely. Once you start coding, you will be locked into this question until you submit your solution.
                              </p>
                              <Button 
                                onClick={() => {
                                  if (confirm("Are you sure you want to start this question? You will be locked into it until you submit.")) {
                                    setActiveQuestionLockedId(activeQ.id);
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl text-sm"
                              >
                                Start Coding this Question
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* No question locked yet — show instruction */
                      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-lg mx-auto py-12">
                        <div className="p-4 bg-slate-850 rounded-full border border-slate-800 text-purple-400">
                          <Layers className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Select a Question to Start</h3>
                        <p className="text-slate-450 text-sm leading-relaxed">
                          Browse all questions in the left panel. <strong className="text-white">Click any question</strong> to immediately lock it and begin coding.
                          Once locked, you cannot switch to another question until you submit your current solution.
                        </p>
                        <p className="text-slate-500 text-xs">
                          ✅ Submitted questions are marked with a checkmark and cannot be re-selected.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* CODING TEST DONE SUMMARY MODAL */}
      {codingTestDoneSummary && (() => {
        const { questions, submissions, exited } = codingTestDoneSummary;
        const totalScore = submissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0);
        const maxScore = questions.reduce((sum: number, q: any) => sum + (q.marks || 0), 0);
        const totalPassed = submissions.reduce((sum: number, s: any) => sum + (s.passedCasesCount || 0), 0);
        const totalCases = submissions.reduce((sum: number, s: any) => sum + (s.totalCasesCount || 0), 0);

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
              {/* Header */}
              <div className="text-center mb-6">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  exited ? 'bg-amber-950 border border-amber-800' : 'bg-emerald-950 border border-emerald-800'
                }`}>
                  <span className="text-3xl">{exited ? '🚪' : '✅'}</span>
                </div>
                <h2 className="text-2xl font-black text-white">
                  {exited ? 'Test Ended' : 'Test Complete!'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {exited
                    ? 'You exited the coding test. This session is permanently closed.'
                    : 'You have submitted all questions. Great work!'}
                </p>
              </div>

              {/* Overall Score Banner */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</p>
                  <p className="text-3xl font-black text-white mt-0.5">
                    {totalScore} <span className="text-slate-500 text-lg font-semibold">/ {maxScore}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Test Cases</p>
                  <p className="text-3xl font-black text-emerald-400 mt-0.5">
                    {totalPassed} <span className="text-slate-500 text-lg font-semibold">/ {totalCases}</span>
                  </p>
                </div>
              </div>

              {/* Per-question Breakdown */}
              <div className="space-y-3 mb-6">
                {questions.map((q: any, idx: number) => {
                  const sub = submissions.find((s: any) => s.codingQuestionId === q.id);
                  return (
                    <div key={q.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          sub ? 'bg-emerald-900 text-emerald-400' : 'bg-slate-700 text-slate-500'
                        }`}>
                          {sub ? '✓' : idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-200 truncate">{q.title}</span>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {sub ? (
                          <>
                            <p className="text-xs font-bold text-slate-300">
                              <span className="text-emerald-400">{sub.passedCasesCount}</span>
                              <span className="text-slate-500"> / {sub.totalCasesCount} cases</span>
                            </p>
                            <p className="text-[10px] text-purple-400 font-bold">{sub.score} / {q.marks} marks</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 font-semibold italic">Not submitted</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setCodingTestDoneSummary(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
