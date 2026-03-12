import axiosInstance from './axiosInstance';

export const getAllJobCardsApi = async () => {
  const response = await axiosInstance.get('/job-cards');
  return response.data;
};

export const getMyJobsApi = async () => {
  const response = await axiosInstance.get('/job-cards/my-jobs');
  return response.data;
};

export const getJobCardByIdApi = async (id) => {
  const response = await axiosInstance.get(`/job-cards/${id}`);
  return response.data;
};

export const createJobCardApi = async (data) => {
  const response = await axiosInstance.post('/job-cards', data);
  return response.data;
};

export const updateJobCardApi = async (id, data) => {
  const response = await axiosInstance.put(`/job-cards/${id}`, data);
  return response.data;
};

export const updateJobCardStatusApi = async (id, data) => {
  const response = await axiosInstance.put(`/job-cards/${id}/status`, data);
  return response.data;
};

export const deleteJobCardApi = async (id) => {
  const response = await axiosInstance.delete(`/job-cards/${id}`);
  return response.data;
};

export const assignMechanicToJobApi = async (id, data) => {
  const response = await axiosInstance.post(`/job-cards/${id}/assign-mechanic`, data);
  return response.data;
};

export const getJobMechanicsApi = async (id) => {
  const response = await axiosInstance.get(`/job-cards/${id}/mechanics`);
  return response.data;
};

export const removeMechanicFromJobApi = async (jobId, mechanicId) => {
  const response = await axiosInstance.delete(`/job-cards/${jobId}/mechanics/${mechanicId}`);
  return response.data;
};

export const addPartsToJobApi = async (id, data) => {
  const response = await axiosInstance.post(`/job-cards/${id}/parts`, data);
  return response.data;
};