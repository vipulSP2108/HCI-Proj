import React, { useEffect, useMemo, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';

const fmt = (d) => d.toISOString().slice(0, 10);

const SchedulePage = () => {
  const [days, setDays] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState({ startTime: '09:00', endTime: '17:00', slotMinutes: 30 });
  const [form, setForm] = useState({ startTime: '09:00', endTime: '17:00', slotMinutes: 30 });
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arr = [];
    for (let offset = -1; offset <= 7; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      arr.push(d);
    }
    setDays(arr);

    const load = async () => {
      try {
        const avail = await appointmentService.getAvailability({ date: fmt(today) });
        const baseAvail = {
          startTime: avail.availability?.startTime || '09:00',
          endTime: avail.availability?.endTime || '17:00',
          slotMinutes: avail.availability?.slotMinutes || 30
        };
        setAvailability(baseAvail);
        setForm(baseAvail);

        const perDayAvailability = new Map();
        for (const d of arr) {
          try {
            const dayAvail = await appointmentService.getAvailability({ date: fmt(d) });
            console.log("dayAvail", dayAvail)
            perDayAvailability.set(fmt(d), dayAvail.availability?.slots || []);
          } catch (e) {
            perDayAvailability.set(fmt(d), []);
          }
        }


        const synthesized = [];
        const genSlots = (startTime, endTime, slotMinutes) => {
          const out = [];
          const [sh, sm] = (startTime || '09:00').split(':').map(Number);
          const [eh, em] = (endTime || '17:00').split(':').map(Number);
          let cur = sh * 60 + sm;
          const end = eh * 60 + em;
          while (cur + slotMinutes <= end) {
            const sH = String(Math.floor(cur / 60)).padStart(2, '0');
            const sM = String(cur % 60).padStart(2, '0');
            const eTot = cur + slotMinutes;
            const eH = String(Math.floor(eTot / 60)).padStart(2, '0');
            const eM = String(eTot % 60).padStart(2, '0');
            out.push({ startTime: `${sH}:${sM}`, endTime: `${eH}:${eM}` });
            cur += slotMinutes;
          }
          return out;
        };

        const baseSlots = genSlots(baseAvail.startTime, baseAvail.endTime, baseAvail.slotMinutes);
        for (const d of arr) {
          const key = fmt(d);
          const availSlots = new Set((perDayAvailability.get(key) || []).map(s => `${s.startTime}-${s.endTime}`));
          baseSlots.forEach(slot => {
            const slotKey = `${slot.startTime}-${slot.endTime}`;
            if (!availSlots.has(slotKey)) {
              synthesized.push({ date: d, startTime: slot.startTime, endTime: slot.endTime, patient: { email: '—' } });
            }
          });
        }
        // console.log("synthesized", synthesized)
        setAppointments(synthesized);
      } catch (e) {
        setAppointments([]);
      }
    };
    load();
  }, []);

  // console.log(appointments)

  const timeSlots = useMemo(() => {
    const out = [];
    const [sh, sm] = (availability.startTime || '09:00').split(':').map(Number);
    const [eh, em] = (availability.endTime || '17:00').split(':').map(Number);
    const step = availability.slotMinutes || 30;
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + step <= end) {
      const sH = String(Math.floor(cur / 60)).padStart(2, '0');
      const sM = String(cur % 60).padStart(2, '0');
      const eTot = cur + step;
      const eH = String(Math.floor(eTot / 60)).padStart(2, '0');
      const eM = String(eTot % 60).padStart(2, '0');
      out.push({ startTime: `${sH}:${sM}`, endTime: `${eH}:${eM}` });
      cur += step;
    }
    return out;
  }, [availability]);

  const apptKey = (d, slot) => `${fmt(d)}_${slot.startTime}-${slot.endTime}`;
  const bookedMap = useMemo(() => {
    const m = new Map();
    appointments.forEach(a => m.set(`${fmt(new Date(a.date))}_${a.startTime}-${a.endTime}`, a));
    return m;
  }, [appointments]);

  const saveAvailability = async () => {
    await appointmentService.setAvailability(form);
    setAvailability(form);
    setSaved(true);
    setShowModal(false);
    setTimeout(() => setSaved(false), 1500);
  };

  // calculate dynamic row height to fit viewport
  const rowHeight = Math.max(40, Math.floor((window.innerHeight - 120) / timeSlots.length));

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
        <div className="text-xl font-semibold">Schedule</div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Set Availability
        </button>
      </div>

      {/* Schedule Table */}
      <div className="flex-1 overflow-auto p-2">
        <div className="inline-grid min-w-full" style={{ gridTemplateColumns: `150px repeat(${days.length}, 1fr)` }}>
          {/* Header */}
          <div className="p-2 bg-gray-100 border-b border-gray-200 sticky top-0 z-10"></div>
          {days.map((d, i) => (
            <div key={i} className="p-2 bg-gray-100 border-b border-gray-200 text-sm font-semibold text-gray-700 text-center sticky top-0 z-10">
              {d.toLocaleDateString()}
            </div>
          ))}

          {/* Time Slots */}
          {timeSlots.map((slot, rIdx) => (
            <>
              <div key={`t-${rIdx}`} className="p-2 border-r border-gray-200 text-sm text-gray-600 font-medium sticky left-0 bg-gray-50 z-10" style={{ height: rowHeight }}>
                {slot.startTime} - {slot.endTime}
              </div>
              {days.map((d, cIdx) => {
                const a = bookedMap.get(apptKey(d, slot));
                return (
                  <div
                    key={`c-${rIdx}-${cIdx}`}
                    className={`p-2 border border-gray-200 text-center rounded transition-colors duration-150 
                      ${a ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100'}`}
                    style={{ height: rowHeight }}
                  >
                    {a ? (
                      <div className="text-xs flex flex-col justify-center h-full">
                        <div className="font-semibold text-red-700">Booked</div>
                        <div className="text-gray-700">{a.patient?.email || '—'}</div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-green-700 flex items-center justify-center h-full">Available</div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Modal for Availability */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <div className="flex justify-between items-center mb-4">
              <div className="text-lg font-semibold">Set Availability</div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800">&times;</button>
            </div>
            <label className="block mt-2 text-sm font-medium">Start Time</label>
            <input type="time" className="border p-2 rounded w-full" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            <label className="block mt-2 text-sm font-medium">End Time</label>
            <input type="time" className="border p-2 rounded w-full" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            <label className="block mt-2 text-sm font-medium">Slot Minutes</label>
            <input type="number" className="border p-2 rounded w-full" value={form.slotMinutes} onChange={e => setForm({ ...form, slotMinutes: Number(e.target.value) })} />
            <button onClick={saveAvailability} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded w-full">Save</button>
            {saved && <div className="text-green-600 text-sm mt-2">Saved!</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;
