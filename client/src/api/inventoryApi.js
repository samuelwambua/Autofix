import axiosInstance from './axiosInstance';

export const getAllInventoryApi = async () => {
  const response = await axiosInstance.get('/inventory');
  return response.data;
};

export const getInventoryByIdApi = async (id) => {
  const response = await axiosInstance.get(`/inventory/${id}`);
  return response.data;
};

export const createInventoryItemApi = async (data) => {
  const response = await axiosInstance.post('/inventory', data);
  return response.data;
};

export const updateInventoryItemApi = async (id, data) => {
  const response = await axiosInstance.put(`/inventory/${id}`, data);
  return response.data;
};

export const deleteInventoryItemApi = async (id) => {
  const response = await axiosInstance.delete(`/inventory/${id}`);
  return response.data;
};

export const restockInventoryApi = async (id, data) => {
  const response = await axiosInstance.put(`/inventory/${id}/restock`, data);
  return response.data;
};

export const getLowStockApi = async () => {
  const response = await axiosInstance.get('/inventory/low-stock');
  return response.data;
};

export const getInventorySummaryApi = async () => {
  const response = await axiosInstance.get('/inventory/summary');
  return response.data;
};