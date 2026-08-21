import {
  AuthTokens, User,
  PrescriptionUploadResponse, PrescriptionStatusResponse, PrescriptionDetail,
  PrescriptionListResponse, FieldEditResponse,
  MedicineSearchResponse, MedicineDetail,
  CartCreateResponse, CartItemAddResponse, CartDetail,
  OrderCreateResponse, OrderSummary, OrderDetail, OrderListResponse, OrderCancelResponse,
  VerificationQueueResponse, VerificationActionResponse,
  PaymentOrderCreateResponse, PaymentCaptureResponse,
  NotificationListResponse, UnreadCountResponse,
  PartnerPharmacyListResponse, DisputeListResponse, OverdueVerificationResponse,
  DashboardSummary,
  DoctorKYCListResponse, DoctorKYCVerifyResponse, AccountActionResponse,
  AdminCreateResponse, AdminRevokeResponse,
  PlatformSettingsResponse, PlatformSettingsUpdateResponse,
  AuditLogQueryResponse, ComplianceOverrideResponse,
  ReportDetail,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const isMultipart = options.body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isMultipart) headers['Content-Type'] = 'application/json';
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ipmd_access_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const e = await res.json(); detail = e.detail || detail; } catch {}
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

function qs(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) sp.set(k, String(v)); });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function idempotencyKey(): string {
  return `ipmd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const ApiClient = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest<AuthTokens>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (payload: Record<string, unknown>) =>
    apiRequest<User>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyEmail: (email: string) =>
    apiRequest<User>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email }) }),
  getMe: () => apiRequest<User>('/users/me'),

  // Prescriptions
  uploadPrescription: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('document_type', 'prescription');
    return apiRequest<PrescriptionUploadResponse>('/prescriptions/upload', { method: 'POST', body: fd });
  },
  getPrescriptionStatus: (id: string) =>
    apiRequest<PrescriptionStatusResponse>(`/prescriptions/${id}/status`),
  getPrescriptionDetail: (id: string) =>
    apiRequest<PrescriptionDetail>(`/prescriptions/${id}`),
  listPrescriptions: (params?: Record<string, string | number>) =>
    apiRequest<PrescriptionListResponse>(`/prescriptions${qs(params)}`),
  editExtractedField: (rxId: string, fieldId: string, value: string, reason?: string) =>
    apiRequest<FieldEditResponse>(`/prescriptions/${rxId}/fields/${fieldId}`, {
      method: 'PATCH', body: JSON.stringify({ value, reason }),
    }),

  // Reports
  uploadReport: (file: File, reportType?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (reportType) fd.append('report_type', reportType);
    return apiRequest<{ report_id: string; document_id: string; status: string }>('/reports/upload', { method: 'POST', body: fd });
  },
  getReportDetail: (id: string) => apiRequest<ReportDetail>(`/reports/${id}`),

  // Verification (Doctor)
  getVerificationQueue: (params?: Record<string, string | number>) =>
    apiRequest<VerificationQueueResponse>(`/verification/queue${qs(params)}`),
  approvePrescription: (id: string, notes?: string) =>
    apiRequest<VerificationActionResponse>(`/verification/${id}/approve`, {
      method: 'POST', body: JSON.stringify({ notes: notes || null }),
    }),
  rejectPrescription: (id: string, reason: string) =>
    apiRequest<VerificationActionResponse>(`/verification/${id}/reject`, {
      method: 'POST', body: JSON.stringify({ reason }),
    }),
  getVerificationAuditLog: (id: string) =>
    apiRequest<{ data: Array<{ actor_id?: string; actor_role: string; action_type: string; timestamp: string; justification?: string }> }>(`/verification/${id}/audit-log`),

  // Catalog
  searchMedicines: (params?: Record<string, string | number>) =>
    apiRequest<MedicineSearchResponse>(`/catalog/medicines${qs(params)}`),
  getMedicineDetail: (id: string) =>
    apiRequest<MedicineDetail>(`/catalog/medicines/${id}`),
  matchPrescription: (prescriptionId: string) =>
    apiRequest<{ prescription_id: string; matches: Array<{ field_id: string; field_name: string; extracted_value: string; medicine_id?: string; medicine_name?: string; match_type: string; confidence_score: number; auto_addable: boolean }> }>('/catalog/match', {
      method: 'POST', body: JSON.stringify({ prescription_id: prescriptionId }),
    }),

  // Cart
  createCart: () =>
    apiRequest<CartCreateResponse>('/cart', { method: 'POST', body: '{}' }),
  addCartItem: (cartId: string, medicineId: string, quantity: number, prescriptionId?: string) =>
    apiRequest<CartItemAddResponse>(`/cart/${cartId}/items`, {
      method: 'POST', body: JSON.stringify({ medicine_id: medicineId, quantity, prescription_id: prescriptionId || null }),
    }),
  getCart: (cartId: string) =>
    apiRequest<CartDetail>(`/cart/${cartId}`),

  // Orders
  createOrder: (cartId: string, deliveryAddressId: string) =>
    apiRequest<OrderCreateResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify({ cart_id: cartId, delivery_address_id: deliveryAddressId }),
      headers: { 'Idempotency-Key': idempotencyKey() },
    }),
  getOrder: (id: string) => apiRequest<OrderDetail>(`/orders/${id}`),
  listOrders: (params?: Record<string, string | number>) =>
    apiRequest<OrderListResponse>(`/orders${qs(params)}`),
  cancelOrder: (id: string, reason?: string) =>
    apiRequest<OrderCancelResponse>(`/orders/${id}/cancel`, {
      method: 'POST', body: JSON.stringify({ reason: reason || null }),
    }),
  flagDispute: (orderId: string, disputeType: string) =>
    apiRequest<{ dispute_id: string; order_id: string; dispute_type: string; flagged_at: string }>(
      `/orders/${orderId}/disputes`, { method: 'POST', body: JSON.stringify({ dispute_type: disputeType }) },
    ),

  // Payments
  createPaymentOrder: (orderId: string, amountPaise: number) =>
    apiRequest<PaymentOrderCreateResponse>('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, amount: amountPaise }),
      headers: { 'Idempotency-Key': idempotencyKey() },
    }),
  capturePayment: (paymentIntentId: string, razorpayPaymentId: string, razorpaySignature: string) =>
    apiRequest<PaymentCaptureResponse>('/payments/capture', {
      method: 'POST',
      body: JSON.stringify({ payment_intent_id: paymentIntentId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature }),
    }),

  // Notifications
  listNotifications: (params?: Record<string, string | number>) =>
    apiRequest<NotificationListResponse>(`/notifications${qs(params)}`),
  getUnreadCount: () => apiRequest<UnreadCountResponse>('/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    apiRequest<{ notification_id: string; is_read: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Admin
  getAdminDashboardSummary: () =>
    apiRequest<DashboardSummary>('/admin/dashboard/summary'),
  listPartnerPharmacies: (params?: Record<string, string | number>) =>
    apiRequest<PartnerPharmacyListResponse>(`/admin/partner-pharmacies${qs(params)}`),
  createPartnerPharmacy: (data: Record<string, unknown>) =>
    apiRequest<{ partner_id: string; name: string; status: string }>('/admin/partner-pharmacies', {
      method: 'POST', body: JSON.stringify(data),
    }),
  updatePartnerPharmacy: (id: string, data: Record<string, unknown>) =>
    apiRequest<{ partner_id: string; name: string; status: string }>(`/admin/partner-pharmacies/${id}`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  listDisputes: (params?: Record<string, string | number>) =>
    apiRequest<DisputeListResponse>(`/admin/orders/disputes${qs(params)}`),
  resolveDispute: (id: string, resolution: string) =>
    apiRequest<{ dispute_id: string; resolution: string }>(`/admin/orders/disputes/${id}/resolve`, {
      method: 'POST', body: JSON.stringify({ resolution }),
    }),
  listOverdueVerifications: () =>
    apiRequest<OverdueVerificationResponse>('/admin/verification-queue/overdue'),

  // User Admin
  listPendingKYC: () => apiRequest<DoctorKYCListResponse>('/user-admin/doctors/pending-kyc'),
  verifyDoctorLicense: (doctorId: string, decision: string, reason?: string) =>
    apiRequest<DoctorKYCVerifyResponse>(`/user-admin/doctors/${doctorId}/verify-license`, {
      method: 'POST', body: JSON.stringify({ decision, reason: reason || null }),
    }),
  suspendAccount: (userId: string, reasonCode: string) =>
    apiRequest<AccountActionResponse>(`/user-admin/accounts/${userId}/suspend`, {
      method: 'POST', body: JSON.stringify({ reason_code: reasonCode }),
    }),
  reinstateAccount: (userId: string, reasonCode: string) =>
    apiRequest<AccountActionResponse>(`/user-admin/accounts/${userId}/reinstate`, {
      method: 'POST', body: JSON.stringify({ reason_code: reasonCode }),
    }),

  // Super Admin
  createAdminAccount: (data: Record<string, unknown>) =>
    apiRequest<AdminCreateResponse>('/super-admin/admins', {
      method: 'POST', body: JSON.stringify(data),
    }),
  revokeAdminAccount: (adminId: string) =>
    apiRequest<AdminRevokeResponse>(`/super-admin/admins/${adminId}`, { method: 'DELETE' }),
  getPlatformSettings: () =>
    apiRequest<PlatformSettingsResponse>('/super-admin/settings'),
  updatePlatformSettings: (data: Record<string, unknown>) =>
    apiRequest<PlatformSettingsUpdateResponse>('/super-admin/settings', {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  createComplianceOverride: (orderId: string, justification: string) =>
    apiRequest<ComplianceOverrideResponse>('/super-admin/compliance-overrides', {
      method: 'POST', body: JSON.stringify({ order_id: orderId, justification }),
    }),
  queryAuditLogs: (params?: Record<string, string | number>) =>
    apiRequest<AuditLogQueryResponse>(`/super-admin/audit-logs${qs(params)}`),
};
