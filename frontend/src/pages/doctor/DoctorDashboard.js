import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { reminderService } from '../../services/reminderService';
// Assuming appointmentService is used in one of the views
// import { appointmentService } from '../../services/appointmentService'; 
import api from '../../services/api';
import {
  Users, UserPlus, LogOut, Activity, MessageSquare, Bell, Calendar,
  LayoutDashboard, Pill, Loader2, UserCog, Settings, Search,
  ChevronLeft, ChevronRight,
  Settings2,
} from 'lucide-react';
import ChatPage from '../common/ChatPage';
import DoctorProfileForm from './DoctorProfileForm'; // This remains unchanged
import SchedulePage from './SchedulePage';

// --- 1. New SidebarItem Component (from PatientDashboard) ---
// This replaces your old 'SidebarLink' component
const SidebarItem = ({ icon, label, active, onClick, collapsed }) => (
  <div
    className={`flex ${collapsed ? 'justify-center' : 'items-center space-x-3'} mx-2 my-1 rounded-full px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition-all ${active ? "text-white bg-blue-600 font-medium shadow-md hover:bg-blue-500" : "text-gray-600"}`}
    onClick={onClick}
  >
    <span className={`${active ? "text-white" : "text-gray-500"} flex-shrink-0`}>{icon}</span>
    {!collapsed && <span className="text-sm whitespace-nowrap font-medium">{label}</span>}
  </div>
);


