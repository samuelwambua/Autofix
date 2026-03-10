import axiosInstance from './axiosInstance';

export const getAllStaffApi = async () => {
  const response = await axiosInstance.get('/staff');
  return response.data;
};

export const getStaffByIdApi = async (id) => {
  const response = await axiosInstance.get(`/staff/${id}`);
  return response.data;
};

export const createStaffApi = async (data) => {
  const response = await axiosInstance.post('/auth/register/staff', data);
  return response.data;
};

export const updateStaffApi = async (id, data) => {
  const response = await axiosInstance.put(`/staff/${id}`, data);
  return response.data;
};

export const toggleStaffStatusApi = async (id) => {
  const response = await axiosInstance.put(`/staff/${id}/toggle-status`);
  return response.data;
};

export const deleteStaffApi = async (id) => {
  const response = await axiosInstance.delete(`/staff/${id}`);
  return response.data;
};

export const getMechanicsApi = async () => {
  const response = await axiosInstance.get('/staff/mechanics');
  return response.data;
};