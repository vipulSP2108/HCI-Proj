import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';

const DoctorCaretakerManagement = () => {
  const [caretakers, setCaretakers] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedCaretaker, setSelectedCaretaker] = useState('');
  const [selectedPatient, setSelectedPatient] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await userService.getMyPatients();
        setCaretakers(res.caretakers || []);
        setPatients(res.patients || []);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const handleAssign = async () => {
    if (!selectedCaretaker || !selectedPatient) {
      return alert('Please select a caretaker and a patient.');
    }
    try {
      await userService.assignPatient({ caretakerId: selectedCaretaker, patientId: selectedPatient });
      alert('Patient assigned successfully!');
      setSelectedPatient(''); // Reset dropdown
    } catch (error) {
      alert('Assignment failed.');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Assign Patient to Caretaker</h1>
      
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select a Caretaker</label>
        <select 
          value={selectedCaretaker} 
          onChange={e => setSelectedCaretaker(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Choose Caretaker --</option>
          {caretakers.map(c => <option key={c._id} value={c._id}>{c.email}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select a Patient</label>
        <select 
          value={selectedPatient} 
          onChange={e => setSelectedPatient(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="">-- Choose Patient --</option>
          {patients.map(p => <option key={p._id} value={p._id}>{p.email}</option>)}
        </select>
      </div>

      <button 
        onClick={handleAssign}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Assign Patient
      </button>
    </div>
  );
};

export default DoctorCaretakerManagement;
