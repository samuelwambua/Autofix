import axios from 'axios';

const supplierAxios = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Always use supplier token
supplierAxios.interceptors.request.use((config) => {
  const auth  = JSON.parse(localStorage.getItem('autofix_supplier'));
  const token = auth?.state?.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

supplierAxios.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export default supplierAxios;