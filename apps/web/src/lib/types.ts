export type UserRole =
  | 'patient'
  | 'doctor'
  | 'pharmacy_staff_owned'
  | 'partner_pharmacy'
  | 'admin'
  | 'user_admin'
  | 'super_admin';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  user_id: string;
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  status: UserStatus;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  is_new_user?: boolean;
}

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface ExtractedField {
  field_id: string;
  prescription_id: string;
  field_name: string;
  value: string;
  confidence_score: number;
  review_state: 'auto_accepted' | 'needs_review' | 'doctor_edited';
  edited_by?: string | null;
  edited_reason?: string | null;
}

export interface PrescriptionSummary {
  prescription_id: string;
  patient_id: string;
  doctor_id?: string | null;
  document_id: string;
  extraction_status: 'queued' | 'processing' | 'extracted' | 'needs_review' | 'failed';
  verification_status: 'pending_review' | 'doctor_verified' | 'rejected';
  created_at: string;
}

export interface PrescriptionDetail extends PrescriptionSummary {
  is_ai_generated: boolean;
  extracted_fields: ExtractedField[];
}

export interface PrescriptionUploadResponse {
  prescription_id: string;
  document_id: string;
  status: string;
}

export interface PrescriptionStatusResponse {
  status: string;
  progress_pct: number;
  is_ai_generated: boolean;
}

export interface PrescriptionListResponse extends PaginatedResponse<PrescriptionSummary> {}

export interface FieldEditResponse {
  field_id: string;
  value: string;
  review_state: string;
}

export interface Medicine {
  medicine_id: string;
  name: string;
  generic_name?: string | null;
  schedule: 'otc' | 'h' | 'h1' | 'x';
  price?: number | null;
  in_stock: boolean;
  total_stock: number;
}

export interface MedicineDetail extends Medicine {
  standard_identifier: string;
  total_quantity: number;
  stock_sources: StockSource[];
  generic_equivalents: GenericEquivalent[];
  created_at: string;
}

export interface StockSource {
  source_type: string;
  source_id: string;
  source_name?: string | null;
  quantity: number;
  price: number;
}

export interface GenericEquivalent {
  medicine_id: string;
  name: string;
  generic_name?: string | null;
  schedule: string;
}

export interface MedicineSearchResponse extends PaginatedResponse<Medicine> {}

export interface CartItemDetail {
  line_item_id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name?: string | null;
  schedule: string;
  quantity: number;
  unit_price: number;
  price: number;
  prescription_id?: string | null;
  checkout_blocked: boolean;
}

export interface CartDetail {
  cart_id: string;
  patient_id: string;
  status: string;
  items: CartItemDetail[];
  subtotal: number;
  has_blocked_items: boolean;
}

