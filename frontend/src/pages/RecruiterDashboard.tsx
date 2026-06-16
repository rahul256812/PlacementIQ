import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatTimeAMPM } from '../utils/dateFormatter';
import { JobService, ApplicationService, AnalyticsService, RoundService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { 
  Briefcase, 
  Users, 
  CheckCircle2, 
  BarChart3, 
  FileText,
  User,
  GraduationCap,
  Award,
  BookOpen,
  Mail,
  AlertCircle,
  MessageSquare,
  Send,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Volume2,
  Layers,
  History,
  X,
  ArrowLeft,
  Edit3,
  Sparkles,
  RefreshCw
} from 'lucide-react';

const formatDatetimeLocal = (dateString: string | null | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function RecruiterDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJob, setNewJob] = useState<{
    title: string;
    description: string;
    requirements: string;
    location: string;
    salaryRange: string;
    jobType: string;
    questions: string[];
    applyStartDate: string;
    applyEndDate: string;
    rounds: any[];
  }>({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salaryRange: '',
    jobType: 'Full-time',
    questions: [],
    applyStartDate: '',
    applyEndDate: '',
    rounds: []
  });
  const [questionInput, setQuestionInput] = useState('');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ['JOBS', 'ANALYTICS', 'MESSAGES', 'HISTORY'].includes(tabParam || '') ? tabParam as any : 'JOBS';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [jobToDelete, setJobToDelete] = useState<{ id: string, title: string } | null>(null);
  
  // MCQ Configuration State
  const [activeMcqRound, setActiveMcqRound] = useState<any | null>(null);
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [mcqSortOrder, setMcqSortOrder] = useState<'DEFAULT' | 'HIGH_TO_LOW' | 'LOW_TO_HIGH'>('DEFAULT');
  
  // Coding Configuration State
  const [activeCodingRound, setActiveCodingRound] = useState<any | null>(null);
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null); // null = view list, non-null = edit or new
  const [codingTitle, setCodingTitle] = useState('');
  const [codingDescription, setCodingDescription] = useState('');
  const [codingConstraints, setCodingConstraints] = useState('');
  const [codingMarks, setCodingMarks] = useState('10');
  const [codingTestCases, setCodingTestCases] = useState<any[]>([]);
  const [codingStarterCode, setCodingStarterCode] = useState<Record<string, string>>({
    javascript: 'function solve() {\n  // Write JavaScript here\n}',
    python: 'def solve():\n    # Write Python here\n    pass',
    typescript: 'function solve(): void {\n  // Write TypeScript here\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ here\n    return 0;\n}',
    java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write Java here\n    }\n}'
  });
  const [selectedStarterLang, setSelectedStarterLang] = useState('javascript');
  const [mcqDurationInput, setMcqDurationInput] = useState<string>('');
  const [codingDurationInput, setCodingDurationInput] = useState<string>('');
  const [codingMaxRunAttemptsInput, setCodingMaxRunAttemptsInput] = useState<string>('');

  // Communication Hub State
  const [selectedMsgJobId, setSelectedMsgJobId] = useState<string | null>(null);
  const [msgChannels, setMsgChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null); // null = General
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [meetLinkInput, setMeetLinkInput] = useState('');
  const [isMeetLinkPublished, setIsMeetLinkPublished] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null); // For viewing detailed candidate profiles

  // AI Screening States
  const [isScreeningModalOpen, setIsScreeningModalOpen] = useState(false);
  const [screeningKeywords, setScreeningKeywords] = useState('');
  const [isScreeningLoading, setIsScreeningLoading] = useState(false);
  const [aiSortOrder, setAiSortOrder] = useState<'NONE' | 'HIGH_TO_LOW' | 'LOW_TO_HIGH'>('NONE');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRunScreening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!screeningKeywords || !screeningKeywords.trim()) {
      alert("Please enter keywords or job requirements to run screening.");
      return;
    }
    setIsScreeningLoading(true);
    try {
      const data = await ApplicationService.aiScreenApplicants(selectedJobId!, screeningKeywords);
      setApplicants(data);
      alert("AI Screening completed successfully!");
      setIsScreeningModalOpen(false);
      // Auto-set sorting to show highest matches first
      setAiSortOrder('HIGH_TO_LOW');
      setMcqSortOrder('DEFAULT');
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to run AI screening");
    } finally {
      setIsScreeningLoading(false);
    }
  };

  const selectedMsgJob = jobs.find(j => j.id === selectedMsgJobId);
  const isSelectedMsgJobClosed = selectedMsgJob ? !selectedMsgJob.isOpen : false;

  useEffect(() => {
    if (selectedApplicant) {
      const activeProgression = selectedApplicant.progressions?.find((p: any) => p.status === 'PENDING');
      if (activeProgression) {
        setMeetLinkInput(activeProgression.meetLink || '');
        setIsMeetLinkPublished(activeProgression.isMeetLinkPublished || false);
      } else {
        setMeetLinkInput('');
        setIsMeetLinkPublished(false);
      }
    } else {
      setMeetLinkInput('');
      setIsMeetLinkPublished(false);
    }
  }, [selectedApplicant]);

  useEffect(() => {
    if (user?.status === 'APPROVED') {
      loadJobs();
      loadAnalytics();
      loadHistoryLogs();
    }
  }, [user]);

  const loadHistoryLogs = async () => {
    try {
      const data = await JobService.getJobHistory();
      setActivityLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadJobs = async () => {
    try {
      const data = await JobService.getRecruiterJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAnalytics = async () => {
    try {
      const data = await AnalyticsService.getRecruiterAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadApplicants = async (jobId: string) => {
    try {
      const data = await ApplicationService.getJobApplicants(jobId);
      setApplicants(data);
      setSelectedJobId(jobId);
      setSelectedApplicant(null); // Clear selected applicant details
      
      // Fetch rounds dynamically to guarantee they are always up to date on selection
      const rounds = await RoundService.getRounds(jobId);
      setJobs(prevJobs => prevJobs.map(j => j.id === jobId ? { ...j, rounds } : j));
    } catch (e) {
      console.error(e);
    }
  };

  const handleManageMcqQuestions = async (round: any) => {
    setActiveMcqRound(round);
    setMcqDurationInput(round.mcqDuration ? String(round.mcqDuration) : '');
    try {
      const data = await RoundService.getMcqQuestions(round.id);
      setMcqQuestions(data.map((q: any) => ({
        id: q.id,
        questionText: q.questionText,
        imageBlob: q.imageBlob,
        type: q.type,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]"),
        correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : JSON.parse(q.correctAnswers || "[]"),
        marks: q.marks || 1,
        duration: q.duration !== null && q.duration !== undefined ? String(q.duration) : ''
      })));
    } catch (e) {
      console.error(e);
      setMcqQuestions([]);
    }
  };

  const handleSaveMcqQuestions = async () => {
    if (!activeMcqRound) return;
    try {
      for (const q of mcqQuestions) {
        if (!q.questionText.trim()) {
          alert("All questions must have a question text.");
          return;
        }
        if (q.options.length < 2) {
          alert("All questions must have at least 2 options.");
          return;
        }
        if (q.correctAnswers.length === 0) {
          alert(`Please select at least one correct answer for the question: "${q.questionText}"`);
          return;
        }
      }
      
      const overallDuration = mcqDurationInput.trim() ? parseInt(mcqDurationInput) : null;
      await RoundService.saveMcqQuestions(activeMcqRound.id, mcqQuestions, overallDuration);
      alert("MCQ questions saved successfully!");
      setActiveMcqRound(null);
      await loadJobs();
      if (selectedJobId) {
        await loadApplicants(selectedJobId);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save MCQ questions");
    }
  };

  const handleManageCodingQuestion = async (round: any) => {
    setActiveCodingRound(round);
    setEditingQuestion(null);
    setCodingDurationInput(round.codingDuration ? String(round.codingDuration) : '');
    await refreshCodingQuestions(round.id);
  };

  const refreshCodingQuestions = async (roundId: string) => {
    try {
      const data = await RoundService.getCodingQuestion(roundId);
      setCodingQuestions(Array.isArray(data) ? data : (data ? [data] : []));
    } catch (e) {
      console.error(e);
      setCodingQuestions([]);
    }
  };

  const handleStartAddQuestion = () => {
    setEditingQuestion({ isNew: true });
    setCodingTitle('');
    setCodingDescription('');
    setCodingConstraints('');
    setCodingMarks('10');
    setCodingMaxRunAttemptsInput('');
    setCodingTestCases([]);
    setCodingStarterCode({
      javascript: 'function solve() {\n  // Write JavaScript here\n}',
      python: 'def solve():\n    # Write Python here\n    pass',
      typescript: 'function solve(): void {\n  // Write TypeScript here\n}',
      cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write C++ here\n    return 0;\n}',
      java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Write Java here\n    }\n}'
    });
  };

  const handleStartEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setCodingTitle(q.title || '');
    setCodingDescription(q.description || '');
    setCodingConstraints(q.constraints || '');
    setCodingMarks(q.marks ? String(q.marks) : '10');
    setCodingMaxRunAttemptsInput(q.maxRunAttempts != null ? String(q.maxRunAttempts) : '');
    setCodingTestCases(q.testCases || []);
    if (q.starterCode) {
      setCodingStarterCode(prev => ({
        ...prev,
        ...(typeof q.starterCode === 'string' ? JSON.parse(q.starterCode) : q.starterCode)
      }));
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeCodingRound) return;
    if (!confirm('Are you sure you want to delete this coding question?')) return;
    try {
      await RoundService.deleteCodingQuestion(activeCodingRound.id, questionId);
      alert('Question deleted successfully!');
      await refreshCodingQuestions(activeCodingRound.id);
      await loadJobs();
    } catch (e) {
      console.error(e);
      alert('Failed to delete coding question');
    }
  };

  const handleSaveCodingQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCodingRound || !editingQuestion) return;
    try {
      await RoundService.saveCodingQuestion(activeCodingRound.id, {
        id: editingQuestion.id,
        title: codingTitle,
        description: codingDescription,
        constraints: codingConstraints,
        starterCode: codingStarterCode,
        testCases: codingTestCases,
        marks: Number(codingMarks),
        codingDuration: codingDurationInput.trim() ? Number(codingDurationInput) : null,
        maxRunAttempts: codingMaxRunAttemptsInput.trim() ? Number(codingMaxRunAttemptsInput) : null
      });
      alert('Coding challenge saved successfully!');
      setEditingQuestion(null);
      await refreshCodingQuestions(activeCodingRound.id);
      await loadJobs();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to save coding question';
      const details = err.response?.data?.details;
      alert(details ? `${errMsg}\nDetails: ${details}` : errMsg);
    }
  };

  const handlePublishMcq = async (roundId: string) => {
    try {
      await RoundService.publishMcqTest(roundId);
      alert("MCQ Test published to candidates successfully!");
      await loadJobs();
    } catch (e) {
      console.error(e);
      alert("Failed to publish MCQ test");
    }
  };

  const handlePublishCoding = async (roundId: string) => {
    try {
      await RoundService.publishCodingTest(roundId);
      alert("Coding Round published to candidates successfully!");
      await loadJobs();
    } catch (e) {
      console.error(e);
      alert("Failed to publish Coding round");
    }
  };

  const handleReleaseMcqResults = async (roundId: string) => {
    try {
      await RoundService.releaseMcqResults(roundId);
      alert("Test results released. Candidates can now view their scores!");
      await loadJobs();
    } catch (e) {
      console.error(e);
      alert("Failed to release MCQ results");
    }
  };

  const handleMcqImageUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const updated = [...mcqQuestions];
      updated[index].imageBlob = reader.result as string;
      setMcqQuestions(updated);
    };
    reader.readAsDataURL(file);
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobData = { ...newJob };
      if (questionInput.trim()) {
        jobData.questions = [...jobData.questions, questionInput.trim()];
      }

      if (editingJobId) {
        await JobService.updateJob(editingJobId, jobData);
        await RoundService.saveRounds(editingJobId, newJob.rounds);
        alert('Job updated successfully!');
      } else {
        const createdJob = await JobService.createJob(jobData);
        await RoundService.saveRounds(createdJob.id, newJob.rounds);
        alert('Job published successfully!');
      }

      setShowNewJob(false);
      setEditingJobId(null);
      loadJobs();
      loadAnalytics();
      setNewJob({ title: '', description: '', requirements: '', location: '', salaryRange: '', jobType: 'Full-time', questions: [], applyStartDate: '', applyEndDate: '', rounds: [] });
      setQuestionInput('');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to post job');
    }
  };

  const handleStartEditJob = async (jobId: string) => {
    const jobToEdit = jobs.find(j => j.id === jobId);
    if (jobToEdit) {
      let jobRounds: any[] = [];
      try {
        jobRounds = await RoundService.getRounds(jobId);
      } catch (err) {
        console.error(err);
      }
      setNewJob({
        title: jobToEdit.title,
        description: jobToEdit.description,
        requirements: jobToEdit.requirements,
        location: jobToEdit.location || '',
        salaryRange: jobToEdit.salaryRange || '',
        jobType: jobToEdit.jobType || 'Full-time',
        questions: Array.isArray(jobToEdit.questions) ? jobToEdit.questions : [],
        applyStartDate: formatDatetimeLocal(jobToEdit.applyStartDate),
        applyEndDate: formatDatetimeLocal(jobToEdit.applyEndDate),
        rounds: jobRounds.map((r: any) => ({
          ...r,
          startDate: formatDatetimeLocal(r.startDate),
          endDate: formatDatetimeLocal(r.endDate)
        }))
      });
      setQuestionInput('');
      setEditingJobId(jobId);
      setShowNewJob(true);
      setSelectedApplicant(null);
    }
  };

  const addRound = () => {
    setNewJob({
      ...newJob,
      rounds: [
        ...newJob.rounds,
        { title: '', type: 'TECHNICAL_INTERVIEW', format: 'ONLINE', description: '', instructions: '', startDate: '', endDate: '' }
      ]
    });
  };

  const removeRound = (index: number) => {
    setNewJob({
      ...newJob,
      rounds: newJob.rounds.filter((_, i) => i !== index)
    });
  };

  const updateRound = (index: number, key: string, value: any) => {
    const updatedRounds = [...newJob.rounds];
    updatedRounds[index] = { ...updatedRounds[index], [key]: value };
    setNewJob({ ...newJob, rounds: updatedRounds });
  };

  const moveRoundUp = (index: number) => {
    if (index === 0) return;
    const updatedRounds = [...newJob.rounds];
    const temp = updatedRounds[index - 1];
    updatedRounds[index - 1] = updatedRounds[index];
    updatedRounds[index] = temp;
    setNewJob({ ...newJob, rounds: updatedRounds });
  };

  const moveRoundDown = (index: number) => {
    if (index === newJob.rounds.length - 1) return;
    const updatedRounds = [...newJob.rounds];
    const temp = updatedRounds[index + 1];
    updatedRounds[index + 1] = updatedRounds[index];
    updatedRounds[index] = temp;
    setNewJob({ ...newJob, rounds: updatedRounds });
  };

  const handleProgressCandidate = async (appId: string, status: 'QUALIFIED' | 'REJECTED') => {
    try {
      const res = await RoundService.progressCandidate(appId, status, feedbackInput);
      alert(res.message || 'Candidate status updated');
      setFeedbackInput('');
      const data = await ApplicationService.getJobApplicants(selectedJobId!);
      setApplicants(data);
      const updatedApplicant = data.find((a: any) => a.id === appId);
      if (updatedApplicant) {
        setSelectedApplicant(updatedApplicant);
      } else {
        setSelectedApplicant(null);
      }
      loadAnalytics();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to progress candidate');
    }
  };

  // Communication Hub State Functions
  const loadChannelMessages = async (jobId: string, roundId: string | null) => {
    try {
      const data = await RoundService.getMessages(jobId);
      const filtered = data.messages.filter((m: any) => m.roundId === roundId);
      setMessages(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectMsgJob = async (jobId: string) => {
    setSelectedMsgJobId(jobId);
    setSelectedChannelId(null);
    try {
      const rounds = await RoundService.getRounds(jobId);
      const channels = [
        { id: null, title: 'General Announcements', icon: Volume2 },
        ...rounds.map((r: any) => ({ id: r.id, title: `${r.title} (${r.format})`, icon: Layers }))
      ];
      setMsgChannels(channels);
      
      const data = await RoundService.getMessages(jobId);
      const filtered = data.messages.filter((m: any) => m.roundId === null);
      setMessages(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectChannel = async (channelId: string | null) => {
    setSelectedChannelId(channelId);
    if (selectedMsgJobId) {
      await loadChannelMessages(selectedMsgJobId, channelId);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !selectedMsgJobId) return;

    try {
      await RoundService.sendMessage(selectedMsgJobId, {
        roundId: selectedChannelId,
        content: newMessageText.trim()
      });
      setNewMessageText('');
      await loadChannelMessages(selectedMsgJobId, selectedChannelId);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send announcement');
    }
  };

  const handleToggleJobStatus = async (jobId: string, currentIsOpen: boolean) => {
    try {
      await JobService.updateJob(jobId, { isOpen: !currentIsOpen });
      await loadJobs();
      await loadAnalytics();
      await loadHistoryLogs();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to update job status');
    }
  };

  const handleTriggerDeleteJob = (id: string, title: string) => {
    setJobToDelete({ id, title });
  };

  const handleConfirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await JobService.deleteJob(jobToDelete.id);
      setJobToDelete(null);
      setSelectedJobId(null);
      await loadJobs();
      await loadAnalytics();
      await loadHistoryLogs();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete job posting');
    }
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const addQuestion = () => {
    if (questionInput.trim()) {
      setNewJob({ ...newJob, questions: [...newJob.questions, questionInput.trim()] });
      setQuestionInput('');
    }
  };

  const removeQuestion = (index: number) => {
    setNewJob({ ...newJob, questions: newJob.questions.filter((_, i) => i !== index) });
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      await ApplicationService.updateStatus(appId, status);
      loadApplicants(selectedJobId!);
      loadAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex p-6 bg-yellow-50 rounded-3xl mb-6 text-yellow-600 border border-yellow-100">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-4">Account Pending Approval</h2>
        <p className="text-slate-600 text-lg">An administrator needs to verify your recruiter account before you can post jobs. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('JOBS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'JOBS' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Briefcase className="h-4 w-4" /> Jobs & Applicants
        </button>
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'ANALYTICS' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 className="h-4 w-4" /> Hiring Analytics
        </button>
        <button 
          onClick={() => {
            setActiveTab('MESSAGES');
            if (jobs.length > 0 && !selectedMsgJobId) {
              handleSelectMsgJob(jobs[0].id);
            }
          }}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'MESSAGES' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <MessageSquare className="h-4 w-4" /> Communication Hub
        </button>
        <button 
          onClick={() => {
            setActiveTab('HISTORY');
            loadHistoryLogs();
          }}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'HISTORY' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <History className="h-4 w-4" /> Activity History
        </button>
      </div>

      {activeTab === 'JOBS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: My Jobs */}
          <div className="lg:col-span-1 lg:border-r lg:border-slate-100 lg:pr-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Job Postings</h2>
              <Button size="sm" onClick={() => { 
                setShowNewJob(true); 
                setSelectedJobId(null); 
                setSelectedApplicant(null); 
                setEditingJobId(null);
                setNewJob({ title: '', description: '', requirements: '', location: '', salaryRange: '', jobType: 'Full-time', questions: [], applyStartDate: '', applyEndDate: '', rounds: [] });
                setQuestionInput('');
              }} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all">
                + Post Job
              </Button>
            </div>

            <div className="space-y-4">
              {jobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => { setShowNewJob(false); loadApplicants(job.id); }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex justify-between items-center ${selectedJobId === job.id ? 'border-purple-600 bg-purple-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                >
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{job.title}</h3>
                    <p className="text-xs font-semibold text-purple-600 mt-1">{job._count?.applications || 0} applicants</p>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${job.isOpen ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-slate-500 text-sm">No jobs posted yet.</p>}
            </div>
          </div>

          {/* Right Column: Applicants, New Job Form, or Detail View */}
          <div className="lg:col-span-2">
            {showNewJob ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <h2 className="text-2xl font-black mb-6 text-slate-950">{editingJobId ? 'Edit Job Posting' : 'Post a New Job'}</h2>
                <form onSubmit={handlePostJob} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Title</label>
                    <input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" placeholder="e.g. Front-End React Developer" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Location</label>
                      <input required className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" placeholder="e.g. San Francisco or Remote" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Salary Range</label>
                      <input className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" placeholder="e.g. $80k - $100k" value={newJob.salaryRange} onChange={e => setNewJob({...newJob, salaryRange: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply Start Date (Optional)</label>
                      <input type="datetime-local" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" value={newJob.applyStartDate} onChange={e => setNewJob({...newJob, applyStartDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Apply End Date (Optional)</label>
                      <input type="datetime-local" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" value={newJob.applyEndDate} onChange={e => setNewJob({...newJob, applyEndDate: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Description</label>
                    <textarea required rows={4} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" placeholder="Summarize role objectives and team overview..." value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Requirements</label>
                    <textarea required rows={4} className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" placeholder="e.g. 2+ years of JS/TS experience..." value={newJob.requirements} onChange={e => setNewJob({...newJob, requirements: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Screening Questions (Optional)</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        className="flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm" 
                        placeholder="e.g. What is your notice period?" 
                        value={questionInput} 
                        onChange={e => setQuestionInput(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={addQuestion} 
                        className="px-5 bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold rounded-xl text-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                    {newJob.questions.length > 0 && (
                      <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                        {newJob.questions.map((q, i) => (
                          <div key={i} className="flex justify-between items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-100">
                            <span className="text-sm text-slate-700 font-medium">{q}</span>
                            <button 
                              type="button" 
                              onClick={() => removeQuestion(i)} 
                              className="text-xs font-bold text-red-500 hover:text-red-750"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-4 border-t border-slate-100 pt-6">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Interview Process (Optional rounds)</label>
                      <button 
                        type="button" 
                        onClick={addRound} 
                        className="px-4 py-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Round
                      </button>
                    </div>
                    {newJob.rounds && newJob.rounds.length > 0 && (
                      <div className="space-y-4 border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                        {newJob.rounds.map((round, i) => (
                          <div key={i} className="bg-white p-4 rounded-xl border border-slate-150 relative space-y-3 shadow-sm">
                            <div className="flex justify-between items-center gap-3">
                              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">Round {i + 1}</span>
                              <div className="flex gap-1">
                                <button type="button" onClick={() => moveRoundUp(i)} className="p-1 text-slate-400 hover:text-slate-650" disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => moveRoundDown(i)} className="p-1 text-slate-400 hover:text-slate-650" disabled={i === newJob.rounds.length - 1}><ArrowDown className="h-3.5 w-3.5" /></button>
                                <button type="button" onClick={() => removeRound(i)} className="p-1 text-red-400 hover:text-red-650 ml-1"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Round Title</label>
                                <input 
                                  required 
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs" 
                                  placeholder="e.g. Coding Test or Technical Chat" 
                                  value={round.title} 
                                  onChange={e => updateRound(i, 'title', e.target.value)} 
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
                                  <select 
                                    className="w-full px-2 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs bg-white"
                                    value={round.type} 
                                    onChange={e => updateRound(i, 'type', e.target.value)}
                                  >
                                    <option value="MCQ">MCQ</option>
                                    <option value="CODING">Coding</option>
                                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                                    <option value="HR_INTERVIEW">HR Interview</option>
                                    <option value="GROUP_DISCUSSION">Group Discussion</option>
                                    <option value="CUSTOM">Custom</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Format</label>
                                  <select 
                                    className="w-full px-2 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs bg-white"
                                    value={round.format} 
                                    onChange={e => updateRound(i, 'format', e.target.value)}
                                  >
                                    <option value="ONLINE">Online</option>
                                    <option value="IN_PERSON">In-Person</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description (Optional)</label>
                                <input 
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs" 
                                  placeholder="What is this round about?" 
                                  value={round.description || ''} 
                                  onChange={e => updateRound(i, 'description', e.target.value)} 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Instructions (Optional)</label>
                                <input 
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs" 
                                  placeholder="What should the candidate prepare?" 
                                  value={round.instructions || ''} 
                                  onChange={e => updateRound(i, 'instructions', e.target.value)} 
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date (Optional)</label>
                                <input 
                                  type="datetime-local"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs" 
                                  value={round.startDate || ''} 
                                  onChange={e => updateRound(i, 'startDate', e.target.value)} 
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date (Optional)</label>
                                <input 
                                  type="datetime-local"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs" 
                                  value={round.endDate || ''} 
                                  onChange={e => updateRound(i, 'endDate', e.target.value)} 
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl transition-all">{editingJobId ? 'Save Changes' : 'Publish Job'}</Button>
                </form>
              </div>
            ) : selectedApplicant ? (
              // CANDIDATE PROFILE VIEW
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <button 
                      onClick={() => setSelectedApplicant(null)} 
                      className="text-xs font-bold text-purple-600 hover:underline mb-2 block"
                    >
                      ← Back to Applicants List
                    </button>
                    <h2 className="text-2xl font-black text-slate-900">{selectedApplicant.student.user.fullName}</h2>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <Mail className="h-4 w-4" /> {selectedApplicant.student.user.email}
                    </p>
                    <button
                      onClick={async () => {
                        if (!selectedJobId) return;
                        setIsRefreshing(true);
                        try {
                          const data = await ApplicationService.getJobApplicants(selectedJobId);
                          setApplicants(data);
                          const updated = data.find((a: any) => a.id === selectedApplicant.id);
                          if (updated) setSelectedApplicant(updated);
                        } finally {
                          setIsRefreshing(false);
                        }
                      }}
                      className="mt-2 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Latest Results'}
                    </button>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                    selectedApplicant.status === 'APPLIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedApplicant.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    selectedApplicant.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                    selectedApplicant.status === 'OFFERED' ? 'bg-indigo-50 text-indigo-750 border-indigo-200 animate-pulse' :
                    selectedApplicant.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-bounce' :
                    selectedApplicant.status === 'DECLINED' ? 'bg-red-50 text-red-650 border-red-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {selectedApplicant.status === 'OFFERED' ? 'OFFERED' : selectedApplicant.status === 'ACCEPTED' ? 'HIRED' : selectedApplicant.status}
                  </span>
                </div>

                {/* Candidate Manual Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4 text-purple-500" /> Academic Profile
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-slate-800">{selectedApplicant.student.college || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{selectedApplicant.student.branch || 'N/A'} {selectedApplicant.student.graduationYear ? `(Class of ${selectedApplicant.student.graduationYear})` : ''}</p>
                      {selectedApplicant.student.cgpa && (
                        <p className="text-xs font-bold text-purple-600 mt-2 bg-purple-50 inline-block px-2.5 py-1 rounded-md">CGPA: {selectedApplicant.student.cgpa} / 10</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-purple-500" /> Core Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApplicant.student.skills ? selectedApplicant.student.skills.split(',').map((skill: string, i: number) => (
                        <span key={i} className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-purple-100">
                          {skill.trim()}
                        </span>
                      )) : <p className="text-slate-400 text-xs">No skills listed</p>}
                    </div>
                  </div>
                </div>

                {selectedApplicant.aiScreeningScore != null && (() => {
                  let feedbackObj = { matchedKeywords: [], missingKeywords: [], summary: "" };
                  try {
                    feedbackObj = JSON.parse(selectedApplicant.aiScreeningFeedback || "{}");
                  } catch (e) {}

                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 mb-6 text-left">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-800 mb-2.5 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" /> AI Screening Match Score: {Math.round(selectedApplicant.aiScreeningScore)}%
                      </h3>
                      <p className="text-xs text-slate-700 font-semibold mb-3">{feedbackObj.summary || "Evaluation completed."}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/80 p-3 rounded-xl border border-emerald-100/60">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Matched Requirements</p>
                          <div className="flex flex-wrap gap-1">
                            {feedbackObj.matchedKeywords && feedbackObj.matchedKeywords.length > 0 ? (
                              feedbackObj.matchedKeywords.map((kw: string, i: number) => (
                                <span key={i} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">✓ {kw}</span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">None matched</span>
                            )}
                          </div>
                        </div>

                        <div className="bg-white/80 p-3 rounded-xl border border-slate-200">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Missing Requirements</p>
                          <div className="flex flex-wrap gap-1">
                            {feedbackObj.missingKeywords && feedbackObj.missingKeywords.length > 0 ? (
                              feedbackObj.missingKeywords.map((kw: string, i: number) => (
                                <span key={i} className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">✗ {kw}</span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">None missing</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-4 mb-6">
                  {selectedApplicant.student.projects && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-purple-500" /> Projects
                      </h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedApplicant.student.projects}</p>
                    </div>
                  )}

                  {selectedApplicant.student.experience && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-purple-500" /> Experience
                      </h3>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selectedApplicant.student.experience}</p>
                    </div>
                  )}

                  <div className="bg-purple-50/50 rounded-2xl p-5 border border-purple-100/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Candidate Pitch / Cover Letter
                    </h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed italic">"{selectedApplicant.coverLetterText}"</p>
                  </div>

                  {selectedApplicant.job.questions && (selectedApplicant.job.questions as string[]).length > 0 && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-purple-500" /> Screening Question Answers
                      </h3>
                      <div className="space-y-3 mt-3">
                        {(selectedApplicant.job.questions as string[]).map((q: string, i: number) => {
                          const answersObj = selectedApplicant.answers as Record<string, string> || {};
                          const answer = answersObj[q] || 'No answer provided.';
                          return (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-100">
                              <p className="text-xs font-bold text-slate-400 mb-1">Q: {q}</p>
                              <p className="text-sm text-slate-800 font-semibold">{answer}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Custom Interview Rounds Tracker */}
                  {selectedApplicant.job.rounds && selectedApplicant.job.rounds.length > 0 && selectedApplicant.status !== 'APPLIED' && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mt-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-purple-500" /> Recruitment Progress
                      </h3>
                      <div className="space-y-4">
                        {selectedApplicant.job.rounds.map((round: any, index: number) => {
                          const progression = selectedApplicant.progressions?.find((p: any) => p.roundId === round.id);
                          const isCurrent = progression?.status === 'PENDING';
                          const isPassed = progression?.status === 'QUALIFIED';
                          const isRejected = progression?.status === 'REJECTED';

                          return (
                            <div key={round.id} className={`flex items-start gap-3 p-3 rounded-xl border ${
                              isCurrent ? 'bg-purple-50 border-purple-200 shadow-sm' :
                              isPassed ? 'bg-emerald-50/50 border-emerald-100' :
                              isRejected ? 'bg-red-50/50 border-red-100' :
                              'bg-white border-slate-100 opacity-60'
                            }`}>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                isCurrent ? 'bg-purple-100 text-purple-750' :
                                isPassed ? 'bg-emerald-100 text-emerald-750' :
                                isRejected ? 'bg-red-100 text-red-750' :
                                'bg-slate-100 text-slate-500'
                              }`}>
                                Rd {index + 1}
                              </span>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-slate-800">{round.title} ({round.format})</h4>
                                {round.description && <p className="text-xs text-slate-500 mt-0.5">{round.description}</p>}
                                {progression?.feedback && (
                                  <p className="text-xs text-purple-600 font-semibold mt-1 bg-white inline-block px-2.5 py-1 rounded-md border border-purple-100">
                                    Feedback: {progression.feedback}
                                  </p>
                                )}
                                {round.type === 'MCQ' && progression?.mcqResponse && (
                                  <div className="text-[10px] mt-1.5 p-2 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between text-purple-750">
                                    <span className="font-bold">MCQ Test Score:</span>
                                    <span className="font-black bg-purple-100 px-2 py-0.5 rounded text-[10px]">
                                      {progression.mcqResponse.score} / {progression.mcqResponse.totalPossibleMarks} Marks
                                    </span>
                                  </div>
                                )}
                                {round.type === 'CODING' && progression?.codingSubmissions && progression.codingSubmissions.length > 0 && (() => {
                                  const totalScore = progression.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0);
                                  const totalMaxMarks = progression.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.question?.marks || 0), 0);
                                  const totalPassed = progression.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.passedCasesCount || 0), 0);
                                  const totalCases = progression.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.totalCasesCount || 0), 0);
                                  return (
                                    <div className="text-[10px] mt-1.5 p-2 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col gap-1 text-indigo-750">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold">Coding Test Score:</span>
                                        <span className="font-black bg-indigo-100 px-2 py-0.5 rounded text-[10px]">
                                          {totalScore} / {totalMaxMarks} Marks
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] text-indigo-650 font-medium">
                                        <span>Test Cases Passed:</span>
                                        <span>{totalPassed} / {totalCases}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                {['TECHNICAL_INTERVIEW', 'HR_INTERVIEW'].includes(round.type) && progression?.meetLink && (
                                  <div className="text-[10px] mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-1 text-slate-700">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold shrink-0">Interview Link:</span>
                                      <a href={progression.meetLink.startsWith('http') ? progression.meetLink : `https://${progression.meetLink}`} target="_blank" rel="noopener noreferrer" className="text-purple-650 hover:underline font-bold truncate text-[10px]">
                                        {progression.meetLink}
                                      </a>
                                    </div>
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span>Status:</span>
                                      {progression.isMeetLinkPublished ? (
                                        <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded border border-emerald-100">Published</span>
                                      ) : (
                                        <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded border border-amber-100">Draft (Unpublished)</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider self-center">
                                {isCurrent ? <span className="text-purple-650 animate-pulse font-extrabold">In Progress</span> :
                                 isPassed ? <span className="text-emerald-600 font-bold">Passed</span> :
                                 isRejected ? <span className="text-red-500 font-bold">Rejected</span> :
                                 <span className="text-slate-400">Locked</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Progression Action Form */}
                      {selectedApplicant.progressions?.some((p: any) => p.status === 'PENDING') && (() => {
                        const activeProgression = selectedApplicant.progressions.find((p: any) => p.status === 'PENDING');
                        const activeRound = selectedApplicant.job.rounds?.find((r: any) => r.id === activeProgression?.roundId);
                        const isLastRound = selectedApplicant.job.rounds && activeRound
                          ? activeRound.order === selectedApplicant.job.rounds.length - 1
                          : false;

                        return (
                          <div className="mt-5 border-t border-slate-200 pt-4 space-y-3">
                            {['TECHNICAL_INTERVIEW', 'HR_INTERVIEW'].includes(activeRound?.type) && (
                              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 mb-4 text-left">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📹 Video Call / Interview Meeting Link</span>
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Paste Google Meet, Zoom, or Teams link..."
                                    value={meetLinkInput}
                                    onChange={e => setMeetLinkInput(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-xs bg-white font-medium shadow-sm"
                                  />
                                  <button
                                    onClick={async () => {
                                      try {
                                        await RoundService.updateMeetLink(selectedApplicant.id, activeRound.id, {
                                          meetLink: meetLinkInput,
                                          isMeetLinkPublished
                                        });
                                        alert("Meeting link updated successfully!");
                                        const data = await ApplicationService.getJobApplicants(selectedJobId!);
                                        setApplicants(data);
                                        const updatedApplicant = data.find((a: any) => a.id === selectedApplicant.id);
                                        if (updatedApplicant) {
                                          setSelectedApplicant(updatedApplicant);
                                        }
                                      } catch (err: any) {
                                        alert(err.response?.data?.error || "Failed to update meeting link");
                                      }
                                    }}
                                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm shrink-0 border-none"
                                  >
                                    Save Link
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="checkbox"
                                    id="publish-meet-link"
                                    checked={isMeetLinkPublished}
                                    onChange={async (e) => {
                                      const newVal = e.target.checked;
                                      setIsMeetLinkPublished(newVal);
                                      try {
                                        await RoundService.updateMeetLink(selectedApplicant.id, activeRound.id, {
                                          meetLink: meetLinkInput,
                                          isMeetLinkPublished: newVal
                                        });
                                        alert(newVal ? "Meeting link published to student!" : "Meeting link unpublished.");
                                        const data = await ApplicationService.getJobApplicants(selectedJobId!);
                                        setApplicants(data);
                                        const updatedApplicant = data.find((a: any) => a.id === selectedApplicant.id);
                                        if (updatedApplicant) {
                                          setSelectedApplicant(updatedApplicant);
                                        }
                                      } catch (err: any) {
                                        alert(err.response?.data?.error || "Failed to update meeting link publish status");
                                        setIsMeetLinkPublished(!newVal);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <label htmlFor="publish-meet-link" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                                    Publish link (make visible to candidate)
                                  </label>
                                </div>
                              </div>
                            )}

                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Evaluation & Notes</label>
                            <textarea
                              rows={2}
                              placeholder="Add evaluation feedback or instructions for this candidate..."
                              value={feedbackInput}
                              onChange={e => setFeedbackInput(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-850 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleProgressCandidate(selectedApplicant.id, 'QUALIFIED')}
                                className={`font-bold rounded-xl text-xs py-2 flex-1 border-none ${
                                  isLastRound 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                                }`}
                              >
                                {isLastRound ? 'Make Offer' : 'Shortlist Candidate'}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleProgressCandidate(selectedApplicant.id, 'REJECTED')}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs py-2 flex-1 border-none"
                              >
                                Reject Candidate
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                {selectedApplicant.status !== 'OFFERED' && selectedApplicant.status !== 'ACCEPTED' && selectedApplicant.status !== 'DECLINED' && (!selectedApplicant.job.rounds || selectedApplicant.job.rounds.length === 0) && (
                  <div className="flex gap-2 border-t border-slate-100 pt-6">
                    {selectedApplicant.status === 'APPLIED' && (
                      <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'SHORTLISTED')} className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Shortlist</Button>
                    )}
                    <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'OFFERED')} className="bg-green-50 text-green-700 hover:bg-green-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Make Offer</Button>
                    <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'REJECTED')} className="bg-red-50 text-red-700 hover:bg-red-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Reject</Button>
                  </div>
                )}

                {selectedApplicant.status === 'APPLIED' && selectedApplicant.job.rounds && selectedApplicant.job.rounds.length > 0 && (
                  <div className="flex gap-2 border-t border-slate-100 pt-6">
                    <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'SHORTLISTED')} className="bg-purple-600 hover:bg-purple-700 text-white border-none px-6 py-2.5 font-bold rounded-xl flex-1">Shortlist (Start Interview Process)</Button>
                    <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'REJECTED')} className="bg-red-50 text-red-750 hover:bg-red-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Reject</Button>
                  </div>
                )}
              </div>
            ) : selectedJobId ? (
              // APPLICANTS LIST
              <div>
                {selectedJob?.rounds && selectedJob.rounds.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 mb-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-purple-650" /> Interview Process & Test Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedJob.rounds.map((round: any, idx: number) => {
                        const isMcq = round.type === 'MCQ';
                        return (
                          <div key={round.id} className="bg-white p-4.5 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3 shadow-sm hover:shadow-md transition-all">
                            <div>
                              <div className="flex justify-between items-center">
                                <h4 className="font-extrabold text-sm text-slate-900">{idx + 1}. {round.title}</h4>
                                <span className="text-[10px] font-black uppercase bg-purple-50 text-purple-750 px-2 py-0.5 rounded border border-purple-100">
                                  {round.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{round.description || 'No description provided.'}</p>
                            </div>
                            
                            {isMcq && (
                              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 w-full">
                                <div className="flex justify-between items-center gap-2">
                                  <button
                                    onClick={() => handleManageMcqQuestions(round)}
                                    className="text-xs font-bold text-purple-650 hover:text-purple-700 flex items-center gap-1"
                                  >
                                    <FileText className="h-3.5 w-3.5" /> Setup Questions
                                  </button>
                                  
                                  <div className="flex gap-1.5 items-center">
                                    {!round.isMcqPublished ? (
                                      <button
                                        onClick={() => handlePublishMcq(round.id)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl border-none transition-all shadow-sm"
                                      >
                                        Publish Test
                                      </button>
                                    ) : !round.isMcqResultReleased ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                          Published
                                        </span>
                                        <button
                                          onClick={() => handleReleaseMcqResults(round.id)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl border-none transition-all shadow-sm"
                                        >
                                          Release Results
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-bold text-blue-750 bg-blue-50 px-2 py-1 rounded-md border border-blue-150">
                                        Results Released
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Auto-Shortlist Form */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Number of candidates to shortlist..."
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] w-full outline-none focus:border-purple-600 font-medium"
                                    id={`shortlist-count-${round.id}`}
                                  />
                                  <button
                                    onClick={async () => {
                                      const inputEl = document.getElementById(`shortlist-count-${round.id}`) as HTMLInputElement;
                                      const count = parseInt(inputEl?.value || '0');
                                      if (!count || count <= 0) {
                                        alert("Please enter a valid number of candidates to shortlist.");
                                        return;
                                      }
                                      if (confirm(`Are you sure you want to auto-shortlist the top ${count} candidates based on MCQ scores and reject the rest?`)) {
                                        try {
                                          const res = await RoundService.autoShortlistMcq(round.id, count);
                                          alert(res.message);
                                          await loadJobs();
                                          if (selectedJobId) {
                                            await loadApplicants(selectedJobId);
                                          }
                                        } catch (err: any) {
                                          alert(err.response?.data?.error || "Failed to apply auto-shortlist");
                                        }
                                      }
                                    }}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-750 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all whitespace-nowrap border border-purple-200 shadow-sm"
                                  >
                                    Auto-Shortlist
                                  </button>
                                </div>
                              </div>
                            )}

                            {round.type === 'CODING' && (
                              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 w-full">
                                <div className="flex justify-between items-center gap-2">
                                  <button
                                    onClick={() => handleManageCodingQuestion(round)}
                                    className="text-xs font-bold text-purple-650 hover:text-purple-700 flex items-center gap-1"
                                  >
                                    <FileText className="h-3.5 w-3.5" /> Setup Coding Challenge
                                  </button>
                                  
                                  <div className="flex gap-1.5 items-center">
                                    {!round.isCodingPublished ? (
                                      <button
                                        onClick={() => handlePublishCoding(round.id)}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl border-none transition-all shadow-sm"
                                      >
                                        Publish Test
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                        Published
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Auto-Shortlist Form */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="Number of candidates to shortlist..."
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] w-full outline-none focus:border-purple-600 font-medium"
                                    id={`shortlist-count-${round.id}`}
                                  />
                                  <button
                                    onClick={async () => {
                                      const inputEl = document.getElementById(`shortlist-count-${round.id}`) as HTMLInputElement;
                                      const count = parseInt(inputEl?.value || '0');
                                      if (!count || count <= 0) {
                                        alert("Please enter a valid number of candidates to shortlist.");
                                        return;
                                      }
                                      if (confirm(`Are you sure you want to auto-shortlist the top ${count} candidates based on Coding test scores and reject the rest?`)) {
                                        try {
                                          const res = await RoundService.autoShortlistMcq(round.id, count);
                                          alert(res.message);
                                          await loadJobs();
                                          if (selectedJobId) {
                                            await loadApplicants(selectedJobId);
                                          }
                                        } catch (err: any) {
                                          alert(err.response?.data?.error || "Failed to apply auto-shortlist");
                                        }
                                      }
                                    }}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-750 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all whitespace-nowrap border border-purple-200 shadow-sm"
                                  >
                                    Auto-Shortlist
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900">Applicants ({applicants.length})</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        if (!selectedJobId) return;
                        setIsRefreshing(true);
                        try {
                          await loadApplicants(selectedJobId);
                        } finally {
                          setIsRefreshing(false);
                        }
                      }}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl py-2 px-4 text-xs transition-all flex items-center gap-1.5 border border-emerald-200"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh Results'}
                    </Button>
                    {selectedJob && (
                      <Button
                        onClick={() => handleToggleJobStatus(selectedJob.id, selectedJob.isOpen)}
                        className={`font-bold rounded-xl py-2 px-4 text-xs transition-all border-none ${
                          selectedJob.isOpen
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                        }`}
                      >
                        {selectedJob.isOpen ? 'Hold Recruiting' : 'Resume Recruiting'}
                      </Button>
                    )}
                    {selectedJob && (
                      <Button
                        onClick={() => setIsScreeningModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl py-2 px-4 text-xs transition-all flex items-center gap-1.5 border-none shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> AI Screening
                      </Button>
                    )}
                    <Button 
                      onClick={() => handleStartEditJob(selectedJobId!)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2 px-4 text-xs transition-all flex items-center gap-1.5 border-none"
                    >
                      Edit Job Posting
                    </Button>
                    <Button 
                      onClick={() => handleTriggerDeleteJob(selectedJob.id, selectedJob.title)} 
                      className="bg-red-50 hover:bg-red-100 text-red-655 font-bold rounded-xl py-2 px-4 text-xs transition-all flex items-center gap-1.5 border-none"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Job
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {(() => {
                    const getMcqScore = (app: any) => {
                      const mcqProg = app.progressions?.find((p: any) => p.mcqResponse);
                      return mcqProg?.mcqResponse?.score ?? -1;
                    };

                    const getAiScore = (app: any) => {
                      return app.aiScreeningScore ?? -1;
                    };

                    const activeCandidates = applicants.filter(app => app.status !== 'REJECTED' && app.status !== 'DECLINED');
                    const rejectedCandidates = applicants.filter(app => app.status === 'REJECTED' || app.status === 'DECLINED');

                    // Sort active candidates based on selected MCQ / AI Match sort order
                    if (aiSortOrder === 'HIGH_TO_LOW') {
                      activeCandidates.sort((a, b) => getAiScore(b) - getAiScore(a));
                    } else if (aiSortOrder === 'LOW_TO_HIGH') {
                      activeCandidates.sort((a, b) => getAiScore(a) - getAiScore(b));
                    } else if (mcqSortOrder === 'HIGH_TO_LOW') {
                      activeCandidates.sort((a, b) => getMcqScore(b) - getMcqScore(a));
                    } else if (mcqSortOrder === 'LOW_TO_HIGH') {
                      activeCandidates.sort((a, b) => getMcqScore(a) - getMcqScore(b));
                    }

                    const renderCandidateCard = (app: any) => (
                      <div key={app.id} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900">{app.student.user.fullName}</h3>
                            <p className="text-xs text-slate-500 mt-1">{app.student.college || 'No college listed'} • {app.student.branch || 'No branch listed'}</p>
                            {app.student.skills && (
                              <div className="flex flex-wrap gap-1 mt-2.5">
                                {app.student.skills.split(',').slice(0, 3).map((skill: string, index: number) => (
                                  <span key={index} className="text-[10px] bg-slate-100 font-bold px-2 py-0.5 rounded text-slate-600">{skill.trim()}</span>
                                ))}
                                {app.student.skills.split(',').length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 ml-1">+{app.student.skills.split(',').length - 3} more</span>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 mt-3">
                              {app.aiScreeningScore != null && (
                                <div className="text-[10px] font-bold text-emerald-850 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                                  <span>AI Match: <span className="font-extrabold text-emerald-700">{Math.round(app.aiScreeningScore)}%</span></span>
                                </div>
                              )}
                              {(() => {
                                const mcqProg = app.progressions?.find((p: any) => p.mcqResponse);
                                if (mcqProg?.mcqResponse) {
                                  return (
                                    <div className="text-[10px] font-bold text-purple-750 bg-purple-50/60 border border-purple-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-650" />
                                      <span>MCQ Score: <span className="font-extrabold">{mcqProg.mcqResponse.score} / {mcqProg.mcqResponse.totalPossibleMarks}</span> Marks</span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                              {(() => {
                                const codingProg = app.progressions?.find((p: any) => p.codingSubmissions && p.codingSubmissions.length > 0);
                                if (codingProg?.codingSubmissions) {
                                  const totalScore = codingProg.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0);
                                  const totalMaxMarks = codingProg.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.question?.marks || 0), 0);
                                  const totalPassed = codingProg.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.passedCasesCount || 0), 0);
                                  const totalCases = codingProg.codingSubmissions.reduce((sum: number, sub: any) => sum + (sub.totalCasesCount || 0), 0);

                                  return (
                                    <div className="text-[10px] font-bold text-indigo-750 bg-indigo-50/60 border border-indigo-100 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-650" />
                                      <span>Coding Score: <span className="font-extrabold">{totalScore} / {totalMaxMarks}</span> Marks <span className="text-slate-500 font-medium">({totalPassed}/{totalCases} cases)</span></span>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                            app.status === 'APPLIED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            app.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                            app.status === 'OFFERED' ? 'bg-indigo-50 text-indigo-700 border-indigo-100 animate-pulse' :
                            app.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            app.status === 'DECLINED' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-600 border-slate-150'
                          }`}>{app.status === 'OFFERED' ? 'OFFERED' : app.status === 'ACCEPTED' ? 'HIRED' : app.status}</span>
                        </div>
                        
                        <div className="flex gap-2 items-center justify-between border-t border-slate-100 pt-4 mt-2">
                          <button 
                            onClick={() => setSelectedApplicant(app)}
                            className="text-xs font-bold text-purple-650 hover:text-purple-750 flex items-center gap-1"
                          >
                            <User className="h-3.5 w-3.5" /> View Profile & Details
                          </button>
                          {app.status !== 'OFFERED' && app.status !== 'ACCEPTED' && app.status !== 'DECLINED' && (() => {
                            const hasRounds = app.job?.rounds && app.job.rounds.length > 0;
                            
                            if (app.status === 'APPLIED') {
                              return (
                                <div className="flex gap-1.5">
                                  <Button 
                                    size="sm" 
                                    onClick={() => updateStatus(app.id, 'SHORTLISTED')} 
                                    className={`${hasRounds ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'} border-none font-bold text-xs`}
                                  >
                                    {hasRounds ? 'Shortlist (Start Rounds)' : 'Shortlist'}
                                  </Button>
                                  {!hasRounds && (
                                    <Button 
                                      size="sm" 
                                      onClick={() => updateStatus(app.id, 'OFFERED')} 
                                      className="bg-green-50 text-green-700 hover:bg-green-100 border-none font-bold text-xs"
                                    >
                                      Make Offer
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                            
                            if (app.status === 'SHORTLISTED') {
                              if (hasRounds) {
                                const activeProgression = app.progressions?.find((p: any) => p.status === 'PENDING');
                                const activeRound = app.job?.rounds?.find((r: any) => r.id === activeProgression?.roundId);
                                return (
                                  <span className="text-[10px] font-bold text-purple-750 bg-purple-50 border border-purple-100 px-2.5 py-1.5 rounded-lg">
                                    {activeRound 
                                      ? `Rd ${activeRound.order + 1}: ${activeRound.title}`
                                      : 'Rounds In Progress'
                                    }
                                  </span>
                                );
                              } else {
                                return (
                                  <div className="flex gap-1.5">
                                    <Button 
                                      size="sm" 
                                      onClick={() => updateStatus(app.id, 'OFFERED')} 
                                      className="bg-green-50 text-green-700 hover:bg-green-100 border-none font-bold text-xs"
                                    >
                                      Make Offer
                                    </Button>
                                  </div>
                                );
                              }
                            }
                            
                            return null;
                          })()}
                        </div>
                      </div>
                    );

                    return (
                      <div className="space-y-8">
                        {/* Active / Shortlisted Candidates */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-slate-50/70 p-4.5 rounded-2xl border border-slate-100">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Active & Shortlisted ({activeCandidates.length})</h3>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">Sort MCQ:</span>
                                <select
                                  value={mcqSortOrder}
                                  onChange={e => {
                                    setMcqSortOrder(e.target.value as any);
                                    setAiSortOrder('NONE');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-250 text-[10px] bg-white font-bold outline-none focus:border-purple-650 text-slate-700 shadow-sm"
                                >
                                  <option value="DEFAULT">Default (Date Applied)</option>
                                  <option value="HIGH_TO_LOW">Score: High to Low</option>
                                  <option value="LOW_TO_HIGH">Score: Low to High</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">Sort AI Match:</span>
                                <select
                                  value={aiSortOrder}
                                  onChange={e => {
                                    setAiSortOrder(e.target.value as any);
                                    setMcqSortOrder('DEFAULT');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-slate-250 text-[10px] bg-white font-bold outline-none focus:border-purple-650 text-slate-700 shadow-sm"
                                >
                                  <option value="NONE">None</option>
                                  <option value="HIGH_TO_LOW">Match: High to Low</option>
                                  <option value="LOW_TO_HIGH">Match: Low to High</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            {activeCandidates.map(renderCandidateCard)}
                            {activeCandidates.length === 0 && (
                              <p className="text-slate-400 text-xs text-center py-12 bg-white rounded-2xl border border-slate-100">No active applicants currently.</p>
                            )}
                          </div>
                        </div>

                        {/* Rejected & Declined Candidates (Let them be down) */}
                        {rejectedCandidates.length > 0 && (
                          <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Rejected & Declined ({rejectedCandidates.length})</h3>
                            <div className="space-y-4 opacity-75">
                              {rejectedCandidates.map(renderCandidateCard)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-3xl border border-slate-100 p-8">
                <Briefcase className="h-16 w-16 mb-4 opacity-20 text-slate-600" />
                <p className="font-semibold text-slate-500">No Job Selected</p>
                <p className="text-sm text-slate-400 mt-1">Select a job from the left panel to review its applications, or post a new job.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECRUITER ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Jobs Posted</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.totalJobs}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Open Jobs</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.openJobs}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Applicants</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.totalApplications}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Shortlisted</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.applications.SHORTLISTED}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" /> Pipeline Application Funnel
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Applied ({analytics.applications.APPLIED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.APPLIED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.APPLIED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Shortlisted ({analytics.applications.SHORTLISTED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.SHORTLISTED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.SHORTLISTED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Offered ({analytics.applications.OFFERED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.OFFERED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.OFFERED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Hired ({analytics.applications.ACCEPTED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.ACCEPTED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.ACCEPTED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Rejected ({analytics.applications.REJECTED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.REJECTED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.REJECTED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" /> Applicant Distribution by Job
              </h3>
              
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {analytics.jobsChartData.map((job: any, index: number) => {
                  const maxApps = Math.max(...analytics.jobsChartData.map((j: any) => j.applications), 1);
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                        <span className="truncate pr-4">{job.title}</span>
                        <span className="text-purple-600 font-bold">{job.applications} apps</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${(job.applications / maxApps) * 100}%` }}></div>
                      </div>
                    </div>
                  );
                })}
                {analytics.jobsChartData.length === 0 && <p className="text-slate-400 text-sm text-center py-12">No jobs to show stats for.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMUNICATION HUB TAB */}
      {activeTab === 'MESSAGES' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Job Selection Sidebar */}
          <div className="lg:col-span-1 border-r border-slate-100 pr-6 space-y-4">
            <h2 className="text-lg font-black text-slate-900 mb-4 font-black">Select Job</h2>
            <div className="space-y-2">
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => handleSelectMsgJob(job.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedMsgJobId === job.id 
                      ? 'border-purple-650 bg-purple-50/50' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <h3 className="font-bold text-slate-900 text-sm">{job.title}</h3>
                  <span className="text-[10px] text-slate-400 font-semibold">{job.location || 'Remote'}</span>
                </div>
              ))}
              {jobs.length === 0 && <p className="text-slate-500 text-sm">No jobs posted yet.</p>}
            </div>
          </div>

          {/* Chat / Message Area */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-[500px]">
            {selectedMsgJobId ? (
              <>
                {/* Channels Sidebar */}
                <div className="md:col-span-1 border-r border-slate-100 pr-4 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Announcement Channels</h3>
                  <div className="space-y-1">
                    {msgChannels.map(channel => {
                      const Icon = channel.icon;
                      const isSelected = selectedChannelId === channel.id;
                      return (
                        <div
                          key={channel.id || 'general'}
                          onClick={() => handleSelectChannel(channel.id)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                            isSelected 
                              ? 'bg-purple-100 text-purple-750' 
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{channel.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Messages Log & Input */}
                <div className="md:col-span-2 flex flex-col h-full justify-between">
                  <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 mb-4 pr-2">
                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
                      {selectedChannelId 
                        ? `${msgChannels.find(c => c.id === selectedChannelId)?.title || 'Round Channel'}`
                        : 'General Announcements'
                      }
                    </h3>
                    {isSelectedMsgJobClosed && (
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-amber-800 text-xs">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Recruiting on Hold:</span> Communication for this job is currently paused. Resume recruiting to broadcast new announcements.
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      {messages.map((msg: any) => (
                        <div key={msg.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-purple-700">{msg.senderName}</span>
                            <span className="text-slate-450">{formatTimeAMPM(msg.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <p className="text-slate-400 text-xs text-center py-12">No announcements posted in this channel yet.</p>
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendAnnouncement} className="border-t border-slate-100 pt-4 flex gap-2">
                    <input
                      type="text"
                      placeholder={isSelectedMsgJobClosed ? "Communication is paused while recruiting is on hold." : "Write an announcement to candidates..."}
                      value={newMessageText}
                      onChange={e => setNewMessageText(e.target.value)}
                      disabled={isSelectedMsgJobClosed}
                      className={`flex-1 px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm ${isSelectedMsgJobClosed ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-100' : ''}`}
                    />
                    <button
                      type="submit"
                      disabled={isSelectedMsgJobClosed}
                      className={`p-3 text-white rounded-xl transition-all shadow-sm ${isSelectedMsgJobClosed ? 'bg-slate-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="md:col-span-3 flex flex-col items-center justify-center text-slate-400 py-12">
                <MessageSquare className="h-16 w-16 mb-4 opacity-20 text-slate-650" />
                <p className="font-bold text-slate-500">No Job Selected</p>
                <p className="text-xs text-slate-400 mt-1">Please select a job from the left panel to load communication channels.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" /> Job Activity Log History
            </h2>
            <p className="text-slate-500 text-xs mt-1">Track all lifecycle changes to your job postings including postings, updates, pauses, resumes, and deletions.</p>
          </div>

          <div className="relative border-l-2 border-slate-100 pl-6 ml-4 space-y-8">
            {activityLogs.map((log) => {
              let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
              let dotColor = "bg-slate-300";
              
              if (log.action === "POSTED") {
                badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-250";
                dotColor = "bg-emerald-500 ring-4 ring-emerald-100";
              } else if (log.action === "EDITED") {
                badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                dotColor = "bg-blue-500 ring-4 ring-blue-100";
              } else if (log.action === "PAUSED") {
                badgeColor = "bg-amber-50 text-amber-750 border-amber-200";
                dotColor = "bg-amber-500 ring-4 ring-amber-100";
              } else if (log.action === "RESUMED") {
                badgeColor = "bg-purple-50 text-purple-750 border-purple-200";
                dotColor = "bg-purple-500 ring-4 ring-purple-100";
              } else if (log.action === "DELETED") {
                badgeColor = "bg-red-50 text-red-700 border-red-200";
                dotColor = "bg-red-500 ring-4 ring-red-100";
              }

              return (
                <div key={log.id} className="relative space-y-1">
                  {/* Timeline Dot */}
                  <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ${dotColor}`} />
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${badgeColor}`}>
                      {log.action}
                    </span>
                    <span className="font-extrabold text-slate-800">{log.jobTitle}</span>
                    <span className="text-slate-400 font-medium">• {formatTimeAMPM(log.timestamp)}</span>
                  </div>
                  {log.details && (
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed pl-1">{log.details}</p>
                  )}
                </div>
              );
            })}

            {activityLogs.length === 0 && (
              <div className="text-center py-12 text-slate-450">
                <History className="h-12 w-12 mx-auto mb-3 opacity-20 text-slate-650" />
                <p className="font-bold text-slate-500 text-sm">No Activity Found</p>
                <p className="text-xs text-slate-400 mt-1">Lifecycle events will show here as you manage job postings.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {jobToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-3 bg-red-50 rounded-2xl w-fit">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Delete Job Posting?</h3>
              <p className="text-slate-550 text-xs mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-extrabold text-slate-800">"{jobToDelete.title}"</span>? This will permanently delete the posting, its custom interview rounds, round announcements, and all candidate applications. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button 
                onClick={() => setJobToDelete(null)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-2.5 text-xs border-none"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmDeleteJob} 
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-4 py-2.5 text-xs border-none"
              >
                Yes, Delete Posting
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MCQ QUESTIONS CONFIGURATION MODAL */}
      {activeMcqRound && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-150">
              <div>
                <h3 className="text-lg font-black text-slate-950">Setup MCQ Questions</h3>
                <p className="text-slate-550 text-xs mt-0.5">Configure questions for round: <span className="font-extrabold text-slate-700">"{activeMcqRound.title}"</span></p>
              </div>
              <button 
                onClick={() => setActiveMcqRound(null)} 
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">
              
              {/* Overall test duration */}
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-purple-750 uppercase">Overall Test Duration (Optional)</h4>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Define a maximum time limit for the entire test. Leave blank for unlimited time.</p>
                </div>
                <div className="flex items-center gap-1.5 w-full md:w-fit">
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={mcqDurationInput}
                    onChange={e => setMcqDurationInput(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-28 text-center outline-none focus:border-purple-650 font-bold bg-white"
                  />
                  <span className="text-xs font-bold text-slate-500">Minutes</span>
                </div>
              </div>

              {mcqQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4 relative">
                  {/* Remove Question Button */}
                  <button 
                    onClick={() => {
                      const updated = mcqQuestions.filter((_, idx) => idx !== qIdx);
                      setMcqQuestions(updated);
                    }}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition-all p-1 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Question Text */}
                    <div className="md:col-span-2 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Question {qIdx + 1}</label>
                        <input
                          type="text"
                          required
                          placeholder="Write question here..."
                          value={q.questionText}
                          onChange={e => {
                            const updated = [...mcqQuestions];
                            updated[qIdx].questionText = e.target.value;
                            setMcqQuestions(updated);
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm bg-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {/* Type: Single or Multiple Choice */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Choice Type</label>
                          <select
                            value={q.type}
                            onChange={e => {
                              const updated = [...mcqQuestions];
                              updated[qIdx].type = e.target.value;
                              updated[qIdx].correctAnswers = [];
                              setMcqQuestions(updated);
                            }}
                            className="w-full px-2.5 py-2 border border-slate-200 rounded-xl outline-none text-slate-800 text-xs bg-white"
                          >
                            <option value="SINGLE">Single Choice (Radio)</option>
                            <option value="MULTIPLE">Multiple Choice (Checkboxes)</option>
                          </select>
                        </div>
                        {/* Marks */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Marks / Weight</label>
                          <input
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={e => {
                              const updated = [...mcqQuestions];
                              updated[qIdx].marks = Math.max(1, Number(e.target.value));
                              setMcqQuestions(updated);
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-slate-850 text-xs bg-white"
                          />
                        </div>
                        {/* Time limit (optional) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time Limit (Secs)</label>
                          <input
                            type="number"
                            min={5}
                            placeholder="Optional"
                            value={q.duration || ''}
                            onChange={e => {
                              const updated = [...mcqQuestions];
                              updated[qIdx].duration = e.target.value;
                              setMcqQuestions(updated);
                            }}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-xl outline-none text-slate-850 text-xs bg-white"
                          />
                        </div>
                      </div>

                      {/* Image Upload Option */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Question Image (Optional)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleMcqImageUpload(qIdx, file);
                            }}
                            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                          />
                          {q.imageBlob && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...mcqQuestions];
                                updated[qIdx].imageBlob = null;
                                setMcqQuestions(updated);
                              }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                        {q.imageBlob && (
                          <div className="relative w-fit border border-slate-250 rounded-xl overflow-hidden mt-1.5">
                            <img src={q.imageBlob} className="max-h-24 object-cover" alt="Question Preview" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options / Choices Setup */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Choices & Correct Answer</label>
                      <div className="space-y-1.5">
                        {q.options.map((opt: string, oIdx: number) => {
                          const isCorrect = q.correctAnswers.includes(oIdx);
                          return (
                            <div key={oIdx} className="flex items-center gap-2">
                              <input
                                type={q.type === 'SINGLE' ? 'radio' : 'checkbox'}
                                name={`correct-${qIdx}`}
                                checked={isCorrect}
                                onChange={() => {
                                  const updated = [...mcqQuestions];
                                  if (q.type === 'SINGLE') {
                                    updated[qIdx].correctAnswers = [oIdx];
                                  } else {
                                    if (isCorrect) {
                                      updated[qIdx].correctAnswers = q.correctAnswers.filter((idx: number) => idx !== oIdx);
                                    } else {
                                      updated[qIdx].correctAnswers = [...q.correctAnswers, oIdx];
                                    }
                                  }
                                  setMcqQuestions(updated);
                                }}
                                className="h-3.5 w-3.5 text-purple-600 focus:ring-purple-500 border-slate-300 rounded"
                              />
                              <input
                                type="text"
                                placeholder={`Option ${oIdx + 1}`}
                                value={opt}
                                onChange={e => {
                                  const updated = [...mcqQuestions];
                                  updated[qIdx].options[oIdx] = e.target.value;
                                  setMcqQuestions(updated);
                                }}
                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white"
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...mcqQuestions];
                                    updated[qIdx].options = q.options.filter((_: any, idx: number) => idx !== oIdx);
                                    updated[qIdx].correctAnswers = q.correctAnswers
                                      .map((idx: number) => idx < oIdx ? idx : idx - 1)
                                      .filter((idx: number) => idx >= 0 && idx < updated[qIdx].options.length);
                                    setMcqQuestions(updated);
                                  }}
                                  className="text-slate-400 hover:text-red-500"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.options.length < 5 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...mcqQuestions];
                            updated[qIdx].options.push('');
                            setMcqQuestions(updated);
                          }}
                          className="text-xs font-bold text-purple-650 hover:text-purple-750 flex items-center gap-1 mt-1 pl-1"
                        >
                          <Plus className="h-3 w-3" /> Add Choice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  setMcqQuestions([...mcqQuestions, {
                    questionText: '',
                    imageBlob: null,
                    type: 'SINGLE',
                    options: ['', ''],
                    correctAnswers: [],
                    marks: 1
                  }]);
                }}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-2xl text-slate-500 hover:text-slate-700 text-sm font-bold transition-all flex items-center justify-center gap-2 bg-slate-50/20"
              >
                <Plus className="h-4 w-4" /> Add Question
              </button>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-2 justify-end pt-4 border-t border-slate-150">
              <Button 
                onClick={() => setActiveMcqRound(null)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-5 py-2.5 text-xs border-none"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveMcqQuestions} 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-5 py-2.5 text-xs border-none"
              >
                Save Questions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CODING QUESTION CONFIGURATION MODAL */}
      {/* CODING QUESTION CONFIGURATION MODAL */}
      {activeCodingRound && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {!editingQuestion ? (
              <>
                {/* List View */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Setup Coding Challenge Questions</h3>
                    <p className="text-slate-550 text-xs mt-0.5">Manage questions for round: <span className="font-extrabold text-slate-700">"{activeCodingRound.title}"</span></p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setActiveCodingRound(null)} 
                    className="p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
                  {/* Overall test duration */}
                  <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="text-left">
                      <h4 className="text-xs font-black text-purple-750 uppercase">Overall Test Duration (Optional)</h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Define a maximum time limit for the entire test. Leave blank for unlimited time.</p>
                    </div>
                    <div className="flex items-center gap-1.5 w-full md:w-fit">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 45"
                        value={codingDurationInput}
                        onChange={e => setCodingDurationInput(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-xs w-28 text-center outline-none focus:border-purple-600 font-bold bg-white text-slate-800"
                      />
                      <span className="text-xs font-bold text-slate-500">Minutes</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await RoundService.saveCodingQuestion(activeCodingRound.id, {
                              codingDuration: codingDurationInput.trim() ? Number(codingDurationInput) : null
                            });
                            alert('Coding duration updated successfully!');
                            await loadJobs();
                          } catch (err) {
                            console.error(err);
                            alert('Failed to update coding duration');
                          }
                        }}
                        className="ml-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configured Questions ({codingQuestions.length})</span>
                    <button
                      type="button"
                      onClick={handleStartAddQuestion}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {codingQuestions.map((q, qIdx) => (
                      <div key={q.id || qIdx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center hover:bg-slate-100/50 transition-all">
                        <div className="text-left">
                          <h4 className="font-bold text-slate-800 text-sm">{q.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Marks: <strong className="text-slate-750 font-bold">{q.marks}</strong></span>
                            <span>•</span>
                            <span>Test Cases: <strong className="text-slate-750 font-bold">{q.testCases?.length || 0}</strong></span>
                            {q.maxRunAttempts != null && (
                              <>
                                <span>•</span>
                                <span className="text-amber-600 font-bold">Max Runs: {q.maxRunAttempts}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(q)}
                            className="p-2 hover:bg-white text-slate-600 hover:text-purple-600 rounded-xl border border-transparent hover:border-slate-200 shadow-sm transition-all"
                            title="Edit Question"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2 hover:bg-white text-red-500 hover:text-red-700 rounded-xl border border-transparent hover:border-slate-200 shadow-sm transition-all"
                            title="Delete Question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {codingQuestions.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                        <p className="text-slate-450 text-sm font-medium italic">No questions added yet. Click "+ Add Question" to get started.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-150">
                  <Button 
                    onClick={() => setActiveCodingRound(null)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-5 py-2.5 text-xs border-none"
                  >
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Form View (Edit/New) */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-150">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">
                      {editingQuestion.isNew ? 'Create Coding Question' : 'Edit Coding Question'}
                    </h3>
                    <p className="text-slate-550 text-xs mt-0.5">Round: <span className="font-extrabold text-slate-700">"{activeCodingRound.title}"</span></p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setEditingQuestion(null)} 
                    className="p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCodingQuestion} className="flex-1 overflow-y-auto py-6 space-y-4 pr-2 text-left">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Challenge Title</label>
                    <input 
                      required
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm font-semibold" 
                      placeholder="e.g. Reverse a Linked List" 
                      value={codingTitle} 
                      onChange={e => setCodingTitle(e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Marks</label>
                      <input 
                        type="number"
                        required
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm font-semibold" 
                        value={codingMarks} 
                        onChange={e => setCodingMarks(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Max Run Attempts
                        <span className="ml-1 text-slate-400 font-normal normal-case">(Optional)</span>
                      </label>
                      <input 
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 text-sm font-semibold" 
                        value={codingMaxRunAttemptsInput} 
                        onChange={e => setCodingMaxRunAttemptsInput(e.target.value)} 
                      />
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Limit how many times candidates can run their code before submitting.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Constraints (Optional)</label>
                      <input 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm font-semibold" 
                        placeholder="e.g. O(N), Space O(1)" 
                        value={codingConstraints} 
                        onChange={e => setCodingConstraints(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Problem Description</label>
                    <textarea 
                      required
                      rows={4}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-purple-500 text-slate-800 text-sm font-medium" 
                      placeholder="Describe the problem, input format, and output format..." 
                      value={codingDescription} 
                      onChange={e => setCodingDescription(e.target.value)} 
                    />
                  </div>

                  {/* Starter Code Editor Section */}
                  <div className="border border-slate-150 rounded-2xl p-4 bg-slate-50/50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-black text-slate-650 uppercase">Configure Starter Templates</h4>
                      <select
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white font-bold text-slate-700"
                        value={selectedStarterLang}
                        onChange={e => setSelectedStarterLang(e.target.value)}
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="typescript">TypeScript</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                      </select>
                    </div>
                    <textarea
                      rows={6}
                      className="w-full p-3 border border-slate-250 rounded-xl font-mono text-xs bg-slate-900 text-slate-100 outline-none focus:border-purple-500"
                      value={codingStarterCode[selectedStarterLang] || ''}
                      onChange={e => {
                        const text = e.target.value;
                        setCodingStarterCode(prev => ({
                          ...prev,
                          [selectedStarterLang]: text
                        }));
                      }}
                    />
                  </div>

                  {/* Test Cases List */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Test Cases ({codingTestCases.length})</label>
                      <button
                        type="button"
                        onClick={() => setCodingTestCases([...codingTestCases, { input: '', expectedOutput: '', isHidden: false }])}
                        className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-750 text-xs font-bold rounded-lg border border-purple-200 transition-all shadow-sm"
                      >
                        + Add Test Case
                      </button>
                    </div>

                    <div className="space-y-3">
                      {codingTestCases.map((tc, tcIdx) => (
                        <div key={tcIdx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 relative">
                          <button
                            type="button"
                            onClick={() => setCodingTestCases(codingTestCases.filter((_, idx) => idx !== tcIdx))}
                            className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-655"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Standard Input / Args</label>
                              <textarea
                                rows={2}
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs font-mono"
                                placeholder="e.g. 5\n1 2 3 4 5"
                                value={tc.input}
                                onChange={e => {
                                  const updated = [...codingTestCases];
                                  updated[tcIdx].input = e.target.value;
                                  setCodingTestCases(updated);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expected Output</label>
                              <textarea
                                rows={2}
                                required
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-slate-800 text-xs font-mono"
                                placeholder="e.g. 15"
                                value={tc.expectedOutput}
                                onChange={e => {
                                  const updated = [...codingTestCases];
                                  updated[tcIdx].expectedOutput = e.target.value;
                                  setCodingTestCases(updated);
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`tc-hidden-${tcIdx}`}
                              checked={tc.isHidden === true || tc.isHidden === 'true'}
                              onChange={e => {
                                const updated = [...codingTestCases];
                                updated[tcIdx].isHidden = e.target.checked;
                                setCodingTestCases(updated);
                              }}
                              className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                            />
                            <label htmlFor={`tc-hidden-${tcIdx}`} className="text-xs font-bold text-slate-500 select-none">
                              Is Hidden Test Case? (Used for final scoring, not visible to candidate)
                            </label>
                          </div>
                        </div>
                      ))}
                      {codingTestCases.length === 0 && (
                        <p className="text-slate-450 text-xs italic text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">No test cases added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-150">
                    <Button 
                      type="button"
                      onClick={() => setEditingQuestion(null)} 
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-5 py-2.5 text-xs border-none"
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-5 py-2.5 text-xs border-none"
                    >
                      Save Question
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI SCREENING MODAL */}
      {isScreeningModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                  <Sparkles className="h-5 w-5 text-purple-650 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">AI Candidate Screener</h2>
                  <p className="text-xs text-slate-500 font-medium">Initial screening match based on keywords</p>
                </div>
              </div>
              <button
                onClick={() => setIsScreeningModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all border-none cursor-pointer"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleRunScreening} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Screening Keywords & Requirements</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter comma-separated keywords e.g. React, Node.js, Python, AWS, CGPA 8"
                  value={screeningKeywords}
                  onChange={e => setScreeningKeywords(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-2xl outline-none focus:border-purple-500 text-slate-850 text-xs bg-white font-medium shadow-sm leading-relaxed"
                />
                <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed">
                  💡 The AI screening engine parses each candidate's listed skills, project descriptions, work experience, education history, and cover letter to calculate their match score.
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <Button 
                  type="button"
                  onClick={() => setIsScreeningModalOpen(false)} 
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-5 py-2.5 text-xs border-none"
                  disabled={isScreeningLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-5 py-2.5 text-xs border-none flex items-center gap-1.5"
                  disabled={isScreeningLoading}
                >
                  {isScreeningLoading ? 'Running AI...' : 'Start Screening'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
