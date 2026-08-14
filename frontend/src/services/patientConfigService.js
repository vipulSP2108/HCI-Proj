import api from './api';

export const patientConfigService = {
  // Fetch patient configuration
  getConfig: async (patientId) => {
    try {
      const response = await api.get(`/patient-config/${patientId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient config:', error);
      throw error;
    }
  },

  // Update specific patient configuration
  updateConfig: async (patientId, updates) => {
    try {
      const response = await api.put(`/patient-config/${patientId}`, { updates });
      return response.data;
    } catch (error) {
      console.error('Error updating patient config:', error);
      throw error;
    }
  }
};