// --- 2. Refactored Sidebar Component ---
// Now collapsible and styled to match PatientDashboard
const Sidebar = ({
  activeView,
  setActiveView,
  handleLogout,
  doctorProfile,
  profileLoading,
  isCollapsed,
  setIsCollapsed // Receives setter to pass to the toggle button
}) => (
  <aside className={`fixed top-0 left-0 h-screen bg-white shadow-lg flex flex-col justify-between overflow-hidden z-10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
    <div className="p-0 flex flex-col h-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-4 flex items-center justify-center border-b border-gray-200 h-[65px]" // Matched height
      >
        {isCollapsed ? (
          <ChevronRight size={18} className="text-gray-600 cursor-pointer" />
        ) : (
          <ChevronLeft size={18} className="text-gray-600 cursor-pointer" />
        )}
      </button>

      {/* Logo */}
      <div className={`p-6 flex items-center space-x-2 transition-opacity ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="bg-[#2B91D4] h-8 w-8 rounded-lg flex-shrink-0"></div>
        {!isCollapsed && <span className="text-xl font-bold">Young Tempo</span>}
      </div>

      {/* Profile */}
      <div className={`px-6 pt-6 pb-2 flex items-center space-x-3 transition-all ${isCollapsed ? 'space-x-0 justify-center' : ''}`}>
        <img
          src="https://via.placeholder.com/150" // Placeholder
          alt="Profile"
          className="w-10 h-10 bg-black rounded-full flex-shrink-0"
        />
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1 className="text-base font-semibold text-[#2B91D4] truncate">
              {profileLoading ? 'Loading...' : (doctorProfile.name || 'Dr. Stranger')}
            </h1>
            <p className="text-xs text-gray-500 truncate">
              {profileLoading ? '...' : (doctorProfile.degree || 'Doctor')}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="mt-4 flex-1 overflow-y-auto px-2">
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          active={activeView === 'dashboard'}
          onClick={() => setActiveView('dashboard')}
          collapsed={isCollapsed}
        />
        <SidebarItem
          icon={<Calendar size={18} />}
          label="Schedule"
          active={activeView === 'schedule'}
          onClick={() => setActiveView('schedule')}
          collapsed={isCollapsed}
        />
        <SidebarItem
          icon={<Activity size={18} />}
          label="Patients"
          active={activeView === 'patients'}
          onClick={() => setActiveView('patients')}
          collapsed={isCollapsed}
        />
        <SidebarItem
          icon={<Users size={18} />}
          label="Caretakers"
          active={activeView === 'caretakers'}
          onClick={() => setActiveView('caretakers')}
          collapsed={isCollapsed}
        />
        <SidebarItem
          icon={<MessageSquare size={18} />}
          label="Messages"
          active={activeView === 'messages'}
          onClick={() => setActiveView('messages')}
          collapsed={isCollapsed}
        />
        <SidebarItem
          icon={<Pill size={18} />}
          label="Medicines"
          active={activeView === 'medicines'}
          onClick={() => setActiveView('medicines')}
          collapsed={isCollapsed}
        />
        {/* <SidebarItem
          icon={<UserCog size={18} />}
          label="Edit Profile"
          active={activeView === 'profile'}
          onClick={() => setActiveView('profile')}
          collapsed={isCollapsed}
        /> */}
      </nav>
    </div>

    {/* Bottom Section */}
    <div className="border-t py-4 pt-5 space-y-2 px-2">
      <SidebarItem
        icon={<Settings size={18} />}
        label="Settings"
        active={activeView === 'Settings'}
        onClick={() => { /* Implement settings view if needed */ }}
        collapsed={isCollapsed}
      />
      <SidebarItem
        icon={<LogOut size={18} />}
        label="Logout"
        active={false}
        onClick={handleLogout} // Changed from Help Center to Logout
        collapsed={isCollapsed}
      />
    </div>
  </aside>
);

// --- 3. New TopBar Component ---
// To be displayed above the main content
const TopBar = ({ activeView }) => (
  <div className="flex justify-end pb-8 pt-4">
    <div className="flex items-center space-x-3">
      {activeView == 'dashboard' && (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />

            <input
              type="text"
              placeholder="Global search"
              aria-label="Global search"
              className="bg-white text-gray-800 pl-9 pr-5 py-2.5 rounded-full border border-gray-300 text-sm 
                   focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
            />
          </div>

          <button
            className="p-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition"
            aria-label="Notifications"
          >
            <Bell className="text-gray-500" size={18} />
          </button>
        </div>
      )}

    </div>
  </div>
);


// --- 4. MainDashboardView (Slightly modified) ---
// Header styling updated
const MainDashboardView = ({
  fetchProfileDetails,
  showEditFile, setShowEditFile,
  patients,
  caretakers,
  loadUsers,
  user,
  doctorProfile, // Pass this for the welcome message
  onProfileUpdate
}) => {
  const [showCreateForm, setShowCreateForm] = useState(true); // Default to false
  // const [editProfile, setEditProfile] = useState(false); // Default to false
  // const [showEditFile, setShowEditFile] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', phone: '', type: 'patient' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
      <div className={`p-3 rounded-full ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Hello, {doctorProfile.name || "Doctor"}!</h1>
          <p className="text-gray-500">How are you feeling today?</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* "Edit Profile" is now in the sidebar */}
          <button
            onClick={() => setShowEditFile(!showEditFile)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-500 text-white rounded-full font-medium hover:bg-slate-700 transition shadow-sm"
          >
            <UserCog className="w-5 h-5" />
            {showEditFile ? 'Cancel' : 'Edit Profile'}
          </button>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            {showCreateForm ? 'Cancel' : 'Create User'}
          </button>
        </div>

      </div>

      {/* Stat Cards (Styling updated slightly) */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          title="Patients"
          value={patients.length}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Caretakers"
          value={caretakers.length}
          icon={Users}
          color="bg-green-500"
        />
        <StatCard
          title="Appointments"
          value="2" // Placeholder
          icon={Calendar}
          color="bg-blue-500"
        />
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="p-3 border border-gray-300 rounded-lg w-full" required />
              <input type="tel" placeholder="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="p-3 border border-gray-300 rounded-lg w-full" required />
              <input type="password" placeholder="Password" minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="p-3 border border-gray-300 rounded-lg w-full" required />
              <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="p-3 border border-gray-300 rounded-lg w-full bg-white">
                <option value="patient">Patient</option>
                <option value="caretaker">Caretaker</option>
              </select>
            </div>
            {error && <div className="text-red-600">{error}</div>}
            <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}


      <div className=' mt-3'></div>
          {showEditFile && (
            <DoctorProfileForm
              // We pass the already-fetched data to the form
              initialData={doctorProfile}
              // We pass the refetch function so the sidebar updates on save
              onProfileUpdate={fetchProfileDetails}
            />
          )}
<div className=' mt-3'></div>

      {/* Note: The DoctorProfileForm is now rendered from the main layout based on activeView === 'profile' */}
    </div>
  );
};

// --- 5. Other Views (PatientView, CaretakerView, etc.) ---
// These components remain unchanged internally, but they will now render
// inside the new, styled layout.

const PatientView = ({ patients, caretakers }) => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">Manage Patients</h1>
    <AssignPatientForm patients={patients} caretakers={caretakers} />
    <PatientList patients={patients} />
    <QuickReminders patients={patients} />
  </div>
);

const CaretakerView = ({ patients, caretakers }) => (
  <div className="space-y-6">
    <h1 className="text-3xl font-bold text-gray-800">Manage Caretakers</h1>
    <AssignPatientForm patients={patients} caretakers={caretakers} />
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Users className="w-6 h-6 text-purple-600" /> My Caretakers ({caretakers.length})
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {caretakers.map(caretaker => (
          <div key={caretaker._id} className="bg-gray-50 p-5 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-2 truncate">{caretaker.email}</h3>
            <p className="text-gray-600 text-sm"><strong>Phone:</strong> {caretaker.phone}</p>
            {/* <p className="text-gray-600 text-sm"><strong>Total Score:</strong> {caretaker.totalScore || 0}</p> */}
          </div>
        ))}
        {caretakers.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No caretakers created yet.</div>}
      </div>
    </div>
  </div>
);

// const SchedulePage = () => {
//   const [loading, setLoading] = useState(true);
//   useEffect(() => {
//     const timer = setTimeout(() => setLoading(false), 500);
//     return () => clearTimeout(timer);
//   }, []);

//   return (
//     <div className="flex flex-col h-full bg-white rounded-lg shadow p-6">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">My Schedule</h1>
//       {loading ? (
//         <div className="flex justify-center items-center h-48">
//           <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
//         </div>
//       ) : (
//         <div>Your schedule content, tables, and booking logic would go here.</div>
//       )}
//     </div>
//   );
// };

const PlaceholderView = ({ title }) => (
  <div>
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    <p className="mt-4 text-gray-600">This page is a placeholder. Content for {title} goes here.</p>
  </div>
);
const MedicinesView = () => <PlaceholderView title="Medicines" />;


// --- (Helper components, unchanged) ---

const AssignPatientForm = ({ patients, caretakers }) => {
  const [assignCaretakerId, setAssignCaretakerId] = useState('');
  const [assignPatientId, setAssignPatientId] = useState('');

  const assignPatient = async () => {
    if (!assignCaretakerId || !assignPatientId) return alert('Select caretaker and patient');
    await userService.assignPatient({ caretakerId: assignCaretakerId, patientId: assignPatientId });
    alert('Assigned');
    setAssignCaretakerId('');
    setAssignPatientId('');
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Assign Patient to Caretaker</h2>
      <div className="grid md:grid-cols-3 gap-3">
        <select className="p-3 border rounded-lg bg-white" value={assignCaretakerId} onChange={e => setAssignCaretakerId(e.target.value)}>
          <option value="">Select Caretaker</option>
          {caretakers.map(c => <option key={c._id} value={c._id}>{c.email}</option>)}
        </select>
        <select className="p-3 border rounded-lg bg-white" value={assignPatientId} onChange={e => setAssignPatientId(e.target.value)}>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
        </select>
        <button onClick={assignPatient} className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition">Assign</button>
      </div>
    </div>
  );
};

const PatientList = ({ patients }) => {
  const navigate = useNavigate();
  const viewPatientAnalytics = (patientId) => {
    navigate(`/doctor/patient/${patientId}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Activity className="w-6 h-6 text-blue-600" /> My Patients ({patients.length})
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patients.map(patient => (
          <div key={patient._id} className="bg-gray-50 p-5 rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer" onClick={() => viewPatientAnalytics(patient._id)}>
            <h3 className="font-semibold text-gray-800 mb-2 truncate">{patient.email}</h3>
            <p className="text-gray-600 text-sm"><strong>Phone:</strong> {patient.phone}</p>
            <p className="text-gray-600 text-sm"><strong>Total Score:</strong> {patient.totalScore || 0}</p>
            <p className="text-gray-600 text-sm"><strong>Sessions:</strong> {patient.gameSessions?.length || 0}</p>
            <button className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition flex justify-center items-center gap-2">
              <Activity className="w-4 h-4" /> View Analytics
            </button>
          </div>
        ))}
        {patients.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No patients created yet.</div>}
      </div>
    </div>
  );
};

