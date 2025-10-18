import {
  Bell,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Settings,
  User,
  Phone,
  Mail,
  Edit3,
  Search,
  PhoneCall,
  MessageSquareDashed,
  ChevronDown,
} from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { userService } from '../../services/userService';

export default function PatientDashboard({ userId }) {
  const { user, logout } = useAuth();
  // console.log(user);

  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  // Modal & Selected Doctor state
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await userService.getUserFullDetails(userId);
        if (data.success) setUserData(data.user);
        else setError('Failed to load user info');
      } catch {
        setError('Error fetching data');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await gameService.getBasicStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handle doctor selection from modal
  const handleDoctorSelect = (doctor) => {
    setUserData((prev) => ({
      ...prev,
      doctor: [doctor],
    }));
    setIsDoctorModalOpen(false);

    // Optional: Add API call here to save selected doctor on backend
    // e.g. await userService.updateDoctor(userId, doctor.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#EBECF5] text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 rounded-e-[40px] bg-white shadow-lg flex flex-col justify-between">
        <div className="p-0">
          <div className="p-6 flex items-center space-x-2">
            <div className="bg-[#2B91D4] h-8 w-8 rounded-lg"></div>
            <span className="text-xl font-bold">App Name</span>
          </div>

          <div className="px-6 pt-6 pb-2 flex items-center space-x-3">
            <img
              src="https://via.placeholder.com/40"
              alt="Profile"
              className="w-10 h-10 bg-black rounded-full"
            />
            <div>
              <h1 className="text-lg font-semibold text-[#2B91D4]">{userData?.name || "Your Name"}</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <nav className="mt-4 rounded-xl">
            <SidebarItem icon={<Home size={18} />} label="Dashboard" active />
            <SidebarItem icon={<Calendar size={18} />} label="Appointment" />
            <SidebarItem icon={<FileText size={18} />} label="Record" />
            <SidebarItem icon={<MessageSquare size={18} />} label="Chat" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Calendar" />
          </nav>
        </div>

        <div className="border-t py-4 pt-5 space-y-2">
          <Link to="/patient/setting">
            <SidebarItem icon={<Settings size={18} />} label="Settings" />
          </Link>

          <SidebarItem icon={<LogOut size={18} />} label="Help center" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 pt-4">
        {/* Top Bar */}
        <div className="flex justify-end pb-10">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Global search"
                className="bg-[#EBECF5] text-black pl-9 pr-5 py-2 rounded-full border border-gray-400 text-sm focus:outline-none placeholder:text-gray-400"
              />
            </div>
            <button className="p-2 rounded-full border border-gray-400">
              <Bell className="text-gray-400" size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Doctor & Data */}
          <div className="col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Hello, {userData?.name || "Your Name"}!</h1>
              <p className="text-gray-500">Have are you feeling today?</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoCard
                  title="Your Doctor"
                  content={
                    <div className="flex justify-between">
                      <div className="flex space-x-2 items-center">
                        <img
                          src="https://via.placeholder.com/40"
                          className="w-10 h-10 rounded-full bg-black"
                          alt="Doctor"
                        />
                        <div>
                          <p className="text-base font-bold text-gray-900">
                            {userData?.doctor[0]?.doctorName || "Your Doctor"}
                          </p>
                          <p className="text-sm font-normal text-gray-500">
                            {userData?.doctor[0]?.doctorDegree || "Doctor Degree"}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <div className="bg-[#EBECF5] rounded-lg flex items-center p-2">
                          <MessageSquare size={20} className="text-[#6FD2EE] cursor-pointer" />
                        </div>
                        <a
                          href={`tel:${userData?.doctor[0]?.doctorphone}`}
                          className="bg-[#EBECF5] rounded-lg flex items-center p-2"
                        >
                          <PhoneCall size={20} className="text-[#6FD2EE] cursor-pointer" />
                        </a>
                      </div>
                    </div>
                  }
                  onChange={() => setIsDoctorModalOpen(true)}
                />
                <InfoCard
                  title="Your data"
                  content={
                    <div className="flex justify-between text-sm">
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Weight:</p>
                        <p className="text-base font-bold text-gray-900">{userData?.patientDetails.weight || "NA"} kg</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Height:</p>
                        <p className="text-base font-bold text-gray-900">{userData?.patientDetails.height || "NA"} cm</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Blood:</p>
                        <p className="text-base font-bold text-gray-900">{userData?.patientDetails.blood?.toUpperCase() || "NA"}</p>
                      </div>
                    </div>
                  }
                  onChange={() => navigate('/patient/setting')}
                />
              </div>

              {/* Middle Section */}
              <div className="bg-white rounded-2xl p-6 shadow-sm flex">
                <div className="w-1/3 flex justify-center items-center">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/3774/3774299.png"
                    alt="Doctor Illustration"
                    className="w-32 h-32 object-contain"
                  />
                </div>
                <div className="w-2/3 grid grid-cols-2 gap-4">
                  <CardButton icon="🧠" title="Diagnostic" subtitle="List of diseases" />
                  <CardButton icon="💊" title="Drugs" subtitle="Archive of tests" />
                  <CardButton icon="📝" title="Tests" subtitle="Prescribed medicine" />
                </div>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div>
            <div className="bg-white rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold">Remind me</p>
                <div className=" flex gap-1">
                  <button className="text-sm text-[#6FD2EE]">This week</button>
                <ChevronDown size={20} className="text-[#6FD2EE] cursor-pointer" />
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full w-2/5"></div>
              </div>

              <div className="space-y-1 rounded-lg bg-[#EBECF5] p-1">
                <ReminderItem title="Order drugs" date="07.06.2020" />
                <ReminderItem title="Start course" date="10.06.2020" />
                <ReminderItem title="Blood test" date="12.06.2020" />
                <ReminderItem title="Diagnostic" date="12.06.2020" />
                <ReminderItem title="Took tests" date="10.06.2020" />
                <ReminderItem title="Consultation" date="10.06.2020" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Doctor Selection Modal */}
      {isDoctorModalOpen && (
        <DoctorModal
          doctors={userData?.doctor || []}
          onClose={() => setIsDoctorModalOpen(false)}
          onSelect={handleDoctorSelect}
        />
      )}
    </div>
  );
}

