import axiosInstance from './axiosInstance';

export const getAllVehiclesApi = async () => {
  const response = await axiosInstance.get('/vehicles');
  return response.data;
};

export const getVehicleByIdApi = async (id) => {
  const response = await axiosInstance.get(`/vehicles/${id}`);
  return response.data;
};

export const createVehicleApi = async (data) => {
  const response = await axiosInstance.post('/vehicles', data);
  return response.data;
};

export const updateVehicleApi = async (id, data) => {
  const response = await axiosInstance.put(`/vehicles/${id}`, data);
  return response.data;
};

export const deleteVehicleApi = async (id) => {
  const response = await axiosInstance.delete(`/vehicles/${id}`);
  return response.data;
};

export const getClientVehiclesApi = async (clientId) => {
  const response = await axiosInstance.get(`/vehicles/client/${clientId}`);
  return response.data;
};