const QuickReminders = ({ patients }) => {
  const [selectedReminderPatient, setSelectedReminderPatient] = useState('');
  const [reminders, setReminders] = useState([]);
  const [reminderForm, setReminderForm] = useState({ title: '', text: '', date: '', time: '', isRecurring: false });

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

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-800">
        <Bell className="w-6 h-6 text-yellow-500" /> Quick Reminders
      </h2>
      <div className="grid md:grid-cols-4 gap-3 items-end mb-4">
        <select className="p-3 border rounded-lg bg-white" value={selectedReminderPatient} onChange={e => { setSelectedReminderPatient(e.target.value); refreshReminders(e.target.value); }}>
          <option value="">Select Patient</option>
          {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
        </select>
        <input className="p-3 border rounded-lg" placeholder="Title" value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} />
        <input type="date" className="p-3 border rounded-lg" value={reminderForm.date} onChange={e => setReminderForm({ ...reminderForm, date: e.target.value })} />
        <div className="flex gap-2">
          <input type="time" className="p-3 border rounded-lg" value={reminderForm.time} onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reminderForm.isRecurring} onChange={e => setReminderForm({ ...reminderForm, isRecurring: e.target.checked })} /> Daily
          </label>
        </div>
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-gray-500 text-sm">{reminders.length} reminders</span>
        <button onClick={createReminder} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">Add</button>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {reminders.map(r => (
          <div key={r._id} className="border rounded-lg p-3 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium text-gray-800">{r.title}</div>
              <div className="text-gray-500">{r.text}</div>
            </div>
            <div className="text-gray-400">{new Date(r.date).toLocaleDateString()} {r.time}</div>
          </div>
        ))}
        {reminders.length === 0 && <div className="text-gray-400 text-sm text-center py-4">No reminders selected</div>}
      </div>
    </div>
  );
};


