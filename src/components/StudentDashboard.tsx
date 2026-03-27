import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Upload, CheckCircle, Clock, BookOpen, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadFileToStorage, uploadReceiptToSupabase } from '../utils/storage';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const qCourses = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubCourses = onSnapshot(qCourses, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    if (auth.currentUser) {
      const qRegs = query(collection(db, 'registrations'), where('registeredBy', '==', auth.currentUser.uid));
      const unsubRegs = onSnapshot(qRegs, (snapshot) => {
        setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubCourses();
        unsubRegs();
      };
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setSlipFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSlipPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !slipFile || !auth.currentUser || !profile) return;
    
    setIsSubmitting(true);
    try {
      const path = `payments/${auth.currentUser.uid}_${Date.now()}_${slipFile.name}`;
      
      let slipUrl = '';
      try {
        slipUrl = await uploadReceiptToSupabase(slipFile, path);
      } catch (error) {
        console.error("Supabase upload failed, falling back to Firebase:", error);
        slipUrl = await uploadFileToStorage(slipFile, path);
      }

      const batch = writeBatch(db);
      
      const regRef = doc(collection(db, 'registrations'));
      const paymentRef = doc(collection(db, 'payments'));
      
      batch.set(regRef, {
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        studentName: profile.name,
        studentEmail: profile.email,
        registeredBy: auth.currentUser.uid,
        fee: selectedCourse.fee,
        paymentStatus: 'pending',
        paymentId: paymentRef.id,
        createdAt: new Date().toISOString()
      });

      batch.set(paymentRef, {
        uploadedBy: auth.currentUser.uid,
        amount: selectedCourse.fee,
        slipUrl: slipUrl,
        status: 'pending',
        registrationIds: [regRef.id],
        createdAt: new Date().toISOString()
      });

      await batch.commit();
      
      setSelectedCourse(null);
      setSlipFile(null);
      setSlipPreview(null);
      alert('Registration and payment slip submitted successfully!');
    } catch (error) {
      console.error("Error submitting registration", error);
      alert('Failed to submit registration. Make sure Firebase Storage is enabled.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center">
          <BookOpen className="h-6 w-6 mr-2 text-blue-600" /> Available Courses
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map(course => {
              const isRegistered = registrations.some(r => r.courseId === course.id);
              return (
                <div 
                  key={course.id}
                  onClick={() => !isRegistered && setSelectedCourse(course)}
                  className={`bg-white border rounded-xl overflow-hidden transition-all flex flex-col ${
                    isRegistered ? 'opacity-75 cursor-not-allowed border-slate-200' :
                    selectedCourse?.id === course.id 
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-md transform scale-[1.02] cursor-pointer' 
                      : 'border-slate-200 hover:shadow-md hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="h-32 bg-slate-100 relative">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-8 w-8 opacity-50" />
                      </div>
                    )}
                    {course.offer && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {course.offer}
                      </div>
                    )}
                    {isRegistered && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm flex items-center shadow-sm">
                          <CheckCircle className="h-4 w-4 mr-1" /> Registered
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-grow flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                    <p className="text-blue-600 font-semibold mb-2 text-sm">LKR {course.fee.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCourse && (
            <div className="border-t border-slate-200 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-semibold text-slate-800 mb-6">Payment Details</h3>
              
              <div className="bg-blue-50 p-6 rounded-xl mb-6 border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium text-blue-800 mb-1">Course: <span className="font-bold">{selectedCourse.title}</span></p>
                  <p className="text-sm text-blue-600">Student: {profile?.name}</p>
                </div>
                <div className="text-center sm:text-right bg-white px-6 py-3 rounded-lg shadow-sm w-full sm:w-auto">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Amount to Pay</p>
                  <p className="text-3xl font-black text-blue-700">LKR {selectedCourse.fee.toLocaleString()}</p>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">Upload Bank Deposit Slip</label>
                <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-slate-300 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="space-y-2 text-center">
                    {slipPreview ? (
                      <div className="mb-4 flex flex-col items-center">
                        <img src={slipPreview} alt="Slip preview" className="h-40 object-contain rounded-lg shadow-sm border border-slate-200 mb-3" />
                        <button 
                          type="button" 
                          onClick={() => {setSlipFile(null); setSlipPreview(null);}}
                          className="text-sm font-medium text-red-600 hover:text-red-800 bg-red-50 px-3 py-1 rounded-md"
                        >
                          Remove & Replace
                        </button>
                      </div>
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    )}
                    
                    {!slipPreview && (
                      <>
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-2">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={handleFileChange} required={!slipPreview} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500">PNG, JPG, PDF up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-8">
                <button
                  type="submit"
                  disabled={isSubmitting || !slipPreview}
                  className="w-full sm:w-auto inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-sm text-base font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Processing Upload...' : 'Submit Registration & Payment'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="bg-white shadow rounded-xl p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">My Registrations</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {registrations.map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{reg.courseTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">LKR {reg.fee.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {reg.paymentStatus === 'paid' ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 items-center">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Confirmed
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800 items-center">
                        <Clock className="h-3.5 w-3.5 mr-1.5" /> Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {registrations.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500 bg-slate-50">No courses registered yet. Select a course above to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
