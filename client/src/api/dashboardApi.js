import axiosInstance from './axiosInstance';

export const getAdminDashboardApi = async () => {
  const response = await axiosInstance.get('/dashboard/admin');
  return response.data;
};

export const getMechanicDashboardApi = async () => {
  const response = await axiosInstance.get('/dashboard/mechanic');
  return response.data;
};

export const getClientDashboardApi = async () => {
  const response = await axiosInstance.get('/dashboard/client');
  return response.data;
};

export const getReceptionistDashboardApi = async () => {
  const response = await axiosInstance.get('/dashboard/receptionist');
  return response.data;
};