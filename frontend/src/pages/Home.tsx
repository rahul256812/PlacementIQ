import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="inline-flex p-4 bg-blue-100 rounded-2xl mb-4">
            <Building2 className="h-12 w-12 text-blue-600" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight">
            Campus Placements, <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Streamlined.
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
            The official portal for students and recruiters to connect, apply, and hire top talent.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" onClick={() => navigate('/signup')} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-14 px-8 text-lg shadow-lg shadow-blue-600/20">
              Join as a Student
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/signup')} className="w-full sm:w-auto font-bold rounded-xl h-14 px-8 text-lg border-2">
              Post a Job (Recruiter)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
