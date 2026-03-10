import axiosInstance from './axiosInstance';

export const getAllClientsApi = async () => {
  const response = await axiosInstance.get('/clients');
  return response.data;
};

export const getClientByIdApi = async (id) => {
  const response = await axiosInstance.get(`/clients/${id}`);
  return response.data;
};

export const deactivateClientApi = async (id) => {
  const response = await axiosInstance.put(`/clients/${id}/deactivate`);
  return response.data;
};