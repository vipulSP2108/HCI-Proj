import api from './api';

export const userService = {
  createUser: async (userData) => (await api.post('/users/create', userData)).data,
  getMyPatients: async () => (await api.get('/users/my-patients')).data,
  getUserDetails: async (userId) => (await api.get(`/users/${userId}`)).data
};