import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useSupplierStore = create(
  persist(
    (set) => ({
      supplier:        null,
      token:           null,
      isAuthenticated: false,

      loginSupplier: (supplier, token) => set({
        supplier, token, isAuthenticated: true,
      }),

      logoutSupplier: () => set({
        supplier: null, token: null, isAuthenticated: false,
      }),

      updateSupplier: (updates) => set((state) => ({
        supplier: { ...state.supplier, ...updates },
      })),
    }),
    { name: 'autofix_supplier' }
  )
);

export default useSupplierStore;