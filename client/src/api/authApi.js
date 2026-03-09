import axiosInstance from './axiosInstance';

export const loginApi = async (credentials) => {
  const response = await axiosInstance.post('/auth/login', credentials);
  return response.data;
};

export const registerClientApi = async (data) => {
  const response = await axiosInstance.post('/auth/register/client', data);
  return response.data;
};

export const getMeApi = async () => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};