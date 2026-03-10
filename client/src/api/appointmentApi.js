import axiosInstance from './axiosInstance';

export const getAllAppointmentsApi = async () => {
  const response = await axiosInstance.get('/appointments');
  return response.data;
};

export const getMyAppointmentsApi = async () => {
  const response = await axiosInstance.get('/appointments/my-appointments');
  return response.data;
};

export const createAppointmentApi = async (data) => {
  const response = await axiosInstance.post('/appointments', data);
  return response.data;
};

export const updateAppointmentApi = async (id, data) => {
  const response = await axiosInstance.put(`/appointments/${id}`, data);
  return response.data;
};

export const updateAppointmentStatusApi = async (id, data) => {
  const response = await axiosInstance.put(`/appointments/${id}/status`, data);
  return response.data;
};

export const cancelAppointmentApi = async (id) => {
  const response = await axiosInstance.put(`/appointments/${id}/cancel`);
  return response.data;
};

export const rescheduleAppointmentApi = async (id, data) => {
  const response = await axiosInstance.put(`/appointments/${id}/reschedule`, data);
  return response.data;
};

export const assignMechanicApi = async (id, data) => {
  const response = await axiosInstance.put(`/appointments/${id}/assign-mechanic`, data);
  return response.data;
};