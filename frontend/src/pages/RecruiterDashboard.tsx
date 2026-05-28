import { useState, useEffect } from 'react';
import { JobService, ApplicationService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Briefcase } from 'lucide-react';

export function RecruiterDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJob, setNewJob] = useState({ title: '', description: '', requirements: '', location: '', salaryRange: '', jobType: 'Full-time' });

  useEffect(() => {
    if (user?.status === 'APPROVED') loadJobs();
  }, [user]);

  const loadJobs = async () => {
    try {
      const data = await JobService.getRecruiterJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadApplicants = async (jobId: string) => {
    try {
      const data = await ApplicationService.getJobApplicants(jobId);
      setApplicants(data);
      setSelectedJobId(jobId);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await JobService.createJob(newJob);
      setShowNewJob(false);
      loadJobs();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to post job');
    }
  };

  const updateStatus = async (appId: string, status: string) => {
    try {
      await ApplicationService.updateStatus(appId, status);
      loadApplicants(selectedJobId!);
    } catch (e) {
      console.error(e);
    }
  };

  if (user?.status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex p-6 bg-yellow-100 rounded-3xl mb-6">
          <span className="text-4xl">⏳</span>
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">Account Pending Approval</h2>
        <p className="text-gray-600 text-lg">An administrator needs to verify your recruiter account before you can post jobs. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: My Jobs */}
      <div className="lg:col-span-1 border-r border-gray-100 pr-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-gray-900">My Job Postings</h2>
          <Button size="sm" onClick={() => { setShowNewJob(true); setSelectedJobId(null); }} className="bg-purple-600 hover:bg-purple-700 text-white">
            + Post Job
          </Button>
        </div>

        <div className="space-y-4">
          {jobs.map(job => (
            <div 
              key={job.id} 
              onClick={() => { setShowNewJob(false); loadApplicants(job.id); }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedJobId === job.id ? 'border-purple-600 bg-purple-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
            >
              <h3 className="font-bold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{job._count?.applications || 0} applicants</p>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-gray-500 text-sm">No jobs posted yet.</p>}
        </div>
      </div>

      {/* Right Column: Applicants or New Job Form */}
      <div className="lg:col-span-2">
        {showNewJob ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <h2 className="text-2xl font-black mb-6">Post a New Job</h2>
            <form onSubmit={handlePostJob} className="space-y-4">
              <div><label className="block text-sm font-bold mb-1">Job Title</label><input required className="w-full p-3 border-2 rounded-xl" value={newJob.title} onChange={e => setNewJob({...newJob, title: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Location</label><input required className="w-full p-3 border-2 rounded-xl" value={newJob.location} onChange={e => setNewJob({...newJob, location: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Salary Range</label><input className="w-full p-3 border-2 rounded-xl" value={newJob.salaryRange} onChange={e => setNewJob({...newJob, salaryRange: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Description</label><textarea required rows={4} className="w-full p-3 border-2 rounded-xl" value={newJob.description} onChange={e => setNewJob({...newJob, description: e.target.value})} /></div>
              <div><label className="block text-sm font-bold mb-1">Requirements</label><textarea required rows={4} className="w-full p-3 border-2 rounded-xl" value={newJob.requirements} onChange={e => setNewJob({...newJob, requirements: e.target.value})} /></div>
              <Button type="submit" className="w-full bg-purple-600 text-white h-12">Publish Job</Button>
            </form>
          </div>
        ) : selectedJobId ? (
          <div>
            <h2 className="text-2xl font-black mb-6">Applicants ({applicants.length})</h2>
            <div className="space-y-4">
              {applicants.map(app => (
                <div key={app.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{app.student.user.fullName}</h3>
                      <p className="text-sm text-gray-500">{app.student.user.email} • {app.student.college} • {app.student.branch}</p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-gray-100 rounded-full">{app.status}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl mb-4 text-sm text-gray-700 whitespace-pre-wrap">
                    {app.coverLetterText}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(app.id, 'SHORTLISTED')} className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-none">Shortlist</Button>
                    <Button size="sm" onClick={() => updateStatus(app.id, 'HIRED')} className="bg-green-50 text-green-700 hover:bg-green-100 border-none">Hire</Button>
                    <Button size="sm" onClick={() => updateStatus(app.id, 'REJECTED')} className="bg-red-50 text-red-700 hover:bg-red-100 border-none">Reject</Button>
                  </div>
                </div>
              ))}
              {applicants.length === 0 && <p className="text-gray-500">No applicants yet.</p>}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <Briefcase className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a job to view applicants, or post a new job.</p>
          </div>
        )}
      </div>
    </div>
  );
}
