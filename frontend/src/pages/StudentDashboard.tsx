import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';

export function StudentDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'APPLICATIONS' | 'PROFILE' | 'ANALYTICS'>('BROWSE');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
                    <Calendar className="h-3.5 w-3.5" /> Applied on {new Date(app.appliedAt).toLocaleDateString()}
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
                              {progression?.feedback && (
                                <p className="text-xs text-purple-600 font-medium mt-1 bg-white p-2 rounded-xl border border-purple-100 italic">
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
                                <span className="text-slate-450">{new Date(msg.createdAt).toLocaleString()}</span>
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
    </div>
  );
}
