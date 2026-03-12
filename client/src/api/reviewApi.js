import axiosInstance from './axiosInstance';

export const getAllReviewsApi = async () => {
  const response = await axiosInstance.get('/reviews');
  return response.data;
};

export const getMyReviewsApi = async () => {
  const response = await axiosInstance.get('/reviews/my-reviews');
  return response.data;
};

export const getReviewSummaryApi = async () => {
  const response = await axiosInstance.get('/reviews/summary');
  return response.data;
};

export const createReviewApi = async (data) => {
  const response = await axiosInstance.post('/reviews', data);
  return response.data;
};

export const updateReviewApi = async (id, data) => {
  const response = await axiosInstance.put(`/reviews/${id}`, data);
  return response.data;
};

export const deleteReviewApi = async (id) => {
  const response = await axiosInstance.delete(`/reviews/${id}`);
  return response.data;
};