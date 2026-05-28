import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthService } from '../services/api';
import { Button } from '../components/ui/button';
import { UserPlus, Briefcase, GraduationCap } from 'lucide-react';

export function Signup() {
  const [role, setRole] = useState<'STUDENT' | 'RECRUITER'>('STUDENT');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    // Student specifics
    college: '',
    branch: '',
    graduationYear: '',
    // Recruiter specifics
    companyName: '',
    designation: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await AuthService.signup({ ...formData, role });
      login(data.user, data.token);
      
      if (data.user.role === 'STUDENT') navigate('/student');
      else if (data.user.role === 'RECRUITER') navigate('/recruiter');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-100 rounded-xl mb-4">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900">Create an Account</h2>
          <p className="text-gray-500 mt-2 font-medium">Join the placement portal today</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              role === 'STUDENT' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <GraduationCap className={`h-8 w-8 mb-2 ${role === 'STUDENT' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className="font-bold">Student</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('RECRUITER')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
              role === 'RECRUITER' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <Briefcase className={`h-8 w-8 mb-2 ${role === 'RECRUITER' ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className="font-bold">Recruiter</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-semibold text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            {role === 'STUDENT' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">College / University</label>
                  <input type="text" name="college" value={formData.college} onChange={handleChange} required placeholder="e.g. Stanford University"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Branch / Course</label>
                  <input type="text" name="branch" value={formData.branch} onChange={handleChange} required placeholder="e.g. B.Tech CSE"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Graduation Year</label>
                  <input type="number" name="graduationYear" value={formData.graduationYear} onChange={handleChange} required placeholder="2025"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
                  <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Your Designation</label>
                  <input type="text" name="designation" value={formData.designation} onChange={handleChange} required placeholder="e.g. HR Manager"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 outline-none transition-all" />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className={`w-full text-white font-bold h-12 rounded-xl text-lg mt-6 ${
            role === 'STUDENT' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'
          }`} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-600 font-medium mt-6">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-bold">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
