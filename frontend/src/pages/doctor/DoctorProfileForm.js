import React, { useState, useEffect } from 'react';
// Assuming 'api' is correctly configured in this relative path
import api from '../../services/api'; 
import { Loader2 } from 'lucide-react'; // Import a spinner icon

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
  const [success, setSuccess] = useState(''); // Added for success messages

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  async function fetchProfileDetails() {
    try {
      const res = await api.get('/users/get-user-details');
      if (res.data.success) {
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
    setSuccess('');
    try {
      const res = await api.put('/users/user-details', formData);
      if (res.data.success) {
        // Use a state for success message instead of alert
        setSuccess('Profile updated successfully.'); 
      } else {
        setError('Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="ml-4 text-lg text-gray-600">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Manage Your Profile
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Doctor Name */}
          <div>
            <label htmlFor="name" className="block mb-2 font-semibold text-gray-700">
              Doctor Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Doctor Degree */}
          <div>
            <label htmlFor="degree" className="block mb-2 font-semibold text-gray-700">
              Doctor Degree
            </label>
            <input
              type="text"
              id="degree"
              name="degree"
              value={formData.degree}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Doctor Phone */}
          <div>
            <label htmlFor="phone" className="block mb-2 font-semibold text-gray-700">
              Doctor Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Doctor Email */}
          <div>
            <label htmlFor="email" className="block mb-2 font-semibold text-gray-700">
              Doctor Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DoctorProfileForm;