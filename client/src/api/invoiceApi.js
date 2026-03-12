import axiosInstance from './axiosInstance';

export const getAllInvoicesApi = async () => {
  const response = await axiosInstance.get('/invoices');
  return response.data;
};

export const getMyInvoicesApi = async () => {
  const response = await axiosInstance.get('/invoices/my-invoices');
  return response.data;
};

export const getInvoiceByIdApi = async (id) => {
  const response = await axiosInstance.get(`/invoices/${id}`);
  return response.data;
};

export const createInvoiceApi = async (data) => {
  const response = await axiosInstance.post('/invoices', data);
  return response.data;
};

export const updateInvoiceApi = async (id, data) => {
  const response = await axiosInstance.put(`/invoices/${id}`, data);
  return response.data;
};

export const processPaymentApi = async (id, data) => {
  const response = await axiosInstance.put(`/invoices/${id}/payment`, data);
  return response.data;
};

export const deleteInvoiceApi = async (id) => {
  const response = await axiosInstance.delete(`/invoices/${id}`);
  return response.data;
};

export const getBillingSummaryApi = async () => {
  const response = await axiosInstance.get('/invoices/summary/billing');
  return response.data;
};