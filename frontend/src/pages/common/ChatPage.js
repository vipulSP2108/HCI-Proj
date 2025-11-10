import React, { useEffect, useState, useRef } from "react";
import { Search, Send, MoreVertical, UserPlus } from "lucide-react";
import { Dialog } from "@headlessui/react";
import { chatService } from "../../services/chatService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState(
    user?.type === "doctor"
      ? "doctor-patient"
      : user?.type === "caretaker"
      ? "caretaker-patient"
      : "doctor-patient"
  );
  const [participants, setParticipants] = useState([]);
  const [patientList, setPatientList] = useState([]);
  const [caretakerList, setCaretakerList] = useState([]);
  const messagesEndRef = useRef(null);

  // Scroll to last message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat]);

  useEffect(() => {
    loadChats();
  }, []);

  // Load chats and participants
  const loadChats = async () => {
    try {
      const res = await chatService.listMyChats();
      setChats(res.chats || []);

      if (user?.type === "doctor") {
        const my = await userService.getMyPatients();
        setPatientList(my.patients || []);
        setCaretakerList(my.caretakers || []);
      } else if (user?.type === "caretaker") {
        const list = await userService.getCaretakerPatients();
        setPatientList(list.patients || []);
      } else if (user?.type === "patient") {
        const res2 = await userService.getUserFullDetails();
        const doctorId = res2.user?.createdBy;
        if (doctorId) setParticipants([doctorId]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openChat = async (chat) => {
    setSelectedChat(chat);
    const res = await chatService.getMessages(chat._id);
    setMessages(res.messages || []);
  };

  const sendMessage = async () => {
    if (!selectedChat || !message.trim()) return;
    try {
      const res = await chatService.sendMessage(selectedChat._id, message.trim());
      setMessages(res.chat.messages || []);
      setMessage("");
    } catch (e) {
      console.error(e);
    }
  };

  const ensureChat = async () => {
    const ids = participants.filter(Boolean);
    if (ids.length === 0) return;
    try {
      const res = await chatService.ensureChat(ids, type);
      await loadChats();
      openChat(res.chat);
      setIsModalOpen(false);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create/open chat");
    }
  };

  // Modal Form
  const renderModal = () => (
    <Dialog
      open={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      className="fixed z-10 inset-0 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
          <Dialog.Title className="text-lg font-bold text-center text-blue-600">
            Start a New Chat
          </Dialog.Title>

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border p-2 rounded text-sm"
          >
            {user?.type === "doctor" && (
              <>
                <option value="doctor-patient">doctor-patient</option>
                <option value="doctor-caretaker">doctor-caretaker</option>
              </>
            )}
            {user?.type === "caretaker" && (
              <option value="caretaker-patient">caretaker-patient</option>
            )}
            {user?.type === "patient" && (
              <>
                <option value="doctor-patient">doctor-patient</option>
                <option value="caretaker-patient">caretaker-patient</option>
              </>
            )}
          </select>

          {user?.type === "doctor" && (
            <>
              <select
                className="w-full border p-2 rounded text-sm"
                onChange={(e) => setParticipants([e.target.value])}
              >
                <option value="">Select patient</option>
                {patientList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.email}
                  </option>
                ))}
              </select>
              {type === "doctor-caretaker" && (
                <select
                  className="w-full border p-2 rounded text-sm"
                  onChange={(e) => setParticipants([e.target.value])}
                >
                  <option value="">Select caretaker</option>
                  {caretakerList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.email}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {user?.type === "caretaker" && (
            <select
              className="w-full border p-2 rounded text-sm"
              onChange={(e) => setParticipants([e.target.value])}
            >
              <option value="">Select patient</option>
              {patientList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.email}
                </option>
              ))}
            </select>
          )}

          {user?.type === "patient" && (
            <input
              placeholder="Enter user ID (doctor/caretaker)"
              className="w-full border p-2 rounded text-sm"
              onChange={(e) => setParticipants([e.target.value])}
            />
          )}

          <button
            onClick={ensureChat}
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Create/Open Chat
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );

  const formatTime = (timestamp) => {
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diff = now - msgTime;
    const oneDay = 24 * 60 * 60 * 1000;
    if (diff < 60000) return "Now";
    if (diff < oneDay)
      return msgTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 2 * oneDay) return "Yesterday";
    return msgTime.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  const filteredChats = chats.filter((chat) =>
    chat.participants
      .map((p) => p.email || p.name || "")
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-white text-gray-900">
      {/* Sidebar */}
      <div className="w-1/3 max-w-sm border-r border-gray-200 bg-white shadow-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="font-bold text-lg text-blue-600">Chats</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="p-2 rounded-full hover:bg-blue-100 transition"
            title="Add new user"
          >
            <UserPlus className="text-blue-500" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length > 0 ? (
            filteredChats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => openChat(chat)}
                className={`flex items-center justify-between p-4 cursor-pointer transition-all ${
                  selectedChat?._id === chat._id
                    ? "bg-blue-100 border-l-4 border-blue-500"
                    : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {chat.participants
                      .map((p) => p.email || p.name || "Unknown")
                      .join(", ")}
                  </h3>
                  <p className="text-sm text-gray-500 truncate w-48">
                    {chat.messages?.slice(-1)[0]?.text || "No messages yet"}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {formatTime(chat.updatedAt)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center mt-8">No chats found</p>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {selectedChat.participants
                    .map((p) => p.email || p.name || "Unknown")
                    .join(", ")}
                </h2>
                <p className="text-sm text-gray-500">{selectedChat.type}</p>
              </div>
              <MoreVertical className="text-gray-400" />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-b from-blue-50 to-white">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex mb-3 ${
                    msg.sender?._id === user?.id || msg.sender === user?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-2xl text-sm shadow-md ${
                      msg.sender?._id === user?.id || msg.sender === user?.id
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                    <div className="text-[10px] mt-1 opacity-70 text-right">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t bg-white shadow-md">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-400 outline-none"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a chat or add a user to start messaging
          </div>
        )}
      </div>

      {isModalOpen && renderModal()}
    </div>
  );
};

export default ChatPage;
