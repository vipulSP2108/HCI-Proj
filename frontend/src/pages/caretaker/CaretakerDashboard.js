import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService'; // 'stats' logic is here, though unused
import { userService } from '../../services/userService';
import { chatService } from '../../services/chatService';
import { reminderService } from '../../services/reminderService';
import {
    LogOut, Users, MessageSquare, Bell, Calendar, Search, Loader2
} from 'lucide-react';

// --- 1. New TopBar Component ---
// This replaces the old gradient header
const TopBar = ({ user, handleLogout }) => (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 pb-8 pt-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Hello, {user?.email}!</h1>
            <p className="text-gray-500">Welcome to your Caretaker Dashboard.</p>
        </div>
        <div className="flex items-center space-x-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                    type="text"
                    placeholder="Global search"
                    className="bg-white text-gray-800 pl-9 pr-5 py-2.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
                />
            </div>
            <button className="p-2.5 rounded-full border border-gray-300 bg-white">
                <Bell className="text-gray-500" size={18} />
            </button>
            <button 
                onClick={handleLogout} 
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
            >
                <LogOut className="w-4 h-4" />
                Logout
            </button>
        </div>
    </div>
);


// --- 2. Main CaretakerDashboard Component ---
const CaretakerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null); // This is from your original code
    const [patients, setPatients] = useState([]);
    const [chats, setChats] = useState([]);
    const [selectedReminderPatient, setSelectedReminderPatient] = useState('');
    const [reminders, setReminders] = useState([]);
    const [reminderForm, setReminderForm] = useState({ title: '', text: '', date: '', time: '', isRecurring: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        (async () => {
            try {
                const res = await userService.getCaretakerPatients();
                setPatients(res.patients || []);
            } catch (e) { console.error(e); }
            try {
                const c = await chatService.listMyChats();
                setChats(c.chats || []);
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
        // loadStats(); // This was in your original code
    }, []);

    // const loadStats = async () => { ... }; // Unused, but kept for reference

    const refreshReminders = async (pid) => {
        if (!pid) { setReminders([]); return; }
        try {
            const r = await reminderService.listForPatient(pid);
            setReminders(r.reminders || []);
        } catch (e) { console.error(e); }
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
        // --- Main background color ---
        <div className="min-h-screen bg-[#EBECF5] text-gray-800">
            <div className="max-w-7xl mx-auto p-6">
                
                {/* --- New Top Bar --- */}
                <TopBar user={user} handleLogout={handleLogout} />

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    </div>
                ) : (
                    // --- Original 3-column layout ---
                    <div className="grid lg:grid-cols-3 gap-6">
                        
                        {/* --- Left Column (Chats) --- */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-6 h-6 text-blue-600" />My Chats
                                </h2>
                                <div className="space-y-2 max-h-96 overflow-auto">
                                    {chats.map(c => (
                                        <div key={c._id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-500">{c.type}</div>
                                                <div className="text-sm font-medium text-gray-700">{(c.participants || []).map(p => p.email || p).join(', ')}</div>
                                            </div>
                                            <button 
                                                onClick={() => navigate('/chat')} 
                                                className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700"
                                            >
                                                Open
                                            </button>
                                        </div>
                                    ))}
                                    {chats.length === 0 && <div className="text-sm text-gray-500 text-center py-4">No chats yet</div>}
                                </div>
                            </div>
                        </div>

                        {/* --- Right Column (Patients & Reminders) --- */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Assigned Patients */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Users className="w-6 h-6 text-purple-600" />Assigned Patients ({patients.length})
                                </h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    {patients.map(p => (
                                        <div key={p._id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="font-semibold text-gray-800">{p.email}</div>
                                            <div className="text-sm text-gray-600 mb-3">{p.patientDetails?.diagnosis || 'No diagnosis'}</div>
                                            <div className="flex gap-2">
                                                <button onClick={async () => {
                                                    await chatService.ensureChat([p._id], 'caretaker-patient');
                                                    navigate('/chat');
                                                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1.5 text-sm font-medium hover:bg-blue-700">
                                                    <MessageSquare size={14} />Chat
                                                </button>
                                                {/* This button was in your original code, commented out. Uncomment if needed */}
                                                {/* <button onClick={() => navigate('/reminders')} className="px-3 py-2 bg-yellow-500 text-white rounded flex items-center gap-1 text-sm"><Bell size={14} />Reminders</button> */}
                                            </div>
                                        </div>
                                    ))}
                                    {patients.length === 0 && <div className="text-gray-500 col-span-full text-center py-4">No assigned patients</div>}
                                </div>
                            </div>

                            {/* Reminders Quick Panel */}
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Bell className="w-6 h-6 text-yellow-600" />Reminders (Quick)
                                </h2>
                                <div className="grid md:grid-cols-4 gap-3 items-end mb-4">
                                    <select 
                                        className="border border-gray-300 p-3 rounded-lg md:col-span-1 bg-white" 
                                        value={selectedReminderPatient} 
                                        onChange={e => { setSelectedReminderPatient(e.target.value); refreshReminders(e.target.value); }}>
                                        <option value="">Select Patient</option>
                                        {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
                                    </select>
                                    <input className="border border-gray-300 p-3 rounded-lg" placeholder="Title" value={reminderForm.title} onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })} />
                                    <input type="date" className="border border-gray-300 p-3 rounded-lg" value={reminderForm.date} onChange={e => setReminderForm({ ...reminderForm, date: e.target.value })} />
                                    <div className="flex gap-2">
                                        <input type="time" className="border border-gray-300 p-3 rounded-lg w-full" value={reminderForm.time} onChange={e => setReminderForm({ ...reminderForm, time: e.target.value })} />
                                        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={reminderForm.isRecurring} onChange={e => setReminderForm({ ...reminderForm, isRecurring: e.target.checked })} />Daily</label>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <div className="text-sm text-gray-500">{reminders.length} reminders</div>
                                    <button onClick={createReminder} className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700">Add</button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-auto">
                                    {reminders.map(r => (
                                        <div key={r._id} className="border border-gray-200 rounded-lg p-3 text-sm flex justify-between">
                                            <div>
                                                <div className="font-medium text-gray-800">{r.title}</div>
                                                <div className="text-gray-600">{r.text}</div>
                                            </div>
                                            <div className="text-gray-500">{new Date(r.date).toLocaleDateString()} {r.time}</div>
                                        </div>
                                    ))}
                                    {reminders.length === 0 && <div className="text-gray-400 text-sm text-center py-4">No reminders selected</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CaretakerDashboard;