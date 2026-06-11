import React, { useState, useEffect } from 'react';
import { JobService, ApplicationService, AnalyticsService } from '../services/api';
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
  AlertCircle
} from 'lucide-react';

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
  }>({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salaryRange: '',
    jobType: 'Full-time',
    questions: []
  });
  const [questionInput, setQuestionInput] = useState('');
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'JOBS' | 'ANALYTICS'>('JOBS');
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null); // For viewing detailed candidate profiles

  useEffect(() => {
    if (user?.status === 'APPROVED') {
      loadJobs();
      loadAnalytics();
    }
  }, [user]);

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
    } catch (e) {
      console.error(e);
    }
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
        alert('Job updated successfully!');
      } else {
        await JobService.createJob(jobData);
        alert('Job published successfully!');
      }

      setShowNewJob(false);
      setEditingJobId(null);
      loadJobs();
      loadAnalytics();
      setNewJob({ title: '', description: '', requirements: '', location: '', salaryRange: '', jobType: 'Full-time', questions: [] });
      setQuestionInput('');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to post job');
    }
  };

  const handleStartEditJob = (jobId: string) => {
    const jobToEdit = jobs.find(j => j.id === jobId);
    if (jobToEdit) {
      setNewJob({
        title: jobToEdit.title,
        description: jobToEdit.description,
        requirements: jobToEdit.requirements,
        location: jobToEdit.location || '',
        salaryRange: jobToEdit.salaryRange || '',
        jobType: jobToEdit.jobType || 'Full-time',
        questions: Array.isArray(jobToEdit.questions) ? jobToEdit.questions : []
      });
      setQuestionInput('');
      setEditingJobId(jobId);
      setShowNewJob(true);
      setSelectedApplicant(null);
    }
  };

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
                setNewJob({ title: '', description: '', requirements: '', location: '', salaryRange: '', jobType: 'Full-time', questions: [] });
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
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${
                    selectedApplicant.status === 'APPLIED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    selectedApplicant.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    selectedApplicant.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {selectedApplicant.status}
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

                <div className="flex gap-2 border-t border-slate-100 pt-6">
                  <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'SHORTLISTED')} className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Shortlist</Button>
                  <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'HIRED')} className="bg-green-50 text-green-700 hover:bg-green-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Hire</Button>
                  <Button size="sm" onClick={() => updateStatus(selectedApplicant.id, 'REJECTED')} className="bg-red-50 text-red-700 hover:bg-red-100 border-none px-6 py-2.5 font-bold rounded-xl flex-1">Reject</Button>
                </div>
              </div>
            ) : selectedJobId ? (
              // APPLICANTS LIST
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900">Applicants ({applicants.length})</h2>
                  <Button 
                    onClick={() => handleStartEditJob(selectedJobId!)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2 px-4 text-xs transition-all flex items-center gap-1.5 border-none"
                  >
                    Edit Job Posting
                  </Button>
                </div>
                <div className="space-y-4">
                  {applicants.map(app => (
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
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase border ${
                          app.status === 'APPLIED' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                          app.status === 'SHORTLISTED' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          app.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' :
                          'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>{app.status}</span>
                      </div>
                      
                      <div className="flex gap-2 items-center justify-between border-t border-slate-100 pt-4 mt-2">
                        <button 
                          onClick={() => setSelectedApplicant(app)}
                          className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        >
                          <User className="h-3.5 w-3.5" /> View Profile & Details
                        </button>
                        <div className="flex gap-1.5">
                          <Button size="sm" onClick={() => updateStatus(app.id, 'SHORTLISTED')} className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-none font-bold text-xs">Shortlist</Button>
                          <Button size="sm" onClick={() => updateStatus(app.id, 'HIRED')} className="bg-green-50 text-green-700 hover:bg-green-100 border-none font-bold text-xs">Hire</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {applicants.length === 0 && <p className="text-slate-500 py-12 text-center">No applicants yet for this job posting.</p>}
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
                    <span>Hired ({analytics.applications.HIRED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.HIRED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.HIRED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
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
    </div>
  );
}
