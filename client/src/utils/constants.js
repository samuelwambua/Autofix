export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  MECHANIC: 'mechanic',
  RECEPTIONIST: 'receptionist',
  CLIENT: 'client',
};

export const JOB_STATUSES = {
  RECEIVED: 'received',
  DIAGNOSING: 'diagnosing',
  AWAITING_PARTS: 'awaiting_parts',
  IN_PROGRESS: 'in_progress',
  QUALITY_CHECK: 'quality_check',
  COMPLETED: 'completed',
};

export const APPOINTMENT_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const INVOICE_STATUSES = {
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
};

export const PAYMENT_METHODS = {
  CASH: 'cash',
  MPESA: 'mpesa',
  CARD: 'card',
  INVOICE_CREDIT: 'invoice_credit',
};