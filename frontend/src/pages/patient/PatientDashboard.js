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
} from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h1 className="text-lg font-semibold text-[#2B91D4]">{user?.name ? user?.email : "Your Name"}</h1>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>

          <nav className="mt-4 rounded-xl">
            <Link to="/patient/setting">
              <button className="btn">Edit Profile</button>
            </Link>
            <SidebarItem icon={<Home size={18} />} label="Dashboard" active />
            <SidebarItem icon={<Calendar size={18} />} label="Appointment" />
            <SidebarItem icon={<FileText size={18} />} label="Record" />
            <SidebarItem icon={<MessageSquare size={18} />} label="Chat" />
            <SidebarItem icon={<ClipboardList size={18} />} label="Calendar" />
          </nav>
        </div>

        <div className="border-t py-4 pt-5 space-y-2">
          <SidebarItem icon={<Settings size={18} />} label="Settings" />
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
            <button className="p-2 rounded-full border border-gray-400 rounded-full">
              <Bell className="text-gray-400" size={18} />
            </button>
          </div>
        </div>




        <div className="grid grid-cols-3 gap-6">
          {/* Doctor & Data */}
          <div className="col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl font-semibold">Hello, {user?.name ? user?.name : "Your Name"}!</h1>
              <p className="text-gray-500">Have are you feeling today?</p>
            </div>
            <div className="space-y-6">
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
                        <p className="text-base font-bold text-gray-900">{user?.doctor ? user?.doctor : "Your Doctor"}</p>
                        <p className="text-sm font-normal text-gray-500">{user?.doctorDegree ? user?.doctorDegree : "Doctor Degree"}</p>
                      </div>
                      </div>

                      <div className="flex space-x-2">
                        <div className=" bg-[#EBECF5] rounded-lg flex items-center p-2"><MessageSquare size={20} className="text-[#6FD2EE] cursor-pointer" /></div>
                        <div teli={user?.doctorteli ? user?.doctorteli : "Doctor Degree"} className=" bg-[#EBECF5] rounded-lg flex items-center p-2"><PhoneCall size={20} className="text-[#6FD2EE] cursor-pointer" /></div>
                        </div>
                    </div>
                  }
                />
                <InfoCard
                  title="Your data"
                  content={
                    <div className="flex justify-between text-sm">
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Weight:</p>
                        <p className="text-base font-bold text-gray-900">58 kg</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Height:</p>
                        <p className="text-base font-bold text-gray-900">175 cm</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-normal text-gray-500">Blood:</p>
                        <p className="text-base font-bold text-gray-900">A+</p>
                      </div>
                    </div>

                  }
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
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="font-semibold">Remind me</p>
                <button className="text-sm text-blue-600">This week</button>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full w-2/5"></div>
              </div>

              <div className="space-y-3">
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

const InfoCard = ({ title, content }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm relative">
    <div className="flex justify-between items-center mb-2">
      <p className="text-lg font-semibold text-gray-900 pb-2">{title}</p>
      <div className=" flex items-center gap-2">
        <Edit3 size={14} className="text-[#6FD2EE] cursor-pointer" />
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
  <div className="flex justify-between items-center text-sm">
    <div className="flex items-center space-x-2">
      <div className="bg-blue-100 p-1 rounded">
        <ClipboardList size={14} className="text-blue-600" />
      </div>
      <p>{title}</p>
    </div>
    <div className="flex items-center space-x-1 text-gray-400 cursor-pointer">
      <span>{date}</span>
      <Edit3 size={14} />
    </div>
  </div>
);
