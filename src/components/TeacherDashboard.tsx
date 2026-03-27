import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, where, writeBatch, doc } from 'firebase/firestore';
import { Upload, Users, Plus, Trash2, CheckCircle, Clock, Image as ImageIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { uploadFileToStorage, uploadReceiptToSupabase } from '../utils/storage';

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

export default function TeacherDashboard({ role }: { role: 'teacher' | 'parent' }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
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

      const qPayments = query(collection(db, 'payments'), where('uploadedBy', '==', auth.currentUser.uid));
      const unsubPayments = onSnapshot(qPayments, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubCourses();
        unsubRegs();
        unsubPayments();
      };
    }
  }, []);

  const handleAddStudent = () => {
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
      
      // Reset form
      setSelectedCourse(null);
      setStudents([{ ...initialStudentState }]);
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

  const validStudentsCount = students.filter(s => s.firstName.trim() !== '' && s.lastName.trim() !== '').length;
  const totalAmount = selectedCourse ? selectedCourse.fee * validStudentsCount : 0;

  const inputClass = "w-full rounded-lg border-slate-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 p-2.5 border text-sm text-slate-700 transition-colors";
  const selectClass = "w-full rounded-lg border-slate-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 p-2.5 border text-sm text-slate-600 bg-white transition-colors appearance-none";

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 border border-slate-100">
        
        {/* Progress Stepper (Visual only based on image) */}
        <div className="mb-10 border-b border-slate-200 pb-4">
          <div className="flex justify-between items-center max-w-3xl mx-auto relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10"></div>
            <div className="absolute left-[25%] top-1/2 transform -translate-y-1/2 w-[25%] h-0.5 bg-pink-600 -z-10"></div>
            
            <div className="flex flex-col items-center bg-white px-2">
              <span className="text-sm font-bold text-pink-600 mb-1">Register</span>
            </div>
            <div className="flex flex-col items-center bg-white px-2">
              <span className="text-sm font-bold text-pink-600 mb-1 border-b-2 border-pink-600 pb-1">Step 2</span>
            </div>
            <div className="flex flex-col items-center bg-white px-2">
              <span className="text-sm font-bold text-slate-400 mb-1">Step 3</span>
            </div>
            <div className="flex flex-col items-center bg-white px-2">
              <span className="text-sm font-bold text-slate-400 mb-1">Complete</span>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-8">
          Add Students Information
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Step 1: Course Selection (Kept from original but styled better) */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Select a Course First</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {courses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`bg-white border rounded-xl overflow-hidden transition-all cursor-pointer flex flex-col ${
                    selectedCourse?.id === course.id 
                      ? 'border-pink-500 ring-2 ring-pink-200 shadow-md transform scale-[1.02]' 
                      : 'border-slate-200 hover:shadow-md hover:border-slate-300'
                  }`}
                >
                  <div className="h-24 bg-slate-100 relative">
                    {course.imageUrl ? (
                      <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ImageIcon className="h-6 w-6 opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex-grow flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-1 text-sm line-clamp-1">{course.title}</h3>
                    <p className="text-pink-600 font-black text-sm">LKR {course.fee.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedCourse && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-100">
              
              <div className="space-y-6">
                {students.map((student, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-4 relative">
                    <div className="pt-3 font-black text-slate-800 text-lg w-8 shrink-0">
                      {index + 1}).
                    </div>
                    
                    <div className="flex-grow bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
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
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                        <div className="relative">
                          <select value={student.subCategory} onChange={(e) => handleStudentChange(index, 'subCategory', e.target.value)} className={selectClass}>
                            <option value="" disabled>Sub Category</option>
                            <option value="Digital Classical Music">Digital Classical Music</option>
                            <option value="Modern Music">Modern Music</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
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
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-6 border-t border-slate-200 gap-4">
                <button
                  type="button"
                  onClick={handleAddStudent}
                  className="flex items-center text-sm font-bold text-white bg-[#d6008f] hover:bg-[#b30077] px-5 py-2.5 rounded-md transition-colors shadow-sm"
                >
                  + Add more Students
                </button>
                
                <div className="text-right">
                  <span className="text-slate-600 font-medium mr-2">Total Fee</span>
                  <span className="text-xl font-black text-slate-800">{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-8 mt-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Upload Bank Deposit Slip</h3>
                
                <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-slate-300 border-dashed rounded-xl bg-white hover:bg-slate-50 transition-colors">
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
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500 px-2">
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

              <div className="flex justify-between pt-8 border-t border-slate-200 mt-8">
                <button
                  type="button"
                  className="inline-flex justify-center items-center py-2.5 px-8 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-[#6b3a6b] hover:bg-[#522c52] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !slipPreview || validStudentsCount === 0}
                  className="inline-flex justify-center items-center py-2.5 px-8 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-[#6b3a6b] hover:bg-[#522c52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Processing...' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8 border border-slate-100">
        <h2 className="text-xl font-black text-slate-800 mb-6">My Registered Students</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fee</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {registrations.map(reg => (
                <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">{reg.studentName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{reg.courseTitle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">LKR {reg.fee.toLocaleString()}</td>
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
                <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500 bg-slate-50">No students registered yet. Select a course above to start.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
