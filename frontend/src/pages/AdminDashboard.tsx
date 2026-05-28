import { useState, useEffect } from 'react';
import { AdminService } from '../services/api';
import { Button } from '../components/ui/button';

export function AdminDashboard() {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecruiters();
  }, []);

  const loadRecruiters = async () => {
    try {
      const data = await AdminService.getRecruiters();
      setRecruiters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await AdminService.updateRecruiterStatus(id, status);
      loadRecruiters();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading admin dashboard...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-black text-gray-900 mb-8">Admin Dashboard</h2>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 font-bold text-gray-600 text-sm">Recruiter Name</th>
              <th className="p-4 font-bold text-gray-600 text-sm">Company & Role</th>
              <th className="p-4 font-bold text-gray-600 text-sm">Status</th>
              <th className="p-4 font-bold text-gray-600 text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {recruiters.map(rec => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <p className="font-bold text-gray-900">{rec.user.fullName}</p>
                  <p className="text-sm text-gray-500">{rec.user.email}</p>
                </td>
                <td className="p-4">
                  <p className="font-bold text-gray-900">{rec.companyName}</p>
                  <p className="text-sm text-gray-500">{rec.designation}</p>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    rec.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    rec.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {rec.status}
                  </span>
                </td>
                <td className="p-4 text-right space-x-2">
                  {rec.status === 'PENDING' && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(rec.id, 'APPROVED')} className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(rec.id, 'REJECTED')} className="text-red-600 border-red-200 hover:bg-red-50">Reject</Button>
                    </>
                  )}
                  {rec.status === 'REJECTED' && (
                    <Button size="sm" onClick={() => updateStatus(rec.id, 'APPROVED')} className="bg-gray-200 text-gray-800 hover:bg-gray-300">Approve Instead</Button>
                  )}
                  {rec.status === 'APPROVED' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(rec.id, 'REJECTED')} className="text-gray-500">Revoke</Button>
                  )}
                </td>
              </tr>
            ))}
            {recruiters.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No recruiters found in the system.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
