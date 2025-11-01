import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { reminderService } from '../../services/reminderService';
import { Users, UserPlus, LogOut, Activity, MessageSquare, Bell, Calendar } from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [caretakers, setCaretakers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', phone: '', type: 'patient' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Assignment state
  const [assignCaretakerId, setAssignCaretakerId] = useState('');
  const [assignPatientId, setAssignPatientId] = useState('');

  // Reminders mini panel state
  const [selectedReminderPatient, setSelectedReminderPatient] = useState('');
  const [reminders, setReminders] = useState([]);
  const [reminderForm, setReminderForm] = useState({ title: '', text: '', date: '', time: '', isRecurring: false });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userService.getMyPatients();
      setPatients(response.patients || []);
      setCaretakers(response.caretakers || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await userService.createUser(formData);
      alert('User created successfully!');
      setShowCreateForm(false);
      setFormData({ email: '', password: '', phone: '', type: 'patient' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const viewPatientAnalytics = (patientId) => {
    navigate(`/doctor/patient/${patientId}`);
  };

  const refreshReminders = async (pid) => {
    if (!pid) { setReminders([]); return; }
    try {
      const res = await reminderService.listForPatient(pid);
      setReminders(res.reminders || []);
    } catch (e) { console.error(e); }
  };

  const createReminder = async () => {
    if (!selectedReminderPatient) return alert('Select a patient');
    await reminderService.create({ patientId: selectedReminderPatient, ...reminderForm });
    setReminderForm({ title: '', text: '', date: '', time: '', isRecurring: false });
    refreshReminders(selectedReminderPatient);
  };

  const assignPatient = async () => {
    if (!assignCaretakerId || !assignPatientId) return alert('Select caretaker and patient');
    await userService.assignPatient({ caretakerId: assignCaretakerId, patientId: assignPatientId });
    alert('Assigned');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link to="/doctor/create-patient">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition shadow-lg">
              Create New Patient
            </button>
          </Link>
          <Link to="/doctor/profile">
  <button className="btn">Edit Profile</button>
</Link>


        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Doctor Dashboard</h1>
              <p className="text-primary-100 flex items-center gap-2">
                <Users className="w-5 h-5" />
                {user?.email}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                {showCreateForm ? 'Cancel' : 'Create User'}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition shadow-lg"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <button onClick={()=>navigate('/doctor/manage-caretakers')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Users className="w-5 h-5"/>Assign Caretaker</button>
          <button onClick={()=>navigate('/chat')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><MessageSquare className="w-5 h-5"/>Open Chat</button>
          <button onClick={()=>navigate('/reminders')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Bell className="w-5 h-5"/>Reminders</button>
          <button onClick={()=>navigate('/doctor/availability')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Calendar className="w-5 h-5"/>Availability</button>
          <button onClick={()=>navigate('/doctor/schedule')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Calendar className="w-5 h-5"/>Schedule</button>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} minLength="6" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                  <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
                    <option value="patient">Patient</option>
                    <option value="caretaker">Caretaker</option>
                  </select>
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
              <button type="submit" disabled={loading} className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition shadow-lg disabled:opacity-50">
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        )}

        {/* Inline Assign Patient to Caretaker */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Assign Patient to Caretaker</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <select className="border p-2 rounded" value={assignCaretakerId} onChange={e=>setAssignCaretakerId(e.target.value)}>
              <option value="">Select Caretaker</option>
              {caretakers.map(c => <option key={c._id} value={c._id}>{c.email}</option>)}
            </select>
            <select className="border p-2 rounded" value={assignPatientId} onChange={e=>setAssignPatientId(e.target.value)}>
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
            </select>
            <button onClick={assignPatient} className="bg-blue-600 text-white px-4 py-2 rounded">Assign</button>
          </div>
        </div>

        {/* Patients Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-600" />
            My Patients ({patients.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.map((patient) => (
              <div key={patient._id} className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg border-2 border-primary-200 hover:border-primary-400 transition cursor-pointer" onClick={() => viewPatientAnalytics(patient._id)}>
                <h3 className="font-semibold text-gray-800 mb-3 truncate text-lg">{patient.email}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><span className="font-semibold">Phone:</span> {patient.phone}</p>
                  <p className="text-gray-700"><span className="font-semibold">Total Score:</span> {patient.totalScore || 0}</p>
                  <p className="text-gray-700"><span className="font-semibold">Sessions:</span> {patient.gameSessions?.length || 0}</p>
                </div>
                <button className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium flex items-center justify-center gap-2">
                  <Activity className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            ))}
            {patients.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No patients created yet.
              </div>
            )}
          </div>
        </div>

        {/* Mini Reminders Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-yellow-600" /> Reminders (Quick)
          </h2>
          <div className="grid md:grid-cols-4 gap-3 items-end mb-4">
            <select className="border p-2 rounded md:col-span-1" value={selectedReminderPatient} onChange={e=>{ setSelectedReminderPatient(e.target.value); refreshReminders(e.target.value); }}>
              <option value="">Select Patient</option>
              {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
            </select>
            <input className="border p-2 rounded" placeholder="Title" value={reminderForm.title} onChange={e=>setReminderForm({...reminderForm, title:e.target.value})} />
            <input type="date" className="border p-2 rounded" value={reminderForm.date} onChange={e=>setReminderForm({...reminderForm, date:e.target.value})} />
            <div className="flex gap-2">
              <input type="time" className="border p-2 rounded" value={reminderForm.time} onChange={e=>setReminderForm({...reminderForm, time:e.target.value})} />
              <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={reminderForm.isRecurring} onChange={e=>setReminderForm({...reminderForm, isRecurring:e.target.checked})} />Daily</label>
            </div>
          </div>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-gray-500">{reminders.length} reminders</div>
            <button onClick={createReminder} className="bg-green-600 text-white px-4 py-2 rounded">Add</button>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {reminders.map(r => (
              <div key={r._id} className="border rounded p-2 text-sm flex justify-between">
                <div>
                  <div className="font-medium">{r.title}</div>
                  <div className="text-gray-600">{r.text}</div>
                </div>
                <div className="text-gray-500">{new Date(r.date).toLocaleDateString()} {r.time}</div>
              </div>
            ))}
            {reminders.length===0 && <div className="text-gray-400 text-sm">No reminders selected</div>}
          </div>
        </div>

        {/* Caretakers Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-secondary-600" />
            My Caretakers ({caretakers.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {caretakers.map((caretaker) => (
              <div key={caretaker._id} className="bg-gradient-to-br from-secondary-50 to-secondary-100 p-6 rounded-lg border-2 border-secondary-200">
                <h3 className="font-semibold text-gray-800 mb-3 truncate text-lg">{caretaker.email}</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><span className="font-semibold">Phone:</span> {caretaker.phone}</p>
                  <p className="text-gray-700"><span className="font-semibold">Total Score:</span> {caretaker.totalScore || 0}</p>
                </div>
              </div>
            ))}
            {caretakers.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                No caretakers created yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
