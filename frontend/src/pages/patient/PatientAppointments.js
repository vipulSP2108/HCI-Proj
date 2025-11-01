import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { userService } from '../../services/userService';

const PatientAppointments = () => {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [doctorId, setDoctorId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadDoctor = async () => {
      const res = await userService.getUserFullDetails();
      const id = res.user?.createdBy || res.user?.doctorId; // fallback
      if (id) {
        setDoctorId(id);
        fetchSlots(id, date);
      }
    };
    loadDoctor();
  }, []);

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
    await appointmentService.book({ doctorId, date, startTime: slot.startTime, endTime: slot.endTime });
    await fetchSlots(doctorId, date);
    alert('Booked!');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3">
      <div className="text-xl font-semibold">Book Appointment</div>
      <div className="flex gap-2 items-center">
        <label>Date</label>
        <input type="date" value={date} onChange={e=>{ setDate(e.target.value); if(doctorId) fetchSlots(doctorId, e.target.value); }} className="border p-2 rounded" />
      </div>
      {loading ? (<div>Loading...</div>) : (
        <div className="grid grid-cols-2 gap-2">
          {slots.map((s,i)=> (
            <button key={i} onClick={()=>book(s)} className="border p-3 rounded hover:bg-blue-50 text-left">
              {s.startTime} - {s.endTime}
            </button>
          ))}
          {slots.length===0 && <div className="text-gray-500">No slots available</div>}
        </div>
      )}
    </div>
  );
};

export default PatientAppointments;
