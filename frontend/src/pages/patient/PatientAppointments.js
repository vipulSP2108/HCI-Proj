import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { userService } from '../../services/userService';

const PatientAppointments = () => {
  const getWeekDays = (startStr) => {
    const start = new Date(startStr);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  };

  const getHeader = (dateStr) => {
    const d = new Date(dateStr);
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${fullDayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
  };

  const parseTime = (str) => {
    const [h, m] = str.split(':').map(Number);
    return h + m / 60;
  };

  const formatTime = (str) => {
    const [h, m] = str.split(':').map(Number);
    const hh = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [doctorId, setDoctorId] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevWeek = () => {
    let ws = new Date(weekStart);
    ws.setDate(ws.getDate() - 7);
    const newWeekStart = ws.toISOString().split('T')[0];
    if (new Date(newWeekStart) < new Date(today)) return;
    setWeekStart(newWeekStart);
    const newWeekDays = getWeekDays(newWeekStart);
    if (!newWeekDays.includes(selectedDate)) {
      const newSelected = newWeekDays[6];
      setSelectedDate(newSelected);
      if (doctorId) fetchSlots(doctorId, newSelected);
    }
  };

  const nextWeek = () => {
    let ws = new Date(weekStart);
    ws.setDate(ws.getDate() + 7);
    const newWeekStart = ws.toISOString().split('T')[0];
    setWeekStart(newWeekStart);
    const newWeekDays = getWeekDays(newWeekStart);
    if (!newWeekDays.includes(selectedDate)) {
      const newSelected = newWeekDays[0];
      setSelectedDate(newSelected);
      if (doctorId) fetchSlots(doctorId, newSelected);
    }
  };

  useEffect(() => {
    const loadDoctor = async () => {
      const res = await userService.getUserFullDetails();
      const id = res.user?.createdBy || res.user?.doctorId;
      if (id) {
        setDoctorId(id);
        fetchSlots(id, selectedDate);
      }
    };
    loadDoctor();
  }, []);

  useEffect(() => {
    if (doctorId) fetchSlots(doctorId, selectedDate);
  }, [selectedDate, doctorId]);

  const fetchSlots = async (docId, d) => {
    setLoading(true);
    try {
      const res = await appointmentService.getAvailability({ doctorId: docId, date: d });
      setSlots(res.availability?.slots || []);
    } finally {
      setLoading(false);
    }
  };

  const book = async (slot) => {
    if (!doctorId) return;
    await appointmentService.book({ doctorId, date: selectedDate, startTime: slot.startTime, endTime: slot.endTime });
    await fetchSlots(doctorId, selectedDate);
    setSelectedSlot(null);
    alert('Booked!');
  };

  const weekDays = getWeekDays(weekStart);
  const morningSlots = slots.filter(s => parseTime(s.startTime) < 12);
  const afternoonSlots = slots.filter(s => parseTime(s.startTime) >= 12 && parseTime(s.startTime) < 17);
  const eveningSlots = slots.filter(s => parseTime(s.startTime) >= 17);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Book Your Appointment</h1>
          <p className="text-gray-500 text-sm mt-1">Choose your preferred date and time slot below.</p>
        </div>

        {/* Week Navigation */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-800">{getHeader(selectedDate)}</h2>
          <div className="flex gap-2">
            <button
              onClick={prevWeek}
              disabled={new Date(weekStart) <= new Date(today)}
              className="px-2 py-1 rounded-md border text-gray-600 disabled:opacity-40 hover:bg-gray-100"
            >
              &lt;
            </button>
            <button
              onClick={nextWeek}
              className="px-2 py-1 rounded-md border text-gray-600 hover:bg-gray-100"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Weekday buttons */}
        <div className="flex gap-2 mb-6">
          {weekDays.map((d, idx) => {
            const isSel = d === selectedDate;
            const dayNum = new Date(d).getDate();
            return (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                disabled={new Date(d) < new Date(today)}
                className={`flex flex-col items-center justify-center flex-1 py-2 rounded-xl border text-sm transition-all
                  ${isSel ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-700 hover:bg-blue-50'}
                  disabled:opacity-40`}
              >
                <span className="text-xs">{dayNames[idx % 7]}</span>
                <span className="font-semibold">{dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="bg-gray-50 rounded-xl p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading available slots...</div>
          ) : (
            <>
              {(!morningSlots.length && !afternoonSlots.length && !eveningSlots.length) ? (
                <div className="text-gray-400 text-center py-6">No slots available</div>
              ) : (
                <>
                  {morningSlots.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Morning</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {morningSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg py-2 text-sm border transition
                              ${selectedSlot?.startTime === slot.startTime ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
                          >
                            {formatTime(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoonSlots.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Afternoon</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {afternoonSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg py-2 text-sm border transition
                              ${selectedSlot?.startTime === slot.startTime ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
                          >
                            {formatTime(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {eveningSlots.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-700 mb-2">Evening</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {eveningSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg py-2 text-sm border transition
                              ${selectedSlot?.startTime === slot.startTime ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-blue-50'}`}
                          >
                            {formatTime(slot.startTime)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSlot && (
                    <div className="mt-6">
                      <button
                        onClick={() => book(selectedSlot)}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                      >
                        Schedule Appointment at {formatTime(selectedSlot.startTime)}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAppointments;