export interface SavedAddress {
  address_id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface CartCreateResponse {
  cart_id: string;
  patient_id: string;
  status: string;
  created_at: string;
}

export interface CartItemAddResponse {
  cart_id: string;
  line_item_id: string;
  checkout_blocked: boolean;
}

export interface OrderLineItem {
  line_item_id: string;
  medicine_id: string;
  medicine_name?: string | null;
  prescription_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  fulfillment_source?: string | null;
}

export interface FulfillmentRecord {
  fulfillment_record_id: string;
  line_item_id: string;
  source_type: string;
  source_id: string;
  status: string;
  dispatched_at?: string | null;
  delivered_at?: string | null;
}

export interface RoutingDecision {
  routing_decision_id: string;
  line_item_id: string;
  decision_basis: string;
  source_type: string;
  source_id: string;
  overridden_by?: string | null;
  reason?: string | null;
  created_at: string;
}

export interface OrderSummary {
  order_id: string;
  patient_id: string;
  status: 'placed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'captured' | 'refunded' | 'failed';
  total_amount: number;
  items_count: number;
  created_at: string;
}

export interface OrderDetail extends OrderSummary {
  cart_id: string;
  delivery_address_id: string;
  line_items: OrderLineItem[];
  fulfillment_records: FulfillmentRecord[];
  routing_decisions: RoutingDecision[];
}

export interface OrderCreateResponse {
  order_id: string;
  cart_id: string;
  patient_id: string;
  status: string;
  payment_status: string;
  fulfillment_records: FulfillmentRecord[];
  payment_required_amount: number;
  created_at: string;
}

export interface OrderListResponse extends PaginatedResponse<OrderSummary> {}

export interface OrderCancelResponse {
  order_id: string;
  status: string;
  refund_id?: string | null;
}

export interface Dispute {
  dispute_id: string;
  order_id: string;
  dispute_type: string;
  flagged_at: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
  resolution?: string | null;
}

export interface DisputeListResponse extends PaginatedResponse<Dispute> {}

export interface PaymentOrderCreateResponse {
  payment_intent_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
}

export interface PaymentCaptureResponse {
  payment_intent_id: string;
  status: string;
  order_id: string;
}

export interface PaymentDetail {
  payment_id: string;
  order_id: string;
  razorpay_order_id: string;
  amount: number;
  status: string;
  captured_at?: string | null;
  refunded_amount: number;
}

export interface NotificationItem {
  notification_id: string;
  user_id: string;
  type: string;
  message: string;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  read: boolean;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  unread_count: number;
  page: number;
  page_size: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface DashboardSummary {
  orders_today: number;
  fulfillment_sla_breach_count: number;
  doctor_verification_queue_depth: number;
  payment_success_rate_30d: number;
}

export interface PartnerPharmacyAdmin {
  partner_id: string;
  name: string;
  fulfillment_radius_km: number;
  status: 'pending_activation' | 'active' | 'suspended' | 'delisted';
}

export interface PartnerPharmacyListResponse extends PaginatedResponse<PartnerPharmacyAdmin> {}

export interface VerificationQueueItem {
  prescription_id: string;
  patient_ref: string;
  extraction_status: string;
  verification_status: string;
  queued_at: string;
  sla_breach: boolean;
}

export interface VerificationQueueResponse extends PaginatedResponse<VerificationQueueItem> {}

export interface VerificationActionResponse {
  prescription_id: string;
  verification_status: string;
  audit_log_id: string;
}

export interface VerificationAuditEntry {
  actor_id?: string | null;
  actor_role: string;
  action_type: string;
  timestamp: string;
  justification?: string | null;
}

export interface DoctorKYCItem {
  user_id: string;
  full_name: string;
  license_number: string;
  submitted_at: string;
}

export interface DoctorKYCListResponse {
  data: DoctorKYCItem[];
}

export interface DoctorKYCVerifyResponse {
  user_id: string;
  status: string;
  audit_log_id: string;
}

export interface AccountActionResponse {
  user_id: string;
  status?: string | null;
  updated_fields?: string[] | null;
  audit_log_id: string;
}

export interface AccountListItem {
  user_id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  created_at: string;
}

export interface AccountListResponse {
  data: AccountListItem[];
  total: number;
  next_cursor?: string | null;
}

export interface PlatformSettingsResponse {
  commission_rate_pct?: number;
  payment_gateway_credential_ref?: string;
  security_policies?: {
    mfa_required?: boolean;
    session_timeout_mins?: number;
    password_min_length?: number;
  };
}

export interface PlatformSettingsUpdateResponse {
  success: boolean;
  version: number;
}

export interface AdminAccount {
  user_id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
}

export interface AdminCreateResponse {
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
  permissions: string[];
}

export interface AdminRevokeResponse {
  success: boolean;
  message: string;
  admin_id: string;
}

export interface AdminListItem {
  user_id: string;
  full_name: string;
  email?: string;
  role: string;
  status: string;
}

export interface AdminListResponse extends PaginatedResponse<AdminListItem> {}

export interface AuditLogEntry {
  audit_log_id: string;
  actor_id?: string;
  actor_role: string;
  action_type: string;
  target_entity_type: string;
  target_entity_id: string;
  justification?: string;
  timestamp: string;
}

export interface AuditLogQueryResponse extends PaginatedResponse<AuditLogEntry> {}

export interface OverdueVerificationItem {
  prescription_id: string;
  patient_ref: string;
  queued_at: string;
  hours_overdue: number;
  assigned_doctor?: string | null;
}

export interface OverdueVerificationResponse {
  data: OverdueVerificationItem[];
}

export interface ComplianceOverrideResponse {
  override_id: string;
  order_id: string;
  audit_log_id: string;
}

export interface SavedAddress {
  address_id: string;
  user_id: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface ReportDetail {
  report_id: string;
  patient_id: string;
  document_id: string;
  report_type?: string | null;
  extraction_status: string;
  ai_explanation?: string | null;
  is_ai_generated: boolean;
  values: ReportValue[];
  created_at: string;
}

export interface ReportSummary {
  report_id: string;
  patient_id: string;
  document_id: string;
  report_type?: string | null;
  extraction_status: string;
  created_at: string;
}

export interface ReportListResponse {
  data: ReportSummary[];
  next_cursor?: string | null;
}

export interface ReportValue {
  value_id: string;
  test_name: string;
  value: string;
  unit?: string | null;
  reference_range?: string | null;
  flag: 'normal' | 'abnormal';
}

export interface NotificationPreference {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  updated_at: string;
}

export interface DeliveryLog {
  delivery_log_id: string;
  notification_id: string;
  channel: string;
  status: string;
  error_detail?: string | null;
  attempted_at: string;
}

// M12: Document Management Types

export type DocumentStatus =
  | 'upload_pending' | 'uploaded' | 'quarantined' | 'scanning'
  | 'clean' | 'processing' | 'ready'
  | 'upload_failed' | 'scan_failed' | 'infected' | 'processing_failed'
  | 'deleted';

export type ScanStatus = 'pending' | 'clean' | 'infected' | 'scan_failed';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DocumentItem {
  document_id: string;
  uploaded_by: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  checksum_sha256?: string | null;
  file_type: string;
  doc_status: DocumentStatus;
  scan_status: ScanStatus;
  processing_status: ProcessingStatus;
  storage_provider?: string | null;
  uploaded_at: string;
  updated_at?: string | null;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  doc_status: string;
  scan_status: string;
  checksum_sha256?: string | null;
  message: string;
}

export interface DocumentDownloadResponse {
  document_id: string;
  download_url: string;
  expires_in: number;
  filename: string;
}

export interface DocumentListResponse extends PaginatedResponse<DocumentItem> {}

export interface DocumentStatusPoll {
  document_id: string;
  doc_status: DocumentStatus;
  scan_status: ScanStatus;
  processing_status: ProcessingStatus;
}

export interface DocumentDeleteResponse {
  document_id: string;
  deleted: boolean;
  message: string;
}

// M9: AI & RAG Chat Assistant Types

export interface ConsentResponse {
  consent_id: string;
  user_id: string;
  consent_type: string;
  consent_given: boolean;
  timestamp: string;
}

export interface ChatSessionResponse {
  session_id: string;
  patient_id: string;
  context_prescription_id?: string | null;
  created_at: string;
}

export interface ChatMessageItem {
  message_id: string;
  session_id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  is_ai_generated: boolean;
  guardrail_triggered: boolean;
  created_at: string;
}

export interface ChatTurnResponse {
  user_message: ChatMessageItem;
  assistant_message: ChatMessageItem;
  rag_sources_used: number;
}

export interface ChatHistoryResponse {
  session_id: string;
  messages: ChatMessageItem[];
  total: number;
}

