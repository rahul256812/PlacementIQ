import { Link, useNavigate } from 'react-router-dom';
import { Building2, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg text-gray-900 leading-none">STEPS Placement</span>
            <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase leading-none mt-0.5">Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {user.role === 'STUDENT' && (
                <Link to="/student" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Jobs</Link>
              )}
              {user.role === 'RECRUITER' && (
                <Link to="/recruiter" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Dashboard</Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="text-sm font-semibold text-gray-600 hover:text-blue-600">Admin</Link>
              )}
              
              <div className="h-4 w-px bg-gray-200 mx-2"></div>
              
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                  <p className="text-[10px] text-gray-500 uppercase">{user.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500 hover:text-red-600">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" className="font-semibold">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
