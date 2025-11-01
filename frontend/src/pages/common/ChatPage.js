import React, { useEffect, useState } from 'react';
import { chatService } from '../../services/chatService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [type, setType] = useState(user?.type === 'doctor' ? 'doctor-patient' : user?.type === 'caretaker' ? 'caretaker-patient' : 'doctor-patient');
  const [patientList, setPatientList] = useState([]);
  const [caretakerList, setCaretakerList] = useState([]);

  useEffect(() => {
    load();
  }, []);

  // When type changes for patient, default to doctor if available
  useEffect(() => {
    if (user?.type === 'patient') {
      (async () => {
        try {
          const res = await userService.getUserFullDetails();
          const doctorId = res.user?.createdBy;
          if (type === 'doctor-patient' && doctorId) setParticipants([doctorId]);
          if (type === 'caretaker-patient') setParticipants([]); // user must choose caretaker id manually (or later enhancement)
        } catch (e) {}
      })();
    }
  }, [type, user?.type]);

  const load = async () => {
    const res = await chatService.listMyChats();
    setChats(res.chats || []);
    // preload lists based on role
    try {
      if (user?.type === 'doctor') {
        const my = await userService.getMyPatients();
        setPatientList(my.patients || []);
        setCaretakerList(my.caretakers || []);
      } else if (user?.type === 'caretaker') {
        const list = await userService.getCaretakerPatients();
        setPatientList(list.patients || []);
      } else if (user?.type === 'patient') {
        const res2 = await userService.getUserFullDetails();
        const doctorId = res2.user?.createdBy;
        if (doctorId) setParticipants([doctorId]);
      }
    } catch (e) { console.error(e); }
  };

  const openChat = async (chat) => {
    setActiveChat(chat);
    const res = await chatService.getMessages(chat._id);
    setMessages(res.messages || []);
  };

  const send = async () => {
    if (!activeChat || !text.trim()) return;
    const res = await chatService.sendMessage(activeChat._id, text.trim());
    setText('');
    setMessages(res.chat.messages || []);
  };

  const ensure = async () => {
    const ids = participants.filter(Boolean);
    if (ids.length === 0) return;
    const res = await chatService.ensureChat(ids, type);
    await load();
    openChat(res.chat);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 border rounded-lg">
        <div className="p-3 border-b font-semibold">Conversations</div>
        <div className="p-3 space-y-2 max-h-[70vh] overflow-auto">
          {chats.map(c => (
            <button key={c._id} onClick={() => openChat(c)} className={`w-full text-left p-2 rounded ${activeChat?._id===c._id?'bg-blue-100':'hover:bg-gray-50'}`}>
              <div className="text-sm text-gray-500">{c.type}</div>
              <div className="text-sm">{c.participants.map(p=>p.email||p).join(', ')}</div>
            </button>
          ))}
          {chats.length===0 && <div className="text-sm text-gray-500">No chats yet.</div>}
        </div>
        <div className="p-3 border-t space-y-2">
          <div className="font-semibold text-sm">Start new chat</div>
          {/* Type selection limited by role */}
          <select value={type} onChange={e=>setType(e.target.value)} className="w-full border p-2 rounded text-sm">
            {user?.type === 'doctor' && (<>
              <option value="doctor-patient">doctor-patient</option>
              <option value="doctor-caretaker">doctor-caretaker</option>
            </>)}
            {user?.type === 'caretaker' && (
              <option value="caretaker-patient">caretaker-patient</option>
            )}
            {user?.type === 'patient' && (<>
              <option value="doctor-patient">doctor-patient</option>
              <option value="caretaker-patient">caretaker-patient</option>
            </>)}
          </select>

          {/* Participant selectors */}
          {user?.type === 'doctor' && (
            <>
              <select className="w-full border p-2 rounded text-sm" onChange={e=>setParticipants([e.target.value])}>
                <option value="">Select patient</option>
                {patientList.map(p=>(<option key={p._id} value={p._id}>{p.email}</option>))}
              </select>
              {type === 'doctor-caretaker' && (
                <select className="w-full border p-2 rounded text-sm" onChange={e=>setParticipants([e.target.value])}>
                  <option value="">Select caretaker</option>
                  {caretakerList.map(c=>(<option key={c._id} value={c._id}>{c.email}</option>))}
                </select>
              )}
            </>
          )}

          {user?.type === 'caretaker' && (
            <select className="w-full border p-2 rounded text-sm" onChange={e=>setParticipants([e.target.value])}>
              <option value="">Select patient</option>
              {patientList.map(p=>(<option key={p._id} value={p._id}>{p.email}</option>))}
            </select>
          )}

          {user?.type === 'patient' && (
            <input placeholder="Enter participant userId (doctor/caretaker)" className="w-full border p-2 rounded text-sm" onChange={e=>setParticipants([e.target.value])} />
          )}

          <button onClick={async()=>{
            try {
              await ensure();
            } catch (e) {
              alert(e?.response?.data?.message || 'Failed to create/open chat');
            }
          }} className="w-full bg-blue-600 text-white p-2 rounded text-sm">Create/Open</button>
        </div>
      </div>

      <div className="md:col-span-2 border rounded-lg flex flex-col">
        <div className="p-3 border-b font-semibold">{activeChat ? 'Chat' : 'Select a conversation'}</div>
        <div className="flex-1 p-3 space-y-2 overflow-auto">
          {messages.map((m, idx) => (
            <div key={idx} className={`max-w-[70%] rounded px-3 py-2 ${m.sender?._id===user?.id||m.sender===user?.id ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-100'}`}>
              <div className="text-xs opacity-70">{m.sender?.email||''}</div>
              <div>{m.text}</div>
            </div>
          ))}
          {activeChat && messages.length===0 && <div className="text-sm text-gray-500">No messages.</div>}
        </div>
        {activeChat && (
          <div className="p-3 border-t flex gap-2">
            <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" className="flex-1 border p-2 rounded" />
            <button onClick={send} className="bg-blue-600 text-white px-4 rounded">Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;