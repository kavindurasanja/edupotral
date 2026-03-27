import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/AdminDashboard';
import UserDashboard from '../components/UserDashboard';
import { LogOut, User } from 'lucide-react';

export default function Dashboard() {
  const { profile, logout } = useAuth();

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-600 to-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <span className="text-white font-black text-xl leading-none">E</span>
                </div>
                <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 hidden sm:block">
                  EduPortal
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-slate-100 rounded-full py-1.5 px-3 border border-slate-200">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-2 shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="font-bold text-sm text-slate-700 mr-2 hidden sm:block">{profile.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  profile.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                  profile.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
                  profile.role === 'parent' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {profile.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center p-2 border border-transparent text-sm font-bold rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 focus:outline-none transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline-block ml-1">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {profile.role === 'admin' ? (
          <AdminDashboard />
        ) : (
          <UserDashboard />
        )}
      </main>
    </div>
  );
}
