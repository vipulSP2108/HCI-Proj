import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function DoctorProfileForm() {
  const [formData, setFormData] = useState({
    degree: '',
    name: '',
    phone: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  async function fetchProfileDetails() {
    try {
      const res = await api.get('/users/get-user-details');
      console.log(res);
      
      if (res.data.success) {
        // Ensure all fields are present, fallback to empty string
        setFormData({
          degree: res.data.doctor.degree || '',
          name: res.data.doctor.name || '',
          phone: res.data.doctor.phone || '',
          email: res.data.doctor.email || '',
        });
      } else {
        setError('Failed to load doctor details.');
      }
    } catch (err) {
      setError('Failed to load doctor details.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.put('/users/user-details', formData);
      if (res.data.success) {
        alert('Profile updated successfully.');
      } else {
        setError('Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-6 rounded shadow space-y-4">
      {error && <p className="text-red-600">{error}</p>}

      <div>
        <label className="block mb-1 font-semibold">Doctor Degree</label>
        <input
          type="text"
          name="degree"
          value={formData.degree}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Doctor Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Doctor Phone</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <div>
        <label className="block mb-1 font-semibold">Doctor Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}

export default DoctorProfileForm;
