import {
  AuthTokens, User,
  PrescriptionUploadResponse, PrescriptionStatusResponse, PrescriptionDetail,
  PrescriptionListResponse, FieldEditResponse,
  MedicineSearchResponse, MedicineDetail,
  CartCreateResponse, CartItemAddResponse, CartDetail, SavedAddress,
  OrderCreateResponse, OrderSummary, OrderDetail, OrderListResponse, OrderCancelResponse,
  VerificationQueueResponse, VerificationActionResponse,
  PaymentOrderCreateResponse, PaymentCaptureResponse,
  NotificationListResponse, NotificationItem, UnreadCountResponse,
  PartnerPharmacyListResponse, DisputeListResponse, OverdueVerificationResponse,
  DashboardSummary,
  DoctorKYCListResponse, DoctorKYCVerifyResponse, AccountActionResponse,
  AccountListResponse,
  AdminCreateResponse, AdminRevokeResponse, AdminListResponse,
  PlatformSettingsResponse, PlatformSettingsUpdateResponse,
  AuditLogQueryResponse, ComplianceOverrideResponse,
  ReportDetail, ReportListResponse,
  DocumentUploadResponse, DocumentItem, DocumentDownloadResponse,
  DocumentListResponse, DocumentStatusPoll, DocumentDeleteResponse,
  ConsentResponse, ChatSessionResponse, ChatMessageItem, ChatTurnResponse, ChatHistoryResponse,
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

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('ipmd_refresh_token');
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('ipmd_access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('ipmd_refresh_token', data.refresh_token);
    return data.access_token;
  } catch {
    return null;
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

  let res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });

  if (res.status === 401 && typeof window !== 'undefined') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { const e = await res.json(); detail = e.detail || detail; } catch {}
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('ipmd_access_token');
      localStorage.removeItem('ipmd_refresh_token');
      localStorage.removeItem('ipmd_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/patient/login' && window.location.pathname !== '/professional/login') {
        window.location.href = '/login';
      }
    }
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
  createDoctorPrescription: (data: { patient_id: string; medicines: { field_name: string; value: string }[]; report_id?: string; notes?: string }) =>
    apiRequest<{ prescription_id: string; document_id: string; status: string; message: string }>('/prescriptions/create', {
      method: 'POST', body: JSON.stringify(data),
    }),

  // Reports
  uploadReport: (file: File, reportType?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (reportType) fd.append('report_type', reportType);
    return apiRequest<{ report_id: string; document_id: string; status: string }>('/reports/upload', { method: 'POST', body: fd });
  },
  listReports: (params?: Record<string, string | number>) =>
    apiRequest<ReportListResponse>(`/reports${qs(params)}`),
  getReportDetail: (id: string) => apiRequest<ReportDetail>(`/reports/${id}`),
  grantReportAccess: (reportId: string, doctorId: string) =>
    apiRequest<{ message: string; grant_id: string }>('/reports/grant-access', {
      method: 'POST', body: JSON.stringify({ report_id: reportId, doctor_id: doctorId }),
    }),
  listReportDoctors: () =>
    apiRequest<{ user_id: string; full_name: string; email: string }[]>('/reports/doctors'),
  getReportGrantedDoctors: (reportId: string) =>
    apiRequest<{ grant_id: string; doctor_id: string; doctor_name: string; doctor_email: string; granted_at: string }[]>(`/reports/${reportId}/granted-doctors`),

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
  listDoctorAuditLogs: (params?: Record<string, string | number>) =>
    apiRequest<AuditLogQueryResponse>(`/verification/my-audit-log${qs(params)}`),

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
  updateCartItem: (cartId: string, itemId: string, quantity: number) =>
    apiRequest<{ message: string }>(`/cart/${cartId}/items/${itemId}`, {
      method: 'PATCH', body: JSON.stringify({ quantity }),
    }),
  removeCartItem: (cartId: string, itemId: string) =>
    apiRequest<{ message: string }>(`/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    }),

  // Addresses
  listAddresses: () =>
    apiRequest<SavedAddress[]>('/addresses'),
  createAddress: (data: { label?: string; line1: string; line2?: string; city: string; state: string; pincode: string; is_default?: boolean }) =>
    apiRequest<SavedAddress>('/addresses', {
      method: 'POST', body: JSON.stringify(data),
    }),

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
    apiRequest<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest<{ status: string; marked_read_count: number }>('/notifications/read-all', { method: 'POST' }),

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
  listAccounts: (params?: Record<string, string | number>) =>
    apiRequest<AccountListResponse>(`/user-admin/accounts${qs(params)}`),
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
  approveAccount: (userId: string, reasonCode: string) =>
    apiRequest<AccountActionResponse>(`/user-admin/accounts/${userId}/approve`, {
      method: 'POST', body: JSON.stringify({ reason_code: reasonCode }),
    }),

  // Super Admin
  listAdminAccounts: (params?: Record<string, string | number>) =>
    apiRequest<AdminListResponse>(`/super-admin/admins${qs(params)}`),
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

  // ── Pharmacy Staff ──────────────────────────────
  getPharmacyDashboard: () =>
    apiRequest<import('./types').PharmacyDashboard>('/pharmacy/dashboard'),
  getPharmacistDashboard: () =>
    apiRequest<any>('/pharmacy/pharmacist/dashboard'),
  listPharmacistPrescriptions: (params?: Record<string, string | number>) =>
    apiRequest<any>(`/pharmacy/pharmacist/prescriptions${qs(params)}`),
  reviewPharmacistPrescription: (prescriptionId: string, data: { action: 'approve' | 'reject'; notes?: string }) =>
    apiRequest<any>(`/pharmacy/pharmacist/prescriptions/${prescriptionId}/review`, { method: 'POST', body: JSON.stringify(data) }),
  listPharmacyMedicines: (params?: Record<string, string | number>) =>
    apiRequest<import('./types').PharmacyMedicineListResponse>(`/pharmacy/medicines${qs(params)}`),
  getPharmacyMedicine: (id: string) =>
    apiRequest<import('./types').PharmacyMedicine>(`/pharmacy/medicines/${id}`),
  createPharmacyMedicine: (data: { standard_identifier: string; name: string; generic_name?: string; schedule?: string; manufacturer?: string; dosage_form?: string; strength?: string; pack_size?: string; description?: string; side_effects?: string; contraindications?: string; storage_conditions?: string; drug_interactions?: string }) =>
    apiRequest<import('./types').PharmacyMedicine>('/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),
  updatePharmacyMedicine: (id: string, data: { name?: string; generic_name?: string; schedule?: string; manufacturer?: string; dosage_form?: string; strength?: string; pack_size?: string; description?: string; side_effects?: string; contraindications?: string; storage_conditions?: string; drug_interactions?: string }) =>
    apiRequest<import('./types').PharmacyMedicine>(`/pharmacy/medicines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePharmacyMedicine: (id: string) =>
    apiRequest<{ message: string }>(`/pharmacy/medicines/${id}`, { method: 'DELETE' }),
  listPharmacyInventory: (params?: Record<string, string | number>) =>
    apiRequest<import('./types').PharmacyStockListResponse>(`/pharmacy/inventory${qs(params)}`),
  getPharmacyStock: (id: string) =>
    apiRequest<import('./types').PharmacyStockItem>(`/pharmacy/inventory/${id}`),
  createPharmacyStock: (data: { medicine_id: string; batch_number?: string; expiry_date?: string; quantity: number; price: number }) =>
    apiRequest<import('./types').PharmacyStockItem>('/pharmacy/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updatePharmacyStock: (id: string, data: { batch_number?: string; expiry_date?: string; quantity?: number; price?: number }) =>
    apiRequest<import('./types').PharmacyStockItem>(`/pharmacy/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePharmacyStock: (id: string) =>
    apiRequest<{ message: string }>(`/pharmacy/inventory/${id}`, { method: 'DELETE' }),
  listPharmacyOrders: (params?: Record<string, string | number>) =>
    apiRequest<import('./types').PharmacyOrderListResponse>(`/pharmacy/orders${qs(params)}`),
  getPharmacyOrderDetail: (id: string) =>
    apiRequest<import('./types').PharmacyOrderDetail>(`/pharmacy/orders/${id}`),
  acceptPharmacyOrder: (id: string) =>
    apiRequest<{ order_id: string; status: string; message: string }>(`/pharmacy/orders/${id}/accept`, { method: 'POST', body: '{}' }),
  dispatchPharmacyOrder: (id: string) =>
    apiRequest<{ order_id: string; status: string; message: string }>(`/pharmacy/orders/${id}/dispatch`, { method: 'POST', body: '{}' }),
  collectPharmacyPayment: (id: string) =>
    apiRequest<{ order_id: string; payment_status: string; message: string }>(`/pharmacy/orders/${id}/collect-payment`, { method: 'POST', body: '{}' }),
  listPharmacyFulfillments: (params?: Record<string, string | number>) =>
    apiRequest<import('./types').PharmacyFulfillmentListResponse>(`/pharmacy/fulfillment${qs(params)}`),
  updatePharmacyFulfillment: (id: string, newStatus: string) =>
    apiRequest<import('./types').PharmacyFulfillmentItem>(`/pharmacy/fulfillment/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) }),

  // Documents (M12)
  uploadDocument: (file: File, docType: string = "documents") => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('doc_type', docType);
    return apiRequest<DocumentUploadResponse>('/documents/upload', { method: 'POST', body: fd });
  },
  listDocuments: (params?: Record<string, string | number>) =>
    apiRequest<DocumentListResponse>(`/documents${qs(params)}`),
  getDocument: (id: string) =>
    apiRequest<DocumentItem>(`/documents/${id}`),
  getDocumentStatus: (id: string) =>
    apiRequest<DocumentStatusPoll>(`/documents/${id}/status`),
  getDocumentDownloadUrl: (id: string) =>
    apiRequest<DocumentDownloadResponse>(`/documents/${id}/download`),
  deleteDocument: (id: string) =>
    apiRequest<DocumentDeleteResponse>(`/documents/${id}`, { method: 'DELETE' }),

  // AI & Health Chat (RAG - M9)
  recordAIConsent: (consentGiven: boolean = true, consentType: string = 'chat_logging') =>
    apiRequest<ConsentResponse>('/ai/consent', {
      method: 'POST',
      body: JSON.stringify({ consent_given: consentGiven, consent_type: consentType }),
    }),
  createChatSession: (
    consentGiven: boolean = true,
    documentType?: string,
    contextPrescriptionId?: string,
    contextDocumentId?: string,
    contextReportId?: string
  ) =>
    apiRequest<ChatSessionResponse>('/ai/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({
        consent_given: consentGiven,
        document_type: documentType || null,
        context_prescription_id: contextPrescriptionId || null,
        context_document_id: contextDocumentId || null,
        context_report_id: contextReportId || null,
      }),
    }),
  getPatientChatDocuments: () =>
    apiRequest<PatientChatDocumentsResponse>('/ai/documents'),
  sendChatMessage: (sessionId: string, text: string) =>
    apiRequest<ChatTurnResponse>(`/ai/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  getChatHistory: (sessionId: string) =>
    apiRequest<ChatHistoryResponse>(`/ai/chat/sessions/${sessionId}/messages`),

  // ─── Professional Onboarding ────────────────────────────────────────────

  getProfessionalStatus: () =>
    apiRequest<any>('/professional/status', { method: 'GET' }),

  listPendingVerifications: (params?: { request_type?: string; status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.request_type) query.set('request_type', params.request_type);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return apiRequest<any>(`/professional/verification/pending${qs ? '?' + qs : ''}`, { method: 'GET' });
  },

  reviewVerification: (requestId: string, decision: string, rejectionReason?: string) => {
    const query = new URLSearchParams({ decision });
    if (rejectionReason) query.set('rejection_reason', rejectionReason);
    return apiRequest<any>(`/professional/verification/${requestId}/review?${query.toString()}`, { method: 'POST' });
  },

  requestInformation: (requestId: string, reason: string, requestedFields?: string[], requestedDocuments?: string[]) =>
    apiRequest<any>(`/professional/verification/${requestId}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ reason, requested_fields: requestedFields, requested_documents: requestedDocuments }),
    }),

  resubmitApplication: (applicationData: Record<string, unknown>) =>
    apiRequest<any>('/professional/verification/resubmit', {
      method: 'POST',
      body: JSON.stringify({ application_data: applicationData }),
    }),

  addCredential: (data: { credential_type: string; credential_name?: string; issuing_authority?: string; registration_number?: string; state?: string; issue_date?: string; expiry_date?: string; document_id?: string }) =>
    apiRequest<any>('/professional/credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listCredentials: () =>
    apiRequest<any>('/professional/credentials', { method: 'GET' }),

  verifyCredential: (credentialId: string, status: string, notes?: string) =>
    apiRequest<any>(`/professional/credentials/${credentialId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    }),

  inviteStaff: (orgId: string, email: string, role: string = 'staff') =>
    apiRequest<any>(`/professional/organizations/${orgId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  acceptInvitation: (token: string) =>
    apiRequest<any>(`/professional/invitations/${token}/accept`, { method: 'POST' }),

  revokeMembership: (membershipId: string) =>
    apiRequest<any>(`/professional/memberships/${membershipId}/revoke`, { method: 'POST' }),

  listOrgMembers: (orgId: string) =>
    apiRequest<any>(`/professional/organizations/${orgId}/members`, { method: 'GET' }),
};

export const apiClient = ApiClient;

