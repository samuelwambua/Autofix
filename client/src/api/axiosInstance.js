import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const auth         = JSON.parse(localStorage.getItem('autofix_auth'));
  const supplierAuth = JSON.parse(localStorage.getItem('autofix_supplier'));

  const mainToken     = auth?.state?.token;
  const supplierToken = supplierAuth?.state?.token;

  // Supplier routes ALWAYS use supplier token exclusively
  const isSupplierRoute = config.url?.startsWith('/supplier');

  let token;
  if (isSupplierRoute) {
    token = supplierToken; // never fall back to main token for supplier routes
  } else {
    token = mainToken || supplierToken;
  }

  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        if (currentPath.startsWith('/supplier')) {
          window.location.href = '/supplier/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;