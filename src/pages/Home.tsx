import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, GraduationCap, ArrowRight, CheckCircle2, ShieldCheck, PlayCircle, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">EduPortal<span className="text-blue-600">.</span></span>
            </div>
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Link 
                to="/login" 
                className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/login" 
                className="text-sm font-bold bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute top-40 -right-20 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center space-x-2 bg-white/60 backdrop-blur-sm border border-slate-200/60 px-4 py-1.5 rounded-full text-sm font-bold text-slate-700 mb-8 shadow-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>The modern way to manage education</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter text-slate-900 mb-8 max-w-5xl leading-[1.1]"
            >
              Simplify Course <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Registrations</span> & Payments
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-600 mb-12 max-w-2xl font-medium leading-relaxed"
            >
              A unified platform for students, teachers, and parents to seamlessly discover courses, register, and manage payments with simple bank slip uploads.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row w-full sm:w-auto space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Link 
                to="/login" 
                className="inline-flex justify-center items-center px-8 py-4 text-base font-bold rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
              >
                Start Learning Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                to="/login" 
                className="inline-flex justify-center items-center px-8 py-4 text-base font-bold rounded-full text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 w-full sm:w-auto group"
              >
                <PlayCircle className="mr-2 h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                Teacher Portal
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-16 flex items-center justify-center space-x-4 text-sm font-medium text-slate-500"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden z-${10-i}`}>
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex text-yellow-400">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <span>Trusted by 10,000+ students</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Everything you need to succeed</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">Our platform is designed to make the educational journey smooth for all stakeholders.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <motion.div 
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-slate-50 p-10 rounded-3xl border border-slate-100 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-600">
                <GraduationCap className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">For Students</h3>
              <p className="text-slate-600 leading-relaxed font-medium">Browse available courses, register instantly, and upload your payment slips directly from your personalized dashboard.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-slate-50 p-10 rounded-3xl border border-slate-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group"
            >
              <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 group-hover:bg-indigo-600">
                <Users className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">For Teachers & Parents</h3>
              <p className="text-slate-600 leading-relaxed font-medium">Register multiple students at once, calculate total fees automatically, and upload a single bulk payment slip with ease.</p>
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-slate-50 p-10 rounded-3xl border border-slate-100 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group"
            >
              <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 group-hover:bg-emerald-600">
                <ShieldCheck className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">For Administrators</h3>
              <p className="text-slate-600 leading-relaxed font-medium">Manage courses, review uploaded bank slips, and confirm registrations with a powerful, easy-to-use secure dashboard.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">How it works</h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">A simple, streamlined process for course registration.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 text-center relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-slate-800 via-blue-500 to-slate-800 z-0"></div>
            
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto bg-slate-900 rounded-full flex items-center justify-center text-3xl font-black text-blue-400 mb-8 border-4 border-slate-800 shadow-[0_0_30px_rgba(59,130,246,0.2)]">1</div>
              <h3 className="text-2xl font-bold mb-4">Select Course</h3>
              <p className="text-slate-400 font-medium leading-relaxed">Choose from our wide range of available courses tailored for your specific educational needs.</p>
            </div>
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto bg-slate-900 rounded-full flex items-center justify-center text-3xl font-black text-blue-400 mb-8 border-4 border-slate-800 shadow-[0_0_30px_rgba(59,130,246,0.2)]">2</div>
              <h3 className="text-2xl font-bold mb-4">Make Payment</h3>
              <p className="text-slate-400 font-medium leading-relaxed">Deposit the course fee to the designated bank account and keep your deposit slip ready.</p>
            </div>
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto bg-slate-900 rounded-full flex items-center justify-center text-3xl font-black text-blue-400 mb-8 border-4 border-slate-800 shadow-[0_0_30px_rgba(59,130,246,0.2)]">3</div>
              <h3 className="text-2xl font-bold mb-4">Upload Slip</h3>
              <p className="text-slate-400 font-medium leading-relaxed">Upload the slip in your dashboard. Once confirmed by our admin team, you're officially in!</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-blue-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">Ready to start your learning journey?</h2>
          <p className="text-xl text-blue-100 mb-10 font-medium">Join thousands of students already learning on our platform.</p>
          <Link 
            to="/login" 
            className="inline-flex justify-center items-center px-10 py-5 text-lg font-black rounded-full text-blue-600 bg-white hover:bg-slate-50 shadow-2xl hover:shadow-white/20 transition-all duration-300 transform hover:-translate-y-1"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-600 p-2 rounded-xl">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight text-slate-900">EduPortal<span className="text-blue-600">.</span></span>
              </div>
              <p className="text-slate-500 max-w-sm font-medium leading-relaxed">
                Empowering education through seamless digital management. Making course registration and payments effortless for everyone.
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-wider text-sm">Platform</h4>
              <ul className="space-y-4">
                <li><Link to="/login" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Student Portal</Link></li>
                <li><Link to="/login" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Teacher Portal</Link></li>
                <li><Link to="/login" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Parent Portal</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-slate-900 mb-6 uppercase tracking-wider text-sm">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-slate-500 font-medium hover:text-blue-600 transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 font-medium text-sm">© 2026 EduPortal. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              {/* Social icons could go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
