import { useState, useEffect } from 'react';
import { AdminService, AnalyticsService } from '../services/api';
import { Button } from '../components/ui/button';
import { 
  Users, 
  Briefcase, 
  FileText, 
  Building2, 
  ShieldAlert, 
  BarChart3, 
  Settings,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export function AdminDashboard() {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'RECRUITERS'>('ANALYTICS');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recruitersRes, analyticsRes] = await Promise.all([
        AdminService.getRecruiters(),
        AnalyticsService.getAdminAnalytics()
      ]);
      setRecruiters(recruitersRes);
      setAnalytics(analyticsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await AdminService.updateRecruiterStatus(id, status);
      const [recData, analyticData] = await Promise.all([
        AdminService.getRecruiters(),
        AnalyticsService.getAdminAnalytics()
      ]);
      setRecruiters(recData);
      setAnalytics(analyticData);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-600 font-medium">Loading administrator control room...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600 animate-spin-slow" /> Administrator Portal
          </h2>
          <p className="text-slate-500 text-sm mt-1">Manage system configurations, verify recruiters, and monitor campus placement analytics.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button 
          onClick={() => setActiveTab('ANALYTICS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'ANALYTICS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <BarChart3 className="h-4 w-4" /> System Analytics
        </button>
        <button 
          onClick={() => setActiveTab('RECRUITERS')}
          className={`pb-4 px-6 font-bold flex items-center gap-2 transition-all ${activeTab === 'RECRUITERS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Building2 className="h-4 w-4" /> Verify Recruiters ({recruiters.filter(r => r.status === 'PENDING').length})
        </button>
      </div>

      {/* SYSTEM ANALYTICS TAB */}
      {activeTab === 'ANALYTICS' && analytics && (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Students</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.totalStudents}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Recruiters</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.totalRecruiters}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Jobs Posted</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.totalJobs}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center gap-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Placement Rate</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{analytics.summary.placementRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Recruiters Approval Stats */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-indigo-600" /> Recruiter Account Status
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Approved Accounts</span>
                    <span className="font-bold text-emerald-600">{analytics.recruiters.approved}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analytics.summary.totalRecruiters > 0 ? (analytics.recruiters.approved / analytics.summary.totalRecruiters) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Pending Approval</span>
                    <span className="font-bold text-amber-600">{analytics.recruiters.pending}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${analytics.summary.totalRecruiters > 0 ? (analytics.recruiters.pending / analytics.summary.totalRecruiters) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jobs Status Stats */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-purple-600" /> Job Openings Status
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Open & Active</span>
                    <span className="font-bold text-blue-600">{analytics.jobs.open}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analytics.summary.totalJobs > 0 ? (analytics.jobs.open / analytics.summary.totalJobs) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold text-slate-700 mb-1">
                    <span>Closed Postings</span>
                    <span className="font-bold text-slate-600">{analytics.jobs.closed}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full" style={{ width: `${analytics.summary.totalJobs > 0 ? (analytics.jobs.closed / analytics.summary.totalJobs) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Funnel Status */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> Global Application Distribution
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                    <span>Applied / Screened ({analytics.applications.APPLIED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.APPLIED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.APPLIED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                    <span>Shortlisted ({analytics.applications.SHORTLISTED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.SHORTLISTED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.SHORTLISTED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-0.5">
                    <span>Hired / Offered ({analytics.applications.HIRED})</span>
                    <span>{analytics.summary.totalApplications > 0 ? Math.round((analytics.applications.HIRED / analytics.summary.totalApplications) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${analytics.summary.totalApplications > 0 ? (analytics.applications.HIRED / analytics.summary.totalApplications) * 100 : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECRUITERS TAB */}
      {activeTab === 'RECRUITERS' && (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm animate-fade-in">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Verification Waiting Room</span>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Clock className="h-3 w-3" /> Action Required
            </span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Recruiter Name</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Company & Role</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                <th className="p-5 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">Verification Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recruiters.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-5">
                    <p className="font-bold text-slate-900">{rec.user.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{rec.user.email}</p>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-slate-900">{rec.companyName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{rec.designation}</p>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      rec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      rec.status === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="p-5 text-right space-x-2">
                    {rec.status === 'PENDING' && (
                      <>
                        <Button size="sm" onClick={() => updateStatus(rec.id, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-1.5 px-4 text-xs transition-all flex inline-flex items-center gap-1">
                          <ThumbsUp className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(rec.id, 'REJECTED')} className="text-red-600 border-red-200 hover:bg-red-50 font-bold rounded-xl py-1.5 px-4 text-xs transition-all flex inline-flex items-center gap-1">
                          <ThumbsDown className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {rec.status === 'REJECTED' && (
                      <Button size="sm" onClick={() => updateStatus(rec.id, 'APPROVED')} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl py-1.5 px-4 text-xs transition-all">
                        Approve Instead
                      </Button>
                    )}
                    {rec.status === 'APPROVED' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(rec.id, 'REJECTED')} className="text-slate-500 hover:bg-slate-100 border-slate-200 font-bold rounded-xl py-1.5 px-4 text-xs transition-all">
                        Revoke Access
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {recruiters.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">No recruiters found in the system database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
