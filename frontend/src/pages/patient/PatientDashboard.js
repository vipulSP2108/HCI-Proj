import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';

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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { userService } from '../../services/userService';
import { Play, TrendingUp, Clock, Target, Award } from 'lucide-react';
import ChatPage from '../common/ChatPage';
import PatientAppointments from './PatientAppointments';

export default function PatientDashboard({ userId }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);

  // New state to manage the active section (for switching main content)
  const [activeSection, setActiveSection] = useState('Dashboard');

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleDoctorSelect = (doctor) => {
    setUserData((prev) => ({
      ...prev,
      doctor: [doctor],
    }));
    setIsDoctorModalOpen(false);
  };

  // Function to change the active section
  const changeSection = (section) => {
    setActiveSection(section);
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
      {/* Sidebar - fixed, collapsible */}
      <aside className={`fixed top-0 left-0 h-screen bg-white shadow-lg flex flex-col justify-between overflow-hidden z-10 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-0 flex flex-col h-full">
          {/* Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-4 flex items-center justify-center border-b border-gray-200"
          >
            {isCollapsed ? (
              <ChevronRight size={18} className="text-gray-600 cursor-pointer" />
            ) : (
              <ChevronLeft size={18} className="text-gray-600 cursor-pointer" />
            )}
          </button>

          {/* Logo */}
          <div className={`p-6 flex items-center space-x-2 transition-opacity`}>
            <div className="bg-[#2B91D4] h-8 w-8 rounded-lg"></div>
            {!isCollapsed && <span className="text-xl font-bold">App Name</span>}
          </div>

          {/* Profile */}

          {!isCollapsed && (
            <div className={`px-6 pt-6 pb-2 flex items-center space-x-3 transition-all ${isCollapsed ? 'space-x-0 justify-center' : ''}`}>

              <img
                src="https://via.placeholder.com/40"
                alt="Profile"
                className="w-10 h-10 bg-black rounded-full flex-shrink-0"
              />
              <div>
                <h1 className="text-lg font-semibold text-[#2B91D4]">{userData?.name || "Your Name"}</h1>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          )}


          {/* Nav */}
          <nav className="mt-4 flex-1 overflow-y-auto px-2">
            <SidebarItem
              icon={<Home size={18} />}
              label="Dashboard"
              active={activeSection === 'Dashboard'}
              onClick={() => changeSection('Dashboard')}
              collapsed={isCollapsed}
            />
            <SidebarItem
              icon={<Calendar size={18} />}
              label="Appointment"
              active={activeSection === 'Appointment'}
              onClick={() => changeSection('Appointment')}
              collapsed={isCollapsed}
            />
            <SidebarItem
              icon={<FileText size={18} />}
              label="Record"
              active={activeSection === 'Record'}
              onClick={() => changeSection('Record')}
              collapsed={isCollapsed}
            />
            <SidebarItem
              icon={<MessageSquare size={18} />}
              label="Chat"
              active={activeSection === 'Chat'}
              onClick={() => changeSection('Chat')}
              collapsed={isCollapsed}
            />
            <SidebarItem
              icon={<ClipboardList size={18} />}
              label="Calendar"
              active={activeSection === 'Calendar'}
              onClick={() => changeSection('Calendar')}
              collapsed={isCollapsed}
            />
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="border-t py-4 pt-5 space-y-2 px-2">
          <SidebarItem
            icon={<Settings size={18} />}
            label="Settings"
            active={activeSection === 'Settings'}
            onClick={() => changeSection('Settings')}
            collapsed={isCollapsed}
          />
          <SidebarItem
            icon={<LogOut size={18} />}
            label="Help Center"
            active={activeSection === 'Help Center'}
            onClick={() => changeSection('Help Center')}
            collapsed={isCollapsed}
          />
        </div>
      </aside>

      {/* Main content - scrollable, offset by sidebar */}
      <div className={`h-screen overflow-y-auto px-4 flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <main className="flex-1">
          {activeSection === 'Dashboard' && <DashboardContent
            userData={userData}
            user={user}
            stats={stats}
            setIsDoctorModalOpen={setIsDoctorModalOpen}
            navigate={navigate}
          />}
          {activeSection === 'Appointment' && <PatientAppointments />}
          {activeSection === 'Record' && <RecordContent />}
          {activeSection === 'Chat' && <ChatPage />}
          {activeSection === 'Calendar' && <CalendarContent />}
          {activeSection === 'Settings' && <SettingsContent
            userData={userData}
            navigate={navigate}
          />}
          {activeSection === 'Help Center' && <HelpCenterContent
            handleLogout={handleLogout}
          />}
        </main>
      </div>

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

// Updated SidebarItem to accept onClick, active, and collapsed props
const SidebarItem = ({ icon, label, active, onClick, collapsed }) => (
  <div
    className={`flex ${collapsed ? 'justify-center' : 'items-center space-x-3'} mx-2 my-1 rounded-full px-4 py-2 cursor-pointer hover:bg-blue-50 transition-all ${active ? "text-white bg-blue-600 font-medium" : ""}`}
    onClick={onClick}
  >
    <span className={`text-gray-500 ${active ? "text-white" : ""} flex-shrink-0`}>{icon}</span>
    {!collapsed && <span className="text-sm whitespace-nowrap">{label}</span>}
  </div>
);

// Extracted Dashboard content into its own component
const DashboardContent = ({ userData, user, stats, setIsDoctorModalOpen, navigate }) => {
  const [selectedSession, setSelectedSession] = useState(0);

  // Computations for charts - moved inside DashboardContent
  const recentSessions = stats?.recentSessions || (stats?.play ? [stats] : []);
  const today = new Date('2025-10-18'); // Use provided current date
  const totals = {
    correct: recentSessions.reduce((sum, s) => sum + (s.correct || 0), 0),
    incorrect: recentSessions.reduce((sum, s) => sum + (s.incorrect || 0), 0),
    notDone: recentSessions.reduce((sum, s) => sum + (s.notDone || 0), 0),
    responsetime: recentSessions.reduce((sum, s) => sum + (s.responsetime || 0), 0),
  };

  const barData = [
    { name: 'Correct', value: totals.correct },
    { name: 'Incorrect', value: totals.incorrect },
    { name: 'Not Done', value: totals.notDone },
  ];

  // Daily data aggregation
  const dailyData = {};
  recentSessions.forEach((session) => {
    const date = new Date(session.time);
    const dateStr = date.toISOString().split('T')[0];
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { correct: 0, incorrect: 0, notDone: 0, total: 0, totalResponseTime: 0 };
    }
    dailyData[dateStr].correct += session.correct || 0;
    dailyData[dateStr].incorrect += session.incorrect || 0;
    dailyData[dateStr].notDone += session.notDone || 0;
    dailyData[dateStr].total += session.total || (session.correct + session.incorrect + session.notDone);
    dailyData[dateStr].totalResponseTime += session.responsetime || 0;
  });

  // Last 7 chronological sessions
  const last7Chron = [...recentSessions]
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .slice(-7);

  // Accuracy and Response Time data for last 7 games
  const accuracyData = last7Chron.map((session) => {
    const total = (session.correct || 0) + (session.incorrect || 0);
    const accuracy = total > 0 ? ((session.correct || 0) / total) * 100 : 0;
    const avgResponseTime = (session.total || total) > 0 ? (session.responsetime || 0) / (session.total || total) : 2.5;

    return {
      date: new Date(session.time).toLocaleDateString(),
      accuracy,
      responseTime: avgResponseTime,
    };
  });

  // Average accuracy over last 7 sessions
  const avgAcc7Sessions = last7Chron.length > 0 ? last7Chron.reduce((sum, s) => {
    const total = (s.correct || 0) + (s.incorrect || 0);
    return sum + (total > 0 ? ((s.correct || 0) / total * 100) : 0);
  }, 0) / last7Chron.length : 0;

  // Average response time over last 7 games
  const avgResponseTime7Games = last7Chron.reduce((sum, session) => {
    const total = session.total || ((session.correct || 0) + (session.incorrect || 0) + (session.notDone || 0));
    const avg = total > 0 ? (session.responsetime || 0) / total : 2.5;
    return sum + avg;
  }, 0) / last7Chron.length;

  // Counts data for last 7 games
  const last7Data = last7Chron.map((session) => ({
    date: new Date(session.time).toLocaleDateString(),
    correct: session.correct || 0,
    incorrect: session.incorrect || 0,
    notDone: session.notDone || 0,
  }));

  // Daily totals data for last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) =>
    new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
  );
  const dailyTotalsData = last7Days
    .map((day) => {
      const dateStr = day.toISOString().split('T')[0];
      const dayData = dailyData[dateStr] || { correct: 0, incorrect: 0, notDone: 0 };
      return {
        date: day.toLocaleDateString(),
        correct: dayData.correct,
        incorrect: dayData.incorrect,
        notDone: dayData.notDone,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ensure ascending order

  // Streak data for last 15 days - UPDATED for intensity
  const last15Days = Array.from({ length: 15 }, (_, i) =>
    new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
  );
  const streakData = last15Days.map((day) => {
    const dateStr = day.toISOString().split('T')[0];
    const attempts = dailyData[dateStr] ? dailyData[dateStr].total : 0;
    return {
      date: day.toLocaleDateString(),
      attempts,
    };
  });

  // Selected session detailed data
  const selectedSessionData = last7Chron[selectedSession];
  const attemptData = selectedSessionData?.session.play ? selectedSessionData.session.play.map((p, i) => ({
    attempt: i + 1,
    responseTime: p.responsetime,
    correct: p.correct,
  })) : [];

  // Custom dot renderer for colored nodes based on correctness
  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    let fillColor = 'black'; // default for 0
    if (payload.correct === 1) {
      fillColor = 'green';
    } else if (payload.correct === -1) {
      fillColor = 'red';
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fillColor}
        stroke={fillColor}
        strokeWidth={2}
      />
    );
  };

  // Custom tooltip formatter to include status
  const customTooltip = (props) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = data.correct === 1 ? 'Correct' : data.correct === -1 ? 'Incorrect' : 'Not Done';
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-bold">Attempt {data.attempt}</p>
          <p>Response Time: {data.responseTime}s</p>
          <p>Status: <span style={{ color: data.correct === 1 ? 'green' : data.correct === -1 ? 'red' : 'black' }}>{status}</span></p>
        </div>
      );
    }
    return null;
  };

  console.log(selectedSessionData)

  return (
    <>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor & Data & Stats & Recent Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Hello, {userData?.name || "Your Name"}!</h1>
            <p className="text-gray-500">How are you feeling today?</p>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={()=>navigate('/chat')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><MessageSquare size={18}/>Chat</button>
              <button onClick={()=>navigate('/reminders')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Bell size={18}/>Reminders</button>
              <button onClick={()=>navigate('/patient/appointments')} className="flex items-center gap-2 px-4 py-3 bg-white rounded-lg shadow hover:bg-gray-50"><Calendar size={18}/>Appointments</button>
            </div>
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

            {/* Middle Section - Stats Cards */}
            <div className="bg-white rounded-2xl p-3 shadow-sm flex">
              <div className="p-1 w-full">
                <div className="max-w-6xl mx-auto">
                  {/* Header */}
                  <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary-600" />
                    Your Stats
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* Card Component */}
                    <div className="bg-white rounded-xl p-6 shadow-md border border-primary-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-600">Level</p>
                        <Award className="w-5 h-5 text-primary-500" />
                      </div>
                      <p className="text-5xl font-bold text-primary-600">{stats?.level || 1}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-md border border-secondary-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-600">Total Score</p>
                        <Target className="w-5 h-5 text-secondary-500" />
                      </div>
                      <p className="text-5xl font-bold text-secondary-600">{stats?.totalScore || 0}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-md border border-green-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-600">Sessions Played</p>
                        <Play className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-5xl font-bold text-green-600">{recentSessions.length}</p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-md border border-orange-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-gray-600">Response Time</p>
                        <Clock className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-4xl font-bold text-orange-600">{stats?.currentlevelspan || stats?.levelspan || 5}s</p>
                      <p className="text-xs text-gray-500 mt-1">Time allowed per attempt</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sessions - Charts */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Sessions</h2>
                {recentSessions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Bar Graph - UPDATED with colors */}

                    {/* Accuracy & Response Time Line Graph for Last 7 Games with Averages */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Accuracy & Avg Response Time: Last 7 Games</h3>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={accuracyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis yAxisId="left" orientation="left" unit="%" />
                            <YAxis yAxisId="right" orientation="right" unit="s" />
                            <Tooltip
                              formatter={(value, name) => {
                                if (name === 'accuracy') return [`${value}%`, 'Accuracy'];
                                if (name === 'responseTime') return [`${value}s`, 'Avg Response Time'];
                                return [value, name];
                              }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="accuracy" stroke="#8884d8" yAxisId="left" strokeWidth={2} />
                            <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" yAxisId="right" strokeWidth={2} />
                            <ReferenceLine y={avgAcc7Sessions} label={{ value: `${avgAcc7Sessions.toFixed(1)}%`, position: 'middle' }} stroke="red" strokeDasharray="3 3" yAxisId="left" />
                            <ReferenceLine y={avgResponseTime7Games} label={{ value: `${avgResponseTime7Games.toFixed(1)}s`, position: 'top' }} stroke="green" strokeDasharray="3 3" yAxisId="right" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Grid for Counts Line Graphs */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Last 7 Games Counts */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Counts: Last 7 Games</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={last7Data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="correct" stroke="#10B981" strokeWidth={2} />
                              <Line type="monotone" dataKey="incorrect" stroke="#EF4444" strokeWidth={2} />
                              <Line type="monotone" dataKey="notDone" stroke="#F59E0B" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Daily Counts Last 7 Days */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Counts: Last 7 Days</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyTotalsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="correct" stroke="#10B981" strokeWidth={2} />
                              <Line type="monotone" dataKey="incorrect" stroke="#EF4444" strokeWidth={2} />
                              <Line type="monotone" dataKey="notDone" stroke="#F59E0B" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Last Game Plot */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-700">Detailed Plot: Last Game Performance</h3>
                        <select 
                          className="p-1 border rounded text-sm" 
                          value={selectedSession} 
                          onChange={e => setSelectedSession(parseInt(e.target.value))}
                        >
                          {last7Chron.map((s, i) => (
                            <option key={i} value={i}>
                              Game {last7Chron.length - i} ({new Date(s.time).toLocaleDateString()})
                            </option>
                          ))}
                        </select>
                      </div>
                      {attemptData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={attemptData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="attempt" />
                              <YAxis unit="s" />
                              <Tooltip content={customTooltip} />
                              <Line type="monotone" dataKey="responseTime" stroke="#82ca9d" strokeWidth={2} dot={renderDot} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center">No detailed play data available for this session.</p>
                      )}
                    </div>

                    {/* Streak for Last 15 Days - UPDATED with intensity */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">Submission Streak: Last 15 Days</h3>
                      <div className="flex justify-center space-x-1">
                        {streakData.map((day, index) => {
                          let bgColor = '#D1D5DB'; // gray-300 for 0
                          if (day.attempts > 0) {
                            // Scale green intensity: 20% lightness at 1 attempt, 80% at 30 (HSL for emerald green)
                            const lightness = 20 + (day.attempts / 30) * 60; // 20-80%
                            bgColor = `hsl(152, 69%, ${lightness}%)`; // Tailwind's green hsl base
                          }
                          return (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full transition-colors"
                              style={{ backgroundColor: bgColor }}
                              title={`${day.date}: ${day.attempts} attempts`}
                            />
                          );
                        })}
                      </div>
                      <p className="text-sm text-gray-500 text-center mt-2">Color intensity = attempts that day (left: today, right: 15 days ago; max 30 attempts)</p>
                    </div>


                    {/* Performance Indicator */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-semibold mb-2">💡 Quick Tip:</p>
                      <p className="text-sm text-blue-700">
                        Try to respond within <span className="font-bold">{stats?.currentlevelspan || stats?.levelspan || 5} seconds</span> to avoid "Not Done" entries.
                        Practice regularly to improve your accuracy and response time!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="mb-6">
                      <Play className="w-24 h-24 text-gray-300 mx-auto" />
                    </div>
                    <p className="text-xl text-gray-400 mb-4 font-semibold">No sessions yet!</p>
                    <p className="text-gray-500 mb-6">Start playing to see your progress and statistics</p>
                    <button
                      onClick={() => navigate('/game')}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition shadow-lg font-semibold text-lg"
                    >
                      <Play className="w-6 h-6" />
                      Play Your First Game
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reminders & Play Button & Total Counts Bar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg p-5 shadow-sm mb-4">
            <div className="flex justify-between items-center mb-3">
              <p className="font-semibold">Remind me</p>
              <div className="flex gap-1">
                <button className="text-sm text-[#6FD2EE]">This week</button>
                <ChevronDown size={20} className="text-[#6FD2EE] cursor-pointer" />
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-blue-600 h-2 rounded-full w-2/5"></div>
            </div>

            <div className="space-y-1 rounded-lg bg-[#EBECF5] p-1 max-h-48 overflow-y-auto">
              <ReminderItem title="Order drugs" date="07.06.2020" />
              <ReminderItem title="Start course" date="10.06.2020" />
              <ReminderItem title="Blood test" date="12.06.2020" />
              <ReminderItem title="Diagnostic" date="12.06.2020" />
              <ReminderItem title="Took tests" date="10.06.2020" />
              <ReminderItem title="Consultation" date="10.06.2020" />
            </div>
          </div>

          <button
            onClick={() => navigate('/game')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#2663EB] to-[#6FD2EE] text-white rounded-xl font-bold text-xl hover:from-[#225ad5] hover:to-[#64bed7] transition shadow-xl transform"
          >
            <Play className="w-7 h-7" />
            Play Game
          </button>

          <button
            onClick={() => navigate('/game2')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#2663EB] to-[#6FD2EE] text-white rounded-xl font-bold text-xl hover:from-[#225ad5] hover:to-[#64bed7] transition shadow-xl transform"
          >
            <Play className="w-7 h-7" />
            Play Game2 
          </button>

          <button
            onClick={() => navigate('/game3')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#2663EB] to-[#6FD2EE] text-white rounded-xl font-bold text-xl hover:from-[#225ad5] hover:to-[#64bed7] transition shadow-xl transform"
          >
            <Play className="w-7 h-7" />
            Play Game3
          </button>

          <button
            onClick={() => navigate('/game4')}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#2663EB] to-[#6FD2EE] text-white rounded-xl font-bold text-xl hover:from-[#225ad5] hover:to-[#64bed7] transition shadow-xl transform"
          >
            <Play className="w-7 h-7" />
            Play Game4
          </button>

          {/* Total Counts Bar Chart - UPDATED with colors */}
          <div className="bg-white rounded-lg shadow-sm mb-4 p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Total Counts</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" />
                  <YAxis hide={true} />
                  <Tooltip formatter={(value) => [value, 'Count']} />
                  <Bar dataKey="value">
                    {barData.map((entry, index) => {
                      let color = "#000"; // fallback
                      if (entry.name === "Correct") color = "#2663EB";
                      else if (entry.name === "Incorrect") color = "#6FD2EE";
                      else if (entry.name === "Not Done") color = "#EBECF5";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Placeholder for AppointmentContent - create a new component file for this
const AppointmentContent = () => (
  <div>
    <h1 className="text-2xl font-semibold">Appointments</h1>
    <p>Content for managing appointments goes here.</p>
    {/* Add your appointment-specific UI and logic here */}
  </div>
);

// Placeholder for RecordContent - create a new component file for this
const RecordContent = () => (
  <div>
    <h1 className="text-2xl font-semibold">Records</h1>
    <p>Content for viewing medical records goes here.</p>
    {/* Add your record-specific UI and logic here */}
  </div>
);

// Placeholder for ChatContent - create a new component file for this
const ChatContent = () => (
  <div>
    <h1 className="text-2xl font-semibold">Chat</h1>
    <p>Content for chat interface goes here.</p>
    {/* Add your chat-specific UI and logic here */}
  </div>
);

// Placeholder for CalendarContent - create a new component file for this
const CalendarContent = () => (
  <div>
    <h1 className="text-2xl font-semibold">Calendar</h1>
    <p>Content for calendar view goes here.</p>
    {/* Add your calendar-specific UI and logic here */}
  </div>
);

// Placeholder for SettingsContent - create a new component file for this
const SettingsContent = ({ userData, navigate }) => (
  <div>
    <h1 className="text-2xl font-semibold">Settings</h1>
    <p>Content for settings goes here.</p>
    {/* You can move the existing settings logic here instead of navigating to /patient/setting */}
    {/* For example, include forms to update user data */}
  </div>
);

// Placeholder for HelpCenterContent - create a new component file for this
const HelpCenterContent = ({ handleLogout }) => (
  <div>
    <h1 className="text-2xl font-semibold">Help Center</h1>
    <p>Content for help center goes here.</p>
    {/* Add FAQs, support links, etc. */}
    <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
      Logout
    </button>
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
        <p className="text-sm font-bold">{title}</p>
        <p className="text-xs font-medium">{date}</p>
      </div>
    </div>
    <div className="flex items-center space-x-1 text-gray-400 cursor-pointer">
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