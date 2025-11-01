import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { userService } from '../../services/userService';
import { chatService } from '../../services/chatService';
import { reminderService } from '../../services/reminderService';
import { Play, LogOut, TrendingUp, Users, MessageSquare, Bell, Calendar } from 'lucide-react';

const CaretakerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [chats, setChats] = useState([]);
  const [selectedReminderPatient, setSelectedReminderPatient] = useState('');
  const [reminders, setReminders] = useState([]);
  const [reminderForm, setReminderForm] = useState({ title: '', text: '', date: '', time: '', isRecurring: false });

  useEffect(() => {
    loadStats();
    (async()=>{
      try{ const res = await userService.getCaretakerPatients(); setPatients(res.patients||[]);} catch(e){ console.error(e); }
      try{ const c = await chatService.listMyChats(); setChats(c.chats||[]);} catch(e){ console.error(e); }
    })();
  }, []);

  const loadStats = async () => {
    try {
      const response = await gameService.getBasicStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const refreshReminders = async (pid) => {
    if (!pid) { setReminders([]); return; }
    try { const r = await reminderService.listForPatient(pid); setReminders(r.reminders||[]); } catch(e){ console.error(e); }
  };

  const createReminder = async () => {
    if (!selectedReminderPatient) return alert('Select a patient');
    await reminderService.create({ patientId: selectedReminderPatient, ...reminderForm });
    setReminderForm({ title: '', text: '', date: '', time: '', isRecurring: false });
    refreshReminders(selectedReminderPatient);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-secondary-600 to-primary-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Caretaker Dashboard</h1>
              <p className="text-purple-100">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition shadow-lg">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-secondary-600" />
                Your Stats
              </h2>
              {stats && (
                <div className="space-y-4">
                  <div className="bg-secondary-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Level</p>
                    <p className="text-4xl font-bold text-secondary-600">{stats.level}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Score</p>
                    <p className="text-4xl font-bold text-primary-600">{stats.totalScore}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Sessions Played</p>
                    <p className="text-4xl font-bold text-green-600">{stats.recentSessions?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/game')} className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl font-bold text-xl hover:from-success-600 hover:to-success-700 transition shadow-2xl">
              <Play className="w-8 h-8" />
              Play Game
            </button>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Chats Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><MessageSquare className="w-6 h-6 text-blue-600"/>My Chats</h2>
              <div className="space-y-2 max-h-64 overflow-auto">
                {chats.map(c => (
                  <div key={c._id} className="border rounded p-2 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500">{c.type}</div>
                      <div className="text-sm">{(c.participants||[]).map(p=>p.email||p).join(', ')}</div>
                    </div>
                    <button onClick={()=>navigate('/chat')} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Open</button>
                  </div>
                ))}
                {chats.length===0 && <div className="text-sm text-gray-500">No chats yet</div>}
              </div>
            </div>
            {/* Assigned Patients */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-6 h-6 text-primary-600"/>Assigned Patients ({patients.length})</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {patients.map(p => (
                  <div key={p._id} className="border rounded p-4">
                    <div className="font-semibold">{p.email}</div>
                    <div className="text-sm text-gray-600 mb-3">{p.patientDetails?.diagnosis || ''}</div>
                    <div className="flex gap-2">
                      <button onClick={async()=>{ await chatService.ensureChat([p._id], 'caretaker-patient'); navigate('/chat'); }} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-1 text-sm"><MessageSquare size={14}/>Chat</button>
                      <button onClick={()=>navigate('/reminders')} className="px-3 py-2 bg-yellow-500 text-white rounded flex items-center gap-1 text-sm"><Bell size={14}/>Reminders</button>
                    </div>
                  </div>
                ))}
                {patients.length===0 && <div className="text-gray-500">No assigned patients</div>}
              </div>
            </div>

            {/* Reminders Quick Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-6 h-6 text-yellow-600"/>Reminders (Quick)</h2>
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

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Sessions</h2>
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Correct</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Incorrect</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Unattempted</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSessions.slice(-7).reverse().map((session, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">{new Date(session.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">{session.correctResponses}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">{session.incorrectResponses}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">{session.unattemptedResponses}</span></td>
                          <td className="py-3 px-4 font-bold text-secondary-600">{session.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">No sessions yet. Start playing to see your progress!</p>
                  <button onClick={() => navigate('/game')} className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition">
                    <Play className="w-5 h-5" />
                    Play Your First Game
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaretakerDashboard;
