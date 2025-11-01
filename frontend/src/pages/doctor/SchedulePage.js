import React, { useEffect, useMemo, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';

const fmt = (d) => d.toISOString().slice(0,10);

const SchedulePage = () => {
  const [days, setDays] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState({ startTime: '09:00', endTime: '17:00', slotMinutes: 30 });

  useEffect(() => {
    // build day range: -1, 0, +7 (9 days)
    const today = new Date(); today.setHours(0,0,0,0);
    const arr = [];
    for (let offset = -1; offset <= 7; offset++) {
      const d = new Date(today); d.setDate(today.getDate() + offset);
      arr.push(d);
    }
    setDays(arr);

    const load = async () => {
      try {
        // fetch availability for today to get slotMinutes and time window
        const avail = await appointmentService.getAvailability({ date: fmt(today) });
        const baseAvail = {
          startTime: avail.availability?.startTime || '09:00',
          endTime: avail.availability?.endTime || '17:00',
          slotMinutes: avail.availability?.slotMinutes || 30
        };
        setAvailability(baseAvail);

        // Build booked map indirectly by checking per-day available slots
        // Any slot in the time grid that's NOT in available list is treated as booked
        const perDayAvailability = new Map();
        for (const d of arr) {
          try {
            const dayAvail = await appointmentService.getAvailability({ date: fmt(d) });
            perDayAvailability.set(fmt(d), dayAvail.availability?.slots || []);
          } catch (e) {
            perDayAvailability.set(fmt(d), []);
          }
        }

        // Construct fake appointments for display convenience
        const synthesized = [];
        // compute time slots based on baseAvail
        const genSlots = (startTime, endTime, slotMinutes) => {
          const out = [];
          const [sh, sm] = (startTime||'09:00').split(':').map(Number);
          const [eh, em] = (endTime||'17:00').split(':').map(Number);
          let cur = sh*60+sm; const end = eh*60+em;
          while (cur + slotMinutes <= end) {
            const sH = String(Math.floor(cur/60)).padStart(2,'0');
            const sM = String(cur%60).padStart(2,'0');
            const eTot = cur + slotMinutes;
            const eH = String(Math.floor(eTot/60)).padStart(2,'0');
            const eM = String(eTot%60).padStart(2,'0');
            out.push({ startTime: `${sH}:${sM}`, endTime: `${eH}:${eM}` });
            cur += slotMinutes;
          }
          return out;
        };
        const baseSlots = genSlots(baseAvail.startTime, baseAvail.endTime, baseAvail.slotMinutes);
        for (const d of arr) {
          const key = fmt(d);
          const availSlots = new Set((perDayAvailability.get(key) || []).map(s=>`${s.startTime}-${s.endTime}`));
          baseSlots.forEach(slot => {
            const slotKey = `${slot.startTime}-${slot.endTime}`;
            if (!availSlots.has(slotKey)) {
              // synthesize a booked item (patient unknown)
              synthesized.push({ date: d, startTime: slot.startTime, endTime: slot.endTime, patient: { email: '—' } });
            }
          });
        }
        setAppointments(synthesized);
      } catch (e) {
        // fail soft
        setAppointments([]);
      }
    };
    load();
  }, []);

  const timeSlots = useMemo(() => {
    const out = [];
    const [sh, sm] = (availability.startTime||'09:00').split(':').map(Number);
    const [eh, em] = (availability.endTime||'17:00').split(':').map(Number);
    const step = availability.slotMinutes || 30;
    let cur = sh*60+sm;
    const end = eh*60+em;
    while (cur + step <= end) {
      const sH = String(Math.floor(cur/60)).padStart(2,'0');
      const sM = String(cur%60).padStart(2,'0');
      const eTot = cur + step;
      const eH = String(Math.floor(eTot/60)).padStart(2,'0');
      const eM = String(eTot%60).padStart(2,'0');
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

  return (
    <div className="p-4 max-w-full overflow-auto">
      <div className="text-2xl font-semibold mb-3">Schedule (−1 day, today, next 7 days)</div>
      <div className="min-w-[900px] border rounded">
        <div className="grid" style={{ gridTemplateColumns: `150px repeat(${days.length}, 1fr)` }}>
          <div className="p-2 bg-gray-50 border-b"></div>
          {days.map((d,i)=>(
            <div key={i} className="p-2 bg-gray-50 border-b text-sm font-medium">
              {d.toLocaleDateString()}
            </div>
          ))}
          {timeSlots.map((slot, rIdx)=>(
            <>
              <div key={`t-${rIdx}`} className="p-2 border-r text-sm text-gray-600">
                {slot.startTime} - {slot.endTime}
              </div>
              {days.map((d,cIdx)=>{
                const a = bookedMap.get(apptKey(d, slot));
                return (
                  <div key={`c-${rIdx}-${cIdx}`} className={`p-2 border ${a? 'bg-red-50' : 'bg-green-50'}`}>
                    {a ? (
                      <div className="text-xs">
                        <div className="font-semibold text-red-700">Booked</div>
                        <div className="text-gray-700">{a.patient?.email || '—'}</div>
                      </div>
                    ) : (
                      <div className="text-xs text-green-700">Available</div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;