import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { BookOpen, Users, GraduationCap, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const { user, loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student');
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Name is required for signup');
        }
        await signupWithEmail(email, password, name, role);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle(role);
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-slate-50 overflow-hidden">
      {/* Left Side - Branding (Hidden on mobile & tablet, visible on lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 z-10"></div>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-10 pointer-events-none opacity-30">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute top-40 -right-40 w-96 h-96 bg-purple-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-40 left-40 w-96 h-96 bg-indigo-500 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-20 flex flex-col justify-center p-12 h-full text-white w-full">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-xl mx-auto"
          >
            <Link to="/" className="inline-flex items-center space-x-3 mb-12 group">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md border border-white/20 group-hover:bg-white/20 transition-all">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-white">EduPortal<span className="text-blue-400">.</span></span>
            </Link>

            <h1 className="text-5xl font-black mb-6 leading-[1.1] tracking-tight">
              Your journey to <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">brilliance</span> starts here.
            </h1>
            <p className="text-xl text-slate-300 leading-relaxed mb-12 font-medium max-w-md">
              Join thousands of students and educators managing their courses and payments seamlessly in one unified platform.
            </p>

            <div className="flex items-center space-x-4 text-sm font-medium text-slate-400">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden z-${10-i}`}>
                    <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>Join 10,000+ users today</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white relative min-h-screen shadow-[-20px_0_40px_rgba(0,0,0,0.05)] z-20">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <Link to="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">EduPortal</span>
          </div>
        </div>

        {/* Scrollable form container */}
        <div className="flex-grow flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 xl:p-24 overflow-y-auto pt-24 lg:pt-16">
          <div className="w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3 tracking-tight">
                {isLogin ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-slate-500 mb-10 text-base font-medium">
                {isLogin ? 'Enter your details to access your dashboard.' : 'Sign up to start managing your educational journey.'}
              </p>

              {/* Role Selector */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">I am a...</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                      role === 'student' 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10 transform scale-[1.02]' 
                        : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    <GraduationCap className={`h-6 w-6 mb-2 ${role === 'student' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-bold">Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                      role === 'teacher' 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10 transform scale-[1.02]' 
                        : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    <BookOpen className={`h-6 w-6 mb-2 ${role === 'teacher' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-bold">Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('parent')}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${
                      role === 'parent' 
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/10 transform scale-[1.02]' 
                        : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200 hover:text-slate-700'
                    }`}
                  >
                    <Users className={`h-6 w-6 mb-2 ${role === 'parent' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm font-bold">Parent</span>
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <AnimatePresence mode="wait">
                  {!isLogin && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                          type="text"
                          required={!isLogin}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white transition-all text-base sm:text-sm font-medium"
                          placeholder="John Doe"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white transition-all text-base sm:text-sm font-medium"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-bold text-slate-700">Password</label>
                    {isLogin && (
                      <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700">Forgot password?</a>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:bg-white transition-all text-base sm:text-sm font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-base font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none mt-4"
                >
                  {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div className="mt-10">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-slate-400 font-medium tracking-wide">Or continue with</span>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border-2 border-slate-100 rounded-xl shadow-sm bg-white text-base font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200"
                  >
                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </button>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-base text-slate-600 font-medium">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    className="font-black text-blue-600 hover:text-blue-800 transition-colors underline decoration-2 underline-offset-4"
                  >
                    {isLogin ? 'Sign up' : 'Sign in'}
                  </button>
                </p>
              </div>
              
              <div className="mt-8 text-center text-xs font-medium text-slate-400 px-4 bg-slate-50 py-3 rounded-lg border border-slate-100">
                Admin users are automatically detected based on their email address.
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