/* Components */
const SidebarItem = ({ icon, label, active }) => (
  <div
    className={`flex mx-2 rounded-full items-center space-x-3 px-4 py-2 cursor-pointer hover:bg-blue-50 ${active ? "text-blue-50 bg-blue-600 font-medium" : ""
      }`}
  >
    <span className={`text-gray-500 ${active ? "text-blue-50 bg-blue-600 font-medium" : ""}`}>{icon}</span>
    <span className="text-sm">{label}</span>
  </div>
);

const InfoCard = ({ title, content, onChange }) => (
  <div className="bg-white p-5 rounded-lg shadow-sm relative">
    <div className="flex justify-between items-center mb-2">
      <p className="text-lg font-semibold text-gray-900 pb-2">{title}</p>
      <div className="flex items-center gap-2 cursor-pointer" onClick={onChange}>
        <Edit3 size={14} className="text-[#6FD2EE]" />
        <p className="text-[#6FD2EE] font-semibold text-sm">Change</p>
      </div>
    </div>
    {content}
  </div>
);

const CardButton = ({ icon, title, subtitle }) => (
  <div className="border rounded-xl p-4 flex flex-col justify-center hover:bg-blue-50 cursor-pointer">
    <div className="text-3xl mb-2">{icon}</div>
    <p className="font-medium">{title}</p>
    <p className="text-xs text-gray-500">{subtitle}</p>
  </div>
);

const ReminderItem = ({ title, date }) => (
  <div className="flex justify-between items-center p-2 rounded-lg text-sm bg-white">
    <div className="flex items-center gap-2">
      <div className="bg-[#EBECF5] p-3 rounded">
        <ClipboardList size={30} className="text-[#2663EB]" />
      </div>
      <div>
        <p className=" text-sm font-bold">{title}</p>
        <p className=" text-xs font-medium">{date}</p>
      </div>
    </div>
    <div className="flex items-center space-x-1 text-gray-400 cursor-pointer">
      {/* <span>{date}</span> */}
      <Edit3 color="#6FD2EE" size={18} />
    </div>
  </div>
);

// Doctor selection modal component
const DoctorModal = ({ doctors, onClose, onSelect }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-auto">
      <h2 className="text-xl font-semibold mb-4">Select Your Doctor</h2>
      <ul>
        {doctors.map((doc, idx) => (
          <li
            key={idx}
            className="p-3 cursor-pointer hover:bg-blue-100 rounded"
            onClick={() => onSelect(doc)}
          >
            <p className="font-bold">{doc.doctorName}</p>
            <p className="text-sm text-gray-600">{doc.doctorDegree}</p>
          </li>
        ))}
      </ul>
      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Close
      </button>
    </div>
  </div>
);