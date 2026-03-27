import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Upload, Users, Plus, Trash2, CheckCircle, Clock, Image as ImageIcon, ChevronRight, ChevronLeft, BookOpen, Info, Check, Calendar, Tag, Music, GraduationCap } from 'lucide-react';
import { uploadFileToStorage, uploadReceiptToSupabase } from '../utils/storage';
import { useAuth } from '../context/AuthContext';

interface StudentForm {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  dob: string;
  gender: string;
  category: string;
  subCategory: string;
  instrument: string;
  level: string;
}

const initialStudentState: StudentForm = {
  firstName: '', middleName: '', lastName: '', email: '', dob: '', gender: '', category: '', subCategory: '', instrument: '', level: ''
};

export default function UserDashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  
  // Flow State
  const [activeTab, setActiveTab] = useState<'browse' | 'my-registrations'>('browse');
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  
  // Registration State
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [students, setStudents] = useState<StudentForm[]>([{ ...initialStudentState }]);
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

  // Pre-fill student info if role is student and it's the first student
  useEffect(() => {
    if (profile?.role === 'student' && students.length === 1 && students[0].firstName === '') {
      const nameParts = profile.name.split(' ');
      const newStudents = [...students];
      newStudents[0].firstName = nameParts[0] || '';
      newStudents[0].lastName = nameParts.slice(1).join(' ') || '';
      newStudents[0].email = profile.email || '';
      setStudents(newStudents);
    }
  }, [profile, step]);

  const handleCourseClick = (course: any) => {
    setSelectedCourse(course);
    setStep(2); // Go to course details
  };

  const handleAddStudent = () => {
    if (profile?.role === 'student') return;
    if (profile?.role === 'parent' && students.length >= 4) {
      alert('Parents can register a maximum of 4 students at once.');
      return;
    }
    setStudents([...students, { ...initialStudentState }]);
  };

  const handleRemoveStudent = (index: number) => {
    const newStudents = [...students];
    newStudents.splice(index, 1);
    setStudents(newStudents);
  };

  const handleStudentChange = (index: number, field: keyof StudentForm, value: string) => {
    const newStudents = [...students];
    newStudents[index][field] = value;
    setStudents(newStudents);
  };

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
    if (!selectedCourse || students.length === 0 || !slipFile || !auth.currentUser) return;
    
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
      const registrationIds: string[] = [];
      let totalFee = 0;

      // Create registrations
      for (const student of students) {
        if (!student.firstName || !student.lastName) continue;
        
        const regRef = doc(collection(db, 'registrations'));
        registrationIds.push(regRef.id);
        totalFee += selectedCourse.fee;
        
        batch.set(regRef, {
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          studentDetails: student,
          registeredBy: auth.currentUser.uid,
          fee: selectedCourse.fee,
          paymentStatus: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // Create payment
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        uploadedBy: auth.currentUser.uid,
        amount: totalFee,
        slipUrl: slipUrl,
        status: 'pending',
        registrationIds,
        createdAt: new Date().toISOString()
      });

      // Update registrations with paymentId
      for (const regId of registrationIds) {
        batch.update(doc(db, 'registrations', regId), { paymentId: paymentRef.id });
      }

      await batch.commit();
      
      setStep(5); // Success step
    } catch (error) {
      console.error("Error submitting registration", error);
      alert('Failed to submit registration. Make sure Firebase Storage is enabled.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setSelectedCourse(null);
    setStudents([{ ...initialStudentState }]);
    setSlipFile(null);
    setSlipPreview(null);
    setStep(1);
  };

  const validStudentsCount = students.filter(s => s.firstName.trim() !== '' && s.lastName.trim() !== '').length;
  const totalAmount = selectedCourse ? selectedCourse.fee * validStudentsCount : 0;

  const inputClass = "w-full rounded-lg border-slate-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 p-2.5 border text-sm text-slate-700 transition-colors";
  const selectClass = "w-full rounded-lg border-slate-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 p-2.5 border text-sm text-slate-600 bg-white transition-colors appearance-none";

  // Stepper Component
  const Stepper = () => (
    <div className="mb-10 border-b border-slate-200 pb-4">
      <div className="flex justify-between items-center max-w-3xl mx-auto relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10"></div>
        <div className={`absolute left-0 top-1/2 transform -translate-y-1/2 h-0.5 bg-pink-600 -z-10 transition-all duration-500`} style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
        
        {['Courses', 'Details', 'Student Info', 'Payment', 'Complete'].map((label, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isPast = step > stepNum;
          return (
            <div key={label} className="flex flex-col items-center bg-white px-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                isActive ? 'bg-pink-600 text-white ring-4 ring-pink-100' : 
                isPast ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {isPast ? <Check className="w-3 h-3" /> : stepNum}
              </div>
              <span className={`text-xs font-bold ${isActive ? 'text-pink-600' : isPast ? 'text-slate-800' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-full max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => { setActiveTab('browse'); if(step === 5) resetFlow(); }}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'browse' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          Browse Courses
        </button>
        <button
          onClick={() => setActiveTab('my-registrations')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'my-registrations' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          My Registrations
        </button>
      </div>

      {activeTab === 'browse' && (
        <div className="bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-6 sm:p-10 border border-slate-100">
          
          {step > 1 && <Stepper />}

          {/* Step 1: Browse Courses */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Available Courses</h2>
                  <p className="text-slate-500 mt-1">Select a course to view details and enroll.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courses.map(course => (
                  <div 
                    key={course.id}
                    onClick={() => handleCourseClick(course)}
                    className="group bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-200 cursor-pointer flex flex-col"
                  >
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                      {course.imageUrl ? (
                        <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                      )}
                      {course.offer && (
                        <div className="absolute top-3 right-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg transform rotate-3">
                          {course.offer}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span className="text-white font-bold text-sm flex items-center">
                          View Details <ChevronRight className="w-4 h-4 ml-1" />
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-grow flex flex-col">
                      <h3 className="font-black text-slate-900 mb-2 text-lg line-clamp-1 group-hover:text-pink-600 transition-colors">{course.title}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-grow">{course.description}</p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Fee</span>
                        <span className="text-pink-600 font-black text-lg">LKR {course.fee.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Course Details */}
          {step === 2 && selectedCourse && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <button onClick={() => setStep(1)} className="flex items-center text-sm font-bold text-slate-500 hover:text-pink-600 mb-6 transition-colors">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Courses
              </button>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="rounded-3xl overflow-hidden bg-slate-100 shadow-inner border border-slate-200 aspect-video lg:aspect-square relative">
                  {selectedCourse.imageUrl ? (
                    <img src={selectedCourse.imageUrl} alt={selectedCourse.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-16 w-16 opacity-20" />
                    </div>
                  )}
                  {selectedCourse.offer && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-black px-4 py-1.5 rounded-full shadow-lg">
                      {selectedCourse.offer}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col justify-center">
                  <h2 className="text-4xl font-black text-slate-900 mb-4">{selectedCourse.title}</h2>
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">{selectedCourse.description}</p>
                  
                  <div className="bg-pink-50/50 rounded-2xl p-6 border border-pink-100 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-600 font-medium">Course Fee</span>
                      <span className="text-3xl font-black text-pink-600">LKR {selectedCourse.fee.toLocaleString()}</span>
                    </div>
                    <ul className="space-y-3 mt-6 pt-6 border-t border-pink-200/50">
                      <li className="flex items-center text-slate-700">
                        <CheckCircle className="w-5 h-5 text-pink-500 mr-3 shrink-0" />
                        <span>Comprehensive curriculum and materials</span>
                      </li>
                      <li className="flex items-center text-slate-700">
                        <CheckCircle className="w-5 h-5 text-pink-500 mr-3 shrink-0" />
                        <span>Expert instructors and guidance</span>
                      </li>
                      <li className="flex items-center text-slate-700">
                        <CheckCircle className="w-5 h-5 text-pink-500 mr-3 shrink-0" />
                        <span>Certificate upon completion</span>
                      </li>
                    </ul>
                  </div>
                  
                  <button
                    onClick={() => setStep(3)}
                    className="w-full py-4 px-8 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-lg font-black rounded-xl shadow-lg shadow-pink-500/30 transform transition-all hover:-translate-y-1 focus:ring-4 focus:ring-pink-500/50 flex items-center justify-center"
                  >
                    Enroll Now <ChevronRight className="w-5 h-5 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Student Details */}
          {step === 3 && selectedCourse && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Add Students Information</h2>
                  <p className="text-slate-500 mt-1">Enrolling in: <span className="font-bold text-pink-600">{selectedCourse.title}</span></p>
                </div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} className="space-y-8">
                <div className="space-y-6">
                  {students.map((student, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-4 relative">
                      <div className="pt-3 font-black text-slate-800 text-lg w-8 shrink-0">
                        {index + 1}).
                      </div>
                      
                      <div className="flex-grow bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                        {students.length > 1 && (
                          <button
                            type="button" onClick={() => handleRemoveStudent(index)}
                            className="absolute -top-3 -right-3 bg-white text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1.5 shadow-md border border-slate-200 transition-colors z-10"
                            title="Remove Student"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Row 1 */}
                          <input type="text" placeholder="First Name" required value={student.firstName} onChange={(e) => handleStudentChange(index, 'firstName', e.target.value)} className={inputClass} />
                          <input type="text" placeholder="Middle Name" value={student.middleName} onChange={(e) => handleStudentChange(index, 'middleName', e.target.value)} className={inputClass} />
                          <input type="text" placeholder="Last Name" required value={student.lastName} onChange={(e) => handleStudentChange(index, 'lastName', e.target.value)} className={inputClass} />
                          
                          {/* Row 2 */}
                          <input type="email" placeholder="Email Address" value={student.email} onChange={(e) => handleStudentChange(index, 'email', e.target.value)} className={inputClass} />
                          <input type="date" required value={student.dob} onChange={(e) => handleStudentChange(index, 'dob', e.target.value)} className={`${inputClass} text-slate-500`} />
                          <div className="relative">
                            <select value={student.gender} onChange={(e) => handleStudentChange(index, 'gender', e.target.value)} className={selectClass} required>
                              <option value="" disabled>Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </div>
                          </div>

                          {/* Row 3 */}
                          <div className="relative">
                            <select value={student.category} onChange={(e) => handleStudentChange(index, 'category', e.target.value)} className={selectClass}>
                              <option value="" disabled>Course Category</option>
                              <option value="Digital">Digital</option>
                              <option value="Acoustic">Acoustic</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </div>
                          </div>
                          <div className="relative">
                            <select value={student.subCategory} onChange={(e) => handleStudentChange(index, 'subCategory', e.target.value)} className={selectClass}>
                              <option value="" disabled>Sub Category</option>
                              <option value="Digital Classical Music">Digital Classical Music</option>
                              <option value="Modern Music">Modern Music</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </div>
                          </div>
                          <div className="relative">
                            <select value={student.instrument} onChange={(e) => handleStudentChange(index, 'instrument', e.target.value)} className={selectClass}>
                              <option value="" disabled>Instrument</option>
                              <option value="Piano">Piano</option>
                              <option value="Guitar">Guitar</option>
                              <option value="Violin">Violin</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </div>
                          </div>

                          {/* Row 4 */}
                          <div className="relative md:col-span-1">
                            <select value={student.level} onChange={(e) => handleStudentChange(index, 'level', e.target.value)} className={selectClass}>
                              <option value="" disabled>Level/Grade</option>
                              <option value="IC">IC</option>
                              <option value="Grade 1">Grade 1</option>
                              <option value="Grade 2">Grade 2</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                              <ChevronRight className="h-4 w-4 rotate-90" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-slate-200 gap-4">
                  <div className="flex flex-col items-start">
                    {(profile?.role === 'teacher' || profile?.role === 'parent' || profile?.role === 'admin') && (
                      <>
                        <button
                          type="button"
                          onClick={handleAddStudent}
                          disabled={profile?.role === 'parent' && students.length >= 4}
                          className={`flex items-center text-sm font-bold text-white px-5 py-2.5 rounded-lg transition-colors shadow-sm ${
                            profile?.role === 'parent' && students.length >= 4
                              ? 'bg-slate-400 cursor-not-allowed'
                              : 'bg-[#d6008f] hover:bg-[#b30077]'
                          }`}
                        >
                          + Add more Students
                        </button>
                        {profile?.role === 'parent' && students.length >= 4 && (
                          <span className="text-xs text-pink-600 mt-2 font-medium">
                            Maximum 4 students allowed for parents.
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="text-right ml-auto">
                    <span className="text-slate-600 font-medium mr-3">Total Fee</span>
                    <span className="text-2xl font-black text-slate-800">LKR {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex justify-center items-center py-3 px-8 border border-slate-300 shadow-sm text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={validStudentsCount === 0}
                    className="inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-[#6b3a6b] hover:bg-[#522c52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next Step <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Payment Upload */}
          {step === 4 && selectedCourse && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800">Upload Payment Receipt</h2>
                <p className="text-slate-500 mt-2">Please upload the bank deposit slip to confirm registration.</p>
              </div>
              
              <div className="bg-pink-50 rounded-2xl p-6 border border-pink-100 mb-8 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-pink-800 mb-1">Total Amount to Pay</p>
                  <p className="text-sm text-pink-600">For {validStudentsCount} student(s)</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-pink-700">LKR {totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex justify-center px-6 pt-10 pb-12 border-2 border-slate-300 border-dashed rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="space-y-2 text-center">
                    {slipPreview ? (
                      <div className="mb-4 flex flex-col items-center">
                        <img src={slipPreview} alt="Slip preview" className="h-48 object-contain rounded-xl shadow-sm border border-slate-200 mb-4" />
                        <button 
                          type="button" 
                          onClick={() => {setSlipFile(null); setSlipPreview(null);}}
                          className="text-sm font-bold text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-lg transition-colors"
                        >
                          Remove & Replace
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="h-8 w-8 text-pink-500" />
                        </div>
                        <div className="flex text-sm text-slate-600 justify-center">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-bold text-pink-600 hover:text-pink-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500 px-2 py-1">
                            <span>Upload a file</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={handleFileChange} required={!slipPreview} />
                          </label>
                          <p className="pl-1 py-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">PNG, JPG, PDF up to 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-8 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex justify-center items-center py-3 px-8 border border-slate-300 shadow-sm text-sm font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !slipPreview}
                    className="inline-flex justify-center items-center py-3 px-8 border border-transparent shadow-sm text-sm font-bold rounded-xl text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:-translate-y-0.5"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm & Submit'} <CheckCircle className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 5: Success */}
          {step === 5 && (
            <div className="animate-in zoom-in-95 duration-500 max-w-md mx-auto text-center py-12">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Registration Complete!</h2>
              <p className="text-slate-600 mb-8">
                Your registration and payment receipt have been successfully submitted. We will review your payment shortly.
              </p>
              <button
                onClick={() => { setActiveTab('my-registrations'); resetFlow(); }}
                className="w-full py-4 px-8 bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold rounded-xl shadow-lg transition-all"
              >
                View My Registrations
              </button>
            </div>
          )}
        </div>
      )}

      {/* My Registrations Tab */}
      {activeTab === 'my-registrations' && (
        <div className="bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-6 sm:p-10 border border-slate-100 animate-in fade-in duration-500">
          <h2 className="text-2xl font-black text-slate-800 mb-8">My Registrations</h2>
          
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Fee</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {registrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-900">{reg.studentName}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600">{reg.courseTitle}</td>
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-bold text-slate-700">LKR {reg.fee.toLocaleString()}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {reg.paymentStatus === 'paid' ? (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-green-100 text-green-800 items-center">
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Confirmed
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 inline-flex text-xs leading-5 font-bold rounded-full bg-yellow-100 text-yellow-800 items-center">
                          <Clock className="h-3.5 w-3.5 mr-1.5" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {registrations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <BookOpen className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-lg font-medium">No registrations yet</p>
                        <p className="text-sm mt-1">Go to Browse Courses to enroll.</p>
                        <button 
                          onClick={() => setActiveTab('browse')}
                          className="mt-6 px-6 py-2 bg-pink-50 text-pink-600 font-bold rounded-lg hover:bg-pink-100 transition-colors"
                        >
                          Browse Courses
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