// --- 6. Main DoctorDashboard Component (The Layout) ---
// This is the main export, now with the new layout
const DoctorDashboard = () => {
  const { user, logout } = useAuth();

  const navigate = useNavigate();
  const [showEditFile, setShowEditFile] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false); // Sidebar collapse state

  // State for patients/caretakers
  const [patients, setPatients] = useState([]);
  const [caretakers, setCaretakers] = useState([]);

  // State for doctor profile (for sidebar)
  const [doctorProfile, setDoctorProfile] = useState({
    name: '', degree: '', phone: '', email: ''
  });
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    fetchProfileDetails();
  }, []);

  async function fetchProfileDetails() {
    setProfileLoading(true);
    try {
      const res = await api.get('/users/get-user-details');
      if (res.data.success) {
        setDoctorProfile({
          degree: res.data.doctor.degree || '',
          name: res.data.doctor.name || '',
          phone: res.data.doctor.phone || '',
          email: res.data.doctor.email || '',
        });
      } else {
        console.error('Failed to load doctor details.');
      }
    } catch (err) {
      console.error('Failed to load doctor details:', err);
    } finally {
      setProfileLoading(false);
    }
  }

  const loadUsers = async () => {
    try {
      const response = await userService.getMyPatients();
      setPatients(response.patients || []);
      setCaretakers(response.caretakers || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-[#EBECF5] text-gray-800">
      {/* Sidebar (Fixed, Collapsible) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        handleLogout={handleLogout}
        doctorProfile={doctorProfile}
        profileLoading={profileLoading}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content Area (Scrollable, with offset) */}
      <div className={`h-screen overflow-y-auto px-6 flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <main className="flex-1">
          {/* Top Bar with Search/Notifications */}
          <TopBar activeView={activeView} />

          {/* Conditional Content */}
          {activeView === 'dashboard' && (
            <MainDashboardView
            // doctorProfile={doctorProfile} 
            fetchProfileDetails={fetchProfileDetails}
              showEditFile={showEditFile}
              setShowEditFile={setShowEditFile}
              patients={patients}
              caretakers={caretakers}
              loadUsers={loadUsers}
              user={user}
              doctorProfile={doctorProfile}
              onProfileUpdate={fetchProfileDetails}
            />
          )}

          {activeView === 'patients' && (
            <PatientView
              patients={patients}
              caretakers={caretakers}
            />
          )}

          {activeView === 'caretakers' && (
            <CaretakerView
              patients={patients}
              caretakers={caretakers}
            />
          )}

          {activeView === 'schedule' && <SchedulePage />}
          {activeView === 'messages' && <ChatPage />}
          {activeView === 'medicines' && <MedicinesView />}

{/* <div className=' mt-3'></div>
          {showEditFile && (
            <DoctorProfileForm
              // We pass the already-fetched data to the form
              initialData={doctorProfile}
              // We pass the refetch function so the sidebar updates on save
              onProfileUpdate={fetchProfileDetails}
            />
          )}
<div className=' mt-3'></div> */}

        </main>
      </div>
    </div>
  );
};

export default DoctorDashboard;