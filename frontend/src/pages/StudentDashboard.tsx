import { useState, useEffect } from 'react';
import { JobService, ApplicationService } from '../services/api';
import { Button } from '../components/ui/button';
import { Briefcase, Building2, MapPin, DollarSign, CheckCircle2 } from 'lucide-react';

export function StudentDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'BROWSE' | 'APPLICATIONS'>('BROWSE');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [jobsData, appsData] = await Promise.all([
        JobService.getAllJobs(),
        ApplicationService.getMyApplications()
      ]);
      setJobs(jobsData);
      setMyApplications(appsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApplicationService.applyToJob(selectedJob.id, { coverLetterText: coverLetter });
      alert('Application submitted successfully!');
      setSelectedJob(null);
      setCoverLetter('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to apply');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading jobs...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex gap-4 border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('BROWSE')}
          className={`pb-4 px-4 font-bold ${activeTab === 'BROWSE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          Browse Jobs
        </button>
        <button 
          onClick={() => setActiveTab('APPLICATIONS')}
          className={`pb-4 px-4 font-bold ${activeTab === 'APPLICATIONS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
        >
          My Applications ({myApplications.length})
        </button>
      </div>

      {activeTab === 'BROWSE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => (
            <div key={job.id} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{job.title}</h3>
                  <p className="text-blue-600 font-semibold text-sm flex items-center gap-1 mt-1">
                    <Building2 className="h-4 w-4" /> {job.recruiter.companyName}
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-600 flex items-center gap-2"><MapPin className="h-4 w-4" /> {job.location || 'Remote'}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2"><DollarSign className="h-4 w-4" /> {job.salaryRange || 'Not disclosed'}</p>
                <p className="text-sm text-gray-600 flex items-center gap-2"><Briefcase className="h-4 w-4" /> {job.jobType || 'Full-time'}</p>
              </div>
              
              {myApplications.some(app => app.jobId === job.id) ? (
                <Button disabled className="w-full bg-green-50 text-green-700 border-none">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Applied
                </Button>
              ) : (
                <Button onClick={() => setSelectedJob(job)} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                  Apply Now
                </Button>
              )}
            </div>
          ))}
          {jobs.length === 0 && <p className="text-gray-500 col-span-3 text-center py-12">No open jobs at the moment.</p>}
        </div>
      )}

      {activeTab === 'APPLICATIONS' && (
        <div className="space-y-4">
          {myApplications.map(app => (
            <div key={app.id} className="bg-white rounded-2xl border border-gray-100 p-6 flex justify-between items-center shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{app.job.title}</h3>
                <p className="text-gray-500 text-sm">{app.job.recruiter.companyName}</p>
                <p className="text-xs text-gray-400 mt-2">Applied on {new Date(app.appliedAt).toLocaleDateString()}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                app.status === 'APPLIED' ? 'bg-blue-50 text-blue-700' :
                app.status === 'SHORTLISTED' ? 'bg-yellow-50 text-yellow-700' :
                app.status === 'REJECTED' ? 'bg-red-50 text-red-700' :
                'bg-green-50 text-green-700'
              }`}>
                {app.status}
              </span>
            </div>
          ))}
          {myApplications.length === 0 && <p className="text-gray-500 text-center py-12">You haven't applied to any jobs yet.</p>}
        </div>
      )}

      {/* Apply Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-black mb-2">Apply for {selectedJob.title}</h2>
            <p className="text-gray-500 mb-6">{selectedJob.recruiter.companyName}</p>
            
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cover Letter / Pitch</label>
                <textarea 
                  required 
                  rows={6}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  placeholder="Tell the recruiter why you are a great fit..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setSelectedJob(null)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 text-white">Submit Application</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
