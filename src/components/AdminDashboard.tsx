import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Plus, CheckCircle, XCircle, Eye, Image as ImageIcon, Trash2 } from 'lucide-react';
import { uploadFileToStorage } from '../utils/storage';
import { sendPaymentEmail } from '../utils/email';

export default function AdminDashboard() {
  const [courses, setCourses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'courses' | 'payments' | 'students' | 'users' | 'settings'>('courses');
  
  const [newCourse, setNewCourse] = useState({ id: '', title: '', description: '', fee: 0, offer: '' });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  useEffect(() => {
    const qCourses = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const unsubCourses = onSnapshot(qCourses, (snapshot) => {
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching courses", error));

    const qPayments = query(collection(db, 'payments'), orderBy('createdAt', 'desc'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching payments", error));

    const qRegs = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
    const unsubRegs = onSnapshot(qRegs, (snapshot) => {
      setRegistrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching registrations", error));

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Error fetching users", error));

    return () => { unsubCourses(); unsubPayments(); unsubRegs(); unsubUsers(); };
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let imageUrl = '';
      if (courseImage) {
        const path = `courses/${Date.now()}_${courseImage.name}`;
        imageUrl = await uploadFileToStorage(courseImage, path);
      }

      const courseData: any = {
        title: newCourse.title,
        description: newCourse.description,
        fee: Number(newCourse.fee),
      };

      if (imageUrl) courseData.imageUrl = imageUrl;
      if (newCourse.offer) courseData.offer = newCourse.offer;

      if (newCourse.id) {
        // Update existing course
        await updateDoc(doc(db, 'courses', newCourse.id), courseData);
      } else {
        // Create new course
        courseData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'courses'), courseData);
      }
      
      setNewCourse({ id: '', title: '', description: '', fee: 0, offer: '' });
      setCourseImage(null);
      setIsAddingCourse(false);
    } catch (error) {
      console.error("Error saving course", error);
      alert("Failed to save course. Make sure Firebase Storage is enabled in your console.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditCourse = (course: any) => {
    setNewCourse({
      id: course.id,
      title: course.title,
      description: course.description,
      fee: course.fee,
      offer: course.offer || ''
    });
    setCourseImage(null);
    setIsAddingCourse(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
      } catch (error) {
        console.error("Error deleting course", error);
      }
    }
  };

  const handleConfirmPayment = async (paymentId: string, status: 'confirmed' | 'rejected', regIds: string[]) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), { status });
      if (status === 'confirmed') {
        for (const regId of regIds) {
          await updateDoc(doc(db, 'registrations', regId), { paymentStatus: 'paid' });
        }
      }

      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        let courseName = 'Your Course';
        const sentEmails = new Set<string>();

        if (regIds.length > 0) {
          const reg = registrations.find(r => r.id === regIds[0]);
          if (reg) {
            const course = courses.find(c => c.id === reg.courseId);
            if (course) courseName = course.title;
          }
        }

        // Send email to the uploader (parent, teacher, or student)
        if (payment.uploadedBy) {
          const user = users.find(u => u.uid === payment.uploadedBy);
          if (user && user.email) {
            await sendPaymentEmail(user.email, user.name || 'User', status, payment.amount, courseName);
            sentEmails.add(user.email);
          }
        }

        // Send email to the students if they have an email address
        for (const regId of regIds) {
          const reg = registrations.find(r => r.id === regId);
          if (reg && reg.studentDetails && reg.studentDetails.email) {
            const studentEmail = reg.studentDetails.email;
            if (!sentEmails.has(studentEmail)) {
              const studentName = `${reg.studentDetails.firstName} ${reg.studentDetails.lastName}`.trim();
              await sendPaymentEmail(studentEmail, studentName || 'Student', status, payment.amount, courseName);
              sentEmails.add(studentEmail);
            }
          }
        }
      }

      setSelectedPayment(null);
    } catch (error) {
      console.error("Error updating payment", error);
    }
  };

  const handleClearSystem = async () => {
    const confirmText = prompt("WARNING: This will delete ALL courses, payments, and registrations. Type 'CLEAR' to confirm.");
    if (confirmText === 'CLEAR') {
      try {
        // Delete all registrations
        for (const reg of registrations) {
          await deleteDoc(doc(db, 'registrations', reg.id));
        }
        // Delete all payments
        for (const payment of payments) {
          await deleteDoc(doc(db, 'payments', payment.id));
        }
        // Delete all courses
        for (const course of courses) {
          await deleteDoc(doc(db, 'courses', course.id));
        }
        alert("System data cleared successfully.");
      } catch (error) {
        console.error("Error clearing system", error);
        alert("Failed to clear system data.");
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Tabs Navigation */}
      <div className="bg-white shadow rounded-xl p-2 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('courses')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'courses' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Courses</button>
        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'payments' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Payments</button>
        <button onClick={() => setActiveTab('students')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'students' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Students</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Users</button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Settings</button>
      </div>

      {activeTab === 'courses' && (
        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Manage Courses</h2>
            <button
              onClick={() => {
                setNewCourse({ id: '', title: '', description: '', fee: 0, offer: '' });
                setCourseImage(null);
                setIsAddingCourse(!isAddingCourse);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="h-5 w-5 mr-2" /> Add New Course
            </button>
          </div>

          {isAddingCourse && (
            <form onSubmit={handleAddCourse} className="mb-8 p-6 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{newCourse.id ? 'Edit Course' : 'Create Course'}</h3>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course Title</label>
                  <input
                    type="text" required value={newCourse.title}
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    placeholder="e.g. Advanced Mathematics"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fee (LKR)</label>
                  <input
                    type="number" required min="0" value={newCourse.fee}
                    onChange={e => setNewCourse({...newCourse, fee: Number(e.target.value)})}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    placeholder="e.g. 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Special Offer (Optional)</label>
                  <input
                    type="text" value={newCourse.offer}
                    onChange={e => setNewCourse({...newCourse, offer: e.target.value})}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    placeholder="e.g. 20% OFF"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea
                    required value={newCourse.description} rows={3}
                    onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2.5 border"
                    placeholder="Course details..."
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Course Image</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg bg-white hover:bg-slate-50 transition-colors">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                          <span>Upload a file</span>
                          <input type="file" className="sr-only" accept="image/*" onChange={(e) => setCourseImage(e.target.files?.[0] || null)} />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">{courseImage ? courseImage.name : 'PNG, JPG, GIF up to 5MB'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddingCourse(false)} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm disabled:opacity-70 flex items-center">
                  {isUploading ? 'Uploading...' : (newCourse.id ? 'Update Course' : 'Save Course')}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map(course => (
              <div key={course.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="h-48 bg-slate-100 relative">
                  {course.imageUrl ? (
                    <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="h-12 w-12 opacity-50" />
                    </div>
                  )}
                  {course.offer && (
                    <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                      {course.offer}
                    </div>
                  )}
                </div>
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                  <p className="text-blue-600 font-semibold mb-3">LKR {course.fee.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-grow">{course.description}</p>
                  <div className="mt-auto flex space-x-2">
                    <button 
                      onClick={() => handleEditCourse(course)}
                      className="flex-1 flex items-center justify-center py-2 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteCourse(course.id)}
                      className="flex-1 flex items-center justify-center py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {courses.length === 0 && !isAddingCourse && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                No courses available. Click "Add New Course" to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Payment Approvals</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Pending Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {payments.filter(p => p.status === 'pending').map(payment => {
                  const uploader = users.find(u => u.uid === payment.uploadedBy);
                  return (
                    <div key={payment.id} className="border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow bg-slate-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-lg font-bold text-slate-900">LKR {payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-slate-500 mt-1">{payment.registrationIds.length} Registration(s)</p>
                          <p className="text-xs text-slate-400 mt-1">By: {uploader?.name || 'Unknown'} ({uploader?.role || 'user'})</p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">Pending</span>
                      </div>
                      <button 
                        onClick={() => setSelectedPayment(payment)}
                        className="w-full flex items-center justify-center py-2.5 bg-white border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" /> Review Receipt
                      </button>
                    </div>
                  );
                })}
                {payments.filter(p => p.status === 'pending').length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No pending payments.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Approved Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {payments.filter(p => p.status === 'confirmed').map(payment => {
                  const uploader = users.find(u => u.uid === payment.uploadedBy);
                  return (
                    <div key={payment.id} className="border border-green-200 rounded-xl p-5 shadow-sm bg-green-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-lg font-bold text-slate-900">LKR {payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-slate-500 mt-1">{payment.registrationIds.length} Registration(s)</p>
                          <p className="text-xs text-slate-400 mt-1">By: {uploader?.name || 'Unknown'}</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">Approved</span>
                      </div>
                      <button 
                        onClick={() => setSelectedPayment(payment)}
                        className="w-full flex items-center justify-center py-2.5 bg-white border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Receipt
                      </button>
                    </div>
                  );
                })}
                {payments.filter(p => p.status === 'confirmed').length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No approved payments.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">Rejected Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {payments.filter(p => p.status === 'rejected').map(payment => {
                  const uploader = users.find(u => u.uid === payment.uploadedBy);
                  return (
                    <div key={payment.id} className="border border-red-200 rounded-xl p-5 shadow-sm bg-red-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-lg font-bold text-slate-900">LKR {payment.amount.toLocaleString()}</p>
                          <p className="text-sm text-slate-500 mt-1">{payment.registrationIds.length} Registration(s)</p>
                          <p className="text-xs text-slate-400 mt-1">By: {uploader?.name || 'Unknown'}</p>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wide">Rejected</span>
                      </div>
                      <button 
                        onClick={() => setSelectedPayment(payment)}
                        className="w-full flex items-center justify-center py-2.5 bg-white border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" /> View Receipt
                      </button>
                    </div>
                  );
                })}
                {payments.filter(p => p.status === 'rejected').length === 0 && (
                  <div className="col-span-full text-center py-8 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    No rejected payments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Student Registrations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Added By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {registrations.map(reg => {
                  const course = courses.find(c => c.id === reg.courseId);
                  const uploader = users.find(u => u.uid === reg.userId);
                  return (
                    <tr key={reg.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{reg.firstName} {reg.lastName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{course?.title || 'Unknown Course'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{uploader?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 capitalize">{uploader?.role || 'user'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          reg.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {reg.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {registrations.length === 0 && (
              <div className="text-center py-8 text-slate-500">No registrations found.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">System Users</h2>
          
          {['teacher', 'parent', 'student'].map(role => {
            const filteredUsers = users.filter(u => u.role === role);
            const title = role.charAt(0).toUpperCase() + role.slice(1) + 's';
            return (
              <div key={role} className="mb-8">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 border-b pb-2">{title}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{user.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-slate-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-slate-500">No {title.toLowerCase()} found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white shadow rounded-xl p-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">System Settings</h2>
          
          <div className="border border-red-200 bg-red-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-800 mb-2">Danger Zone</h3>
            <p className="text-red-600 mb-4">
              Clearing system data will permanently delete all courses, payments, and student registrations. 
              This action cannot be undone. User accounts will remain intact.
            </p>
            <button 
              onClick={handleClearSystem}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-sm transition-colors flex items-center"
            >
              <Trash2 className="h-5 w-5 mr-2" /> Clear All System Data
            </button>
          </div>
        </div>
      )}

      {/* Payment Review Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setSelectedPayment(null)}>
              <div className="absolute inset-0 bg-slate-900 opacity-75"></div>
            </div>
            <div className="relative z-10 inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-6 pt-6 pb-6">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-bold text-slate-900">Review Payment Receipt</h3>
                  <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600">
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Amount Paid</p>
                    <p className="text-xl font-bold text-slate-900">LKR {selectedPayment.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 font-medium">Registrations</p>
                    <p className="text-lg font-semibold text-slate-800">{selectedPayment.registrationIds.length}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 flex justify-center items-center min-h-[300px] p-2">
                  {selectedPayment.slipUrl.toLowerCase().includes('.pdf') ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-500 mb-4">PDF Document</p>
                      <a href={selectedPayment.slipUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        <Eye className="h-4 w-4 mr-2" /> Open Document
                      </a>
                    </div>
                  ) : (
                    <img src={selectedPayment.slipUrl} alt="Payment Receipt" className="max-h-[60vh] object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
                  )}
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none transition-colors"
                >
                  Cancel
                </button>
                {selectedPayment.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment(selectedPayment.id, 'rejected', selectedPayment.registrationIds)}
                      className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none transition-colors"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment(selectedPayment.id, 'confirmed', selectedPayment.registrationIds)}
                      className="w-full sm:w-auto inline-flex justify-center items-center px-5 py-2.5 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none transition-colors"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve Payment
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